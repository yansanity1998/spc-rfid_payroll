import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import supabase from '../../utils/supabase';
import Swal from 'sweetalert2';

interface ImportScheduleProps {
    selectedUserId: number | null;
    onClose: () => void;
    onImportSuccess: () => void;
}

interface ScheduleRow {
    user_id?: string;
    email?: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject?: string;
    room?: string;
    notes?: string;
    is_overtime?: string | boolean;
}

interface ParsedSchedule extends ScheduleRow {
    rowNumber: number;
    isValid: boolean;
    errors: string[];
    resolvedUserId?: number;
}

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ImportSchedule: React.FC<ImportScheduleProps> = ({ selectedUserId, onClose, onImportSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedSchedule[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importStats, setImportStats] = useState({
        total: 0,
        valid: 0,
        invalid: 0,
        imported: 0,
        failed: 0
    });

    // Helper function to format time in Philippine timezone with AM/PM
    const formatPhilippineTime = (timeString: string) => {
        if (!timeString) return "N/A";

        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);

            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        }

        return timeString;
    };

    // Convert 12-hour time to 24-hour format
    const convertTo24Hour = (time: string): string => {
        const trimmedTime = time.trim();

        // Check if already in 24-hour format
        const time24Regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (time24Regex.test(trimmedTime)) {
            const [hours, minutes] = trimmedTime.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }

        // Check for 12-hour format
        const time12Regex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM|am|pm)$/i;
        const match = trimmedTime.match(time12Regex);

        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2];
            const period = match[3].toUpperCase();

            if (period === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }

            return `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        return time;
    };

    // Validate time format (accepts both 12-hour and 24-hour)
    const validateTimeFormat = (time: string): boolean => {
        const trimmedTime = time.trim();
        const time24Regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const time12Regex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM|am|pm)$/i;
        return time24Regex.test(trimmedTime) || time12Regex.test(trimmedTime);
    };

    // Normalize column headers
    const normalizeHeaders = (data: any[]): ScheduleRow[] => {
        return data.map(row => {
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
                const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                normalizedRow[normalizedKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            });
            return normalizedRow as ScheduleRow;
        });
    };

    // Validate a single schedule row
    const validateScheduleRow = async (row: ScheduleRow, rowNumber: number): Promise<ParsedSchedule> => {
        const errors: string[] = [];
        let resolvedUserId: number | undefined;

        // Validate user identification
        if (selectedUserId) {
            resolvedUserId = selectedUserId;
        } else if (row.user_id) {
            const userId = parseInt(row.user_id);
            if (isNaN(userId)) {
                errors.push('Invalid user_id format');
            } else {
                resolvedUserId = userId;
            }
        } else if (row.email) {
            const { data: user, error } = await supabase
                .from('users')
                .select('id')
                .eq('email', row.email)
                .maybeSingle();

            if (error || !user) {
                errors.push(`User not found with email: ${row.email}`);
            } else {
                resolvedUserId = user.id;
            }
        } else {
            errors.push('Missing user_id or email');
        }

        // Validate day of week
        if (!row.day_of_week) {
            errors.push('Missing day_of_week');
        } else if (!VALID_DAYS.includes(row.day_of_week)) {
            errors.push(`Invalid day_of_week: ${row.day_of_week}. Must be one of: ${VALID_DAYS.join(', ')}`);
        }

        // Validate and convert start_time
        if (!row.start_time) {
            errors.push('Missing start_time');
        } else if (!validateTimeFormat(row.start_time)) {
            errors.push(`Invalid start_time format: ${row.start_time}. Expected HH:MM or h:MM AM/PM`);
        } else {
            row.start_time = convertTo24Hour(row.start_time);
        }

        // Validate and convert end_time
        if (!row.end_time) {
            errors.push('Missing end_time');
        } else if (!validateTimeFormat(row.end_time)) {
            errors.push(`Invalid end_time format: ${row.end_time}. Expected HH:MM or h:MM AM/PM`);
        } else {
            row.end_time = convertTo24Hour(row.end_time);
        }

        // Validate time order
        if (row.start_time && row.end_time && errors.length === 0) {
            if (row.start_time >= row.end_time) {
                errors.push('end_time must be after start_time');
            }
        }

        return {
            ...row,
            rowNumber,
            isValid: errors.length === 0,
            errors,
            resolvedUserId
        };
    };

    // Check for time overlaps
    const checkOverlaps = async (schedules: ParsedSchedule[]): Promise<ParsedSchedule[]> => {
        const validSchedules = schedules.filter(s => s.isValid && s.resolvedUserId);

        for (const schedule of validSchedules) {
            try {
                const { data: existingSchedules, error } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('user_id', schedule.resolvedUserId!)
                    .eq('day_of_week', schedule.day_of_week);

                if (error) {
                    console.error('Error checking overlaps:', error);
                    continue;
                }

                if (existingSchedules && existingSchedules.length > 0) {
                    const newStart = new Date(`2000-01-01 ${schedule.start_time}`);
                    const newEnd = new Date(`2000-01-01 ${schedule.end_time}`);

                    for (const existing of existingSchedules) {
                        const existingStart = new Date(`2000-01-01 ${existing.start_time}`);
                        const existingEnd = new Date(`2000-01-01 ${existing.end_time}`);

                        if (newStart < existingEnd && newEnd > existingStart) {
                            schedule.errors.push(
                                `Overlaps with existing schedule: ${existing.subject || 'Class'} (${formatPhilippineTime(existing.start_time)}-${formatPhilippineTime(existing.end_time)})`
                            );
                            schedule.isValid = false;
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking overlaps for row', schedule.rowNumber, error);
            }
        }

        return schedules;
    };

    // Parse CSV file
    const parseCSV = (file: File): Promise<ScheduleRow[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
                complete: (results) => {
                    console.log('📄 CSV parsed:', results.data);
                    resolve(results.data as ScheduleRow[]);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    };

    // Parse Excel file
    const parseExcel = (file: File): Promise<ScheduleRow[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    console.log('📊 Excel parsed:', jsonData);
                    const normalized = normalizeHeaders(jsonData);
                    resolve(normalized);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    };

    // Handle file selection
    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsProcessing(true);
        setParsedData([]);

        try {
            let rawData: ScheduleRow[];

            if (selectedFile.name.endsWith('.csv')) {
                rawData = await parseCSV(selectedFile);
            } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
                rawData = await parseExcel(selectedFile);
            } else {
                throw new Error('Unsupported file format. Please use .csv, .xlsx, or .xls files.');
            }

            console.log('📄 Total rows parsed:', rawData.length);
            console.log('📋 Sample row:', rawData[0]);

            if (!rawData || rawData.length === 0) {
                throw new Error('The file appears to be empty or has no valid data rows.');
            }

            const validatedData: ParsedSchedule[] = [];
            for (let i = 0; i < rawData.length; i++) {
                const validated = await validateScheduleRow(rawData[i], i + 2);
                validatedData.push(validated);
            }

            const dataWithOverlapCheck = await checkOverlaps(validatedData);

            setParsedData(dataWithOverlapCheck);

            const stats = {
                total: dataWithOverlapCheck.length,
                valid: dataWithOverlapCheck.filter(d => d.isValid).length,
                invalid: dataWithOverlapCheck.filter(d => !d.isValid).length,
                imported: 0,
                failed: 0
            };
            setImportStats(stats);

            console.log('✅ Import stats:', stats);

        } catch (error: any) {
            console.error('❌ Error parsing file:', error);
            await Swal.fire({
                title: 'Parse Error',
                html: `
          <div class="text-left">
            <p class="mb-2">${error.message || 'Failed to parse file.'}</p>
            <p class="text-sm text-gray-600 mt-3">Please ensure your file has the correct format:</p>
            <ul class="text-sm text-gray-600 list-disc ml-4 mt-2">
              <li>First row must contain column headers</li>
              <li>Required columns: <strong>day_of_week</strong>, <strong>start_time</strong>, <strong>end_time</strong></li>
              <li>Time format: <strong>HH:MM</strong> (24-hour) or <strong>h:MM AM/PM</strong> (12-hour)</li>
              <li>Optional columns: subject, room, notes, is_overtime</li>
              <li>${selectedUserId ? 'User is pre-selected (user_id/email not required)' : 'Required: user_id or email'}</li>
            </ul>
          </div>
        `,
                icon: 'error',
                confirmButtonColor: '#dc2626',
                width: '600px'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    const handleImport = async () => {
        const validSchedules = parsedData.filter(s => s.isValid && s.resolvedUserId);

        if (validSchedules.length === 0) {
            await Swal.fire({
                title: 'No Valid Data',
                text: 'There are no valid schedules to import. Please fix the errors and try again.',
                icon: 'warning',
                confirmButtonColor: '#dc2626'
            });
            return;
        }

        setIsProcessing(true);

        try {
            let imported = 0;
            let failed = 0;

            for (const schedule of validSchedules) {
                try {
                    const scheduleData = {
                        user_id: schedule.resolvedUserId!,
                        day_of_week: schedule.day_of_week,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        subject: schedule.subject || null,
                        room: schedule.room || null,
                        notes: schedule.notes || null,
                        is_overtime: schedule.is_overtime === true ||
                            schedule.is_overtime === 'true' ||
                            schedule.is_overtime === 'yes' ||
                            schedule.is_overtime === 'Yes' ||
                            false
                    };

                    const { error } = await supabase
                        .from('schedules')
                        .insert([scheduleData]);

                    if (error) {
                        console.error('Error inserting schedule:', error);
                        failed++;
                    } else {
                        imported++;
                    }
                } catch (error) {
                    console.error('Error processing schedule:', error);
                    failed++;
                }
            }

            setImportStats(prev => ({
                ...prev,
                imported,
                failed
            }));

            if (imported > 0) {
                await Swal.fire({
                    title: 'Import Successful!',
                    html: `
            <div class="text-left">
              <p class="mb-2"><strong>Successfully imported:</strong> ${imported} schedule${imported !== 1 ? 's' : ''}</p>
              ${failed > 0 ? `<p class="text-red-600"><strong>Failed:</strong> ${failed} schedule${failed !== 1 ? 's' : ''}</p>` : ''}
            </div>
          `,
                    icon: 'success',
                    confirmButtonColor: '#16a34a'
                });

                onImportSuccess();
                onClose();
            } else {
                await Swal.fire({
                    title: 'Import Failed',
                    text: 'No schedules were imported. Please check the errors and try again.',
                    icon: 'error',
                    confirmButtonColor: '#dc2626'
                });
            }

        } catch (error: any) {
            console.error('Import error:', error);
            await Swal.fire({
                title: 'Import Error',
                text: error.message || 'An error occurred during import.',
                icon: 'error',
                confirmButtonColor: '#dc2626'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadErrorReport = () => {
        const invalidSchedules = parsedData.filter(s => !s.isValid);

        const csvContent = [
            ['Row Number', 'Errors', 'Day', 'Start Time', 'End Time', 'Subject'].join(','),
            ...invalidSchedules.map(s =>
                [
                    s.rowNumber,
                    `"${s.errors.join('; ')}"`,
                    s.day_of_week || '',
                    s.start_time || '',
                    s.end_time || '',
                    s.subject || ''
                ].join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `import_errors_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Import Schedules</h3>
                            <p className="text-white/80 text-sm">Upload CSV or Excel file</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!file && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-900 mb-1">Drag and drop your file here</p>
                                    <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Choose File
                                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInputChange} className="hidden" />
                                    </label>
                                </div>
                                <div className="text-xs text-gray-500">Supported formats: CSV, XLSX, XLS (Max 5MB)</div>
                            </div>
                        </div>
                    )}

                    {file && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setParsedData([]);
                                    setImportStats({ total: 0, valid: 0, invalid: 0, imported: 0, failed: 0 });
                                }}
                                className="text-red-600 hover:text-red-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Processing file...</p>
                        </div>
                    )}

                    {parsedData.length > 0 && !isProcessing && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-blue-600 text-sm font-medium mb-1">Total Rows</p>
                                    <p className="text-2xl font-bold text-blue-900">{importStats.total}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-green-600 text-sm font-medium mb-1">Valid</p>
                                    <p className="text-2xl font-bold text-green-900">{importStats.valid}</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-600 text-sm font-medium mb-1">Invalid</p>
                                    <p className="text-2xl font-bold text-red-900">{importStats.invalid}</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <p className="text-purple-600 text-sm font-medium mb-1">Imported</p>
                                    <p className="text-2xl font-bold text-purple-900">{importStats.imported}</p>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-900">Data Preview</h4>
                                    {importStats.invalid > 0 && (
                                        <button onClick={downloadErrorReport} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download Error Report
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-x-auto max-h-96">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Row</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Day</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Time</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Subject</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Room</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 10).map((row, index) => (
                                                <tr key={index} className={`border-b border-gray-200 ${!row.isValid ? 'bg-red-50' : ''}`}>
                                                    <td className="px-4 py-2 text-gray-600">{row.rowNumber}</td>
                                                    <td className="px-4 py-2">
                                                        {row.isValid ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                Valid
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
                                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Invalid
                                                                </span>
                                                                <div className="text-xs text-red-600 mt-1">
                                                                    {row.errors.map((err, i) => (
                                                                        <div key={i}>• {err}</div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-900">{row.day_of_week || '-'}</td>
                                                    <td className="px-4 py-2 text-gray-900">
                                                        {row.start_time && row.end_time
                                                            ? `${formatPhilippineTime(row.start_time)} - ${formatPhilippineTime(row.end_time)}`
                                                            : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-900">{row.subject || '-'}</td>
                                                    <td className="px-4 py-2 text-gray-900">{row.room || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.length > 10 && (
                                        <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
                                            Showing 10 of {parsedData.length} rows
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                        Cancel
                    </button>
                    {parsedData.length > 0 && importStats.valid > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={isProcessing}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    Import {importStats.valid} Schedule{importStats.valid !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportSchedule;

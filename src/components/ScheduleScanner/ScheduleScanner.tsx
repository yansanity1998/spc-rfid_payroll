import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase';
import { Toaster } from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_picture?: string;
}

interface Schedule {
  id: number;
  user_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject?: string;
  room?: string;
  notes?: string;
}

const ScheduleScanner: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scannedCard, setScannedCard] = useState('');
  const [scannerLoading, setScannerLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success',
    title: '',
    message: '',
    userName: '',
    userRole: '',
    profilePicture: '',
    subject: '',
    room: '',
    status: '',
    time: '',
    action: ''
  });

  // Check if user has schedule exemption for current date/time
  const checkScheduleExemption = async (userId: number, currentTime: Date) => {
    try {
      const today = currentTime.toISOString().split('T')[0];
      const currentTimeStr = currentTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      const { data, error } = await supabase
        .from("schedule_exemptions")
        .select("*")
        .eq("user_id", userId)
        .eq("exemption_date", today);

      if (error) {
        console.error('[ScheduleScanner] Error checking exemptions:', error);
        return { isExempted: false, reason: null };
      }

      if (!data || data.length === 0) {
        return { isExempted: false, reason: null };
      }

      // Check for full day exemptions (leave requests)
      const fullDayExemption = data.find(exemption => 
        exemption.request_type === 'Leave' || 
        (!exemption.start_time && !exemption.end_time)
      );

      if (fullDayExemption) {
        return { 
          isExempted: true, 
          reason: fullDayExemption.reason,
          type: 'full_day'
        };
      }

      // Check for time-specific exemptions (gate pass requests)
      const timeExemption = data.find(exemption => {
        if (!exemption.start_time || !exemption.end_time) return false;
        
        const exemptionStart = exemption.start_time;
        const exemptionEnd = exemption.end_time;
        
        return currentTimeStr >= exemptionStart && currentTimeStr <= exemptionEnd;
      });

      if (timeExemption) {
        return { 
          isExempted: true, 
          reason: timeExemption.reason,
          type: 'time_specific',
          startTime: timeExemption.start_time,
          endTime: timeExemption.end_time
        };
      }

      return { isExempted: false, reason: null };
    } catch (error) {
      console.error('[ScheduleScanner] Error checking schedule exemption:', error);
      return { isExempted: false, reason: null };
    }
  };

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

  useEffect(() => {
    fetchUsers();
    fetchAllSchedules();
  }, []);

  // Keep scanner input focused for continuous scanning
  useEffect(() => {
    const focusInterval = setInterval(() => {
      const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
      if (hiddenInput && document.activeElement !== hiddenInput) {
        hiddenInput.focus();
      }
    }, 500);

    return () => clearInterval(focusInterval);
  }, []);

  // Real-time clock updater
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // Auto-close alert after 4 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Function to show modern alert
  const showModernAlert = (
    type: 'success' | 'error' | 'info', 
    title: string, 
    message: string, 
    userName: string = '', 
    userRole: string = '',
    profilePicture: string = '',
    subject: string = '', 
    room: string = '', 
    status: string = '', 
    action: string = ''
  ) => {
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    setAlertData({
      type,
      title,
      message,
      userName,
      userRole,
      profilePicture,
      subject,
      room,
      status,
      time: currentTime,
      action
    });
    setShowAlert(true);
  };

  // Real-time helper functions
  const getRealTimeWithSeconds = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getRealTimeFullDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fetch all schedules
  const fetchAllSchedules = async () => {
    try {
      console.log('Fetching all schedules for scanner...');
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all schedules:', error);
        return;
      }
      
      console.log('All schedules loaded:', data?.length || 0);
      setSchedules(data || []);
      
    } catch (error: any) {
      console.error('Error in fetchAllSchedules:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      const filteredUsers = allUsers?.filter(user => {
        if (!user.role) return false;
        const role = user.role.toString().trim().toLowerCase();
        return role === 'faculty' || role === 'staff';
      }).map(user => ({
        ...user,
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
      })) || [];

      filteredUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(filteredUsers);
      
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  // RFID Scanner Functions
  const getCurrentDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const getAttendanceStatus = (currentTime: string, startTime: string, endTime: string) => {
    const current = new Date(`2000-01-01 ${currentTime}`);
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const lateThreshold = new Date(start.getTime() + 15 * 60 * 1000);
    
    if (current < start) {
      return { status: 'Early', canTap: false };
    } else if (current >= start && current <= lateThreshold) {
      return { status: 'Present', canTap: true };
    } else if (current > lateThreshold && current <= end) {
      return { status: 'Late', canTap: true };
    } else {
      return { status: 'Absent', canTap: false };
    }
  };

  const findActiveSchedules = (userId: number) => {
    const currentDay = getCurrentDayOfWeek();
    const currentTime = getCurrentTime();
    
    const userSchedules = schedules.filter(s => 
      s.user_id === userId &&
      s.day_of_week === currentDay
    );
    
    if (userSchedules.length === 0) return [];
    
    return userSchedules.map(schedule => {
      const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
      return {
        ...schedule,
        attendanceStatus: attendanceStatus.status,
        canTap: attendanceStatus.canTap
      };
    });
  };

  // Function to create absent record
  const createAbsentRecord = async (user: any, schedule: any, date: string) => {
    try {
      const { error } = await supabase
        .from('class_attendance')
        .insert([
          {
            user_id: user.id,
            schedule_id: schedule.id,
            att_date: date,
            time_in: null,
            time_out: null,
            attendance: 'Absent',
            status: false,
            notes: 'Automatically marked absent - no tap after class ended'
          }
        ]);
      
      if (error) {
        console.error('Error creating absent record:', error);
      }
    } catch (error) {
      console.error('Error in createAbsentRecord:', error);
    }
  };

  const handleRFIDScan = async (cardId: string) => {
    setScannerLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 Starting RFID scan for card:', cardId, 'Date:', today);
      
      // Find user with this cardId
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, role, profile_picture')
        .eq('id', cardId)
        .maybeSingle();
        
      if (userError) {
        console.error('❌ User lookup error:', userError);
        throw userError;
      }
      if (!user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', '', '', '', 'error');
        return;
      }
      
      console.log('✅ User found:', user);
      
      // Check if today is a holiday (active holidays only) - HIGHEST PRIORITY
      const { data: holidayCheck, error: holidayError } = await supabase
        .from("holidays")
        .select("id, title, is_active")
        .eq("date", today)
        .eq("is_active", true)
        .maybeSingle();

      if (holidayError) {
        console.error("[ScheduleScanner] Error checking holiday:", holidayError);
      }

      if (holidayCheck) {
        console.log(`[ScheduleScanner] Today (${today}) is a holiday: "${holidayCheck.title}". Exempting class attendance.`);
        showModernAlert(
          'info', 
          'Holiday - Classes Exempted', 
          `Today is ${holidayCheck.title}. All class schedules are exempted. No attendance will be recorded.`, 
          user.name, 
          user.role || '', 
          user.profile_picture || '', 
          'All Classes', 
          'Holiday', 
          `Current time: ${formatPhilippineTime(getCurrentTime())}`, 
          'exempted'
        );
        return; // Exit early - no attendance recording on holidays
      }
      
      // Check for schedule exemptions (leave/gate pass)
      const exemptionCheck = await checkScheduleExemption(user.id, new Date());
      console.log(`[ScheduleScanner] Exemption check for user ${user.id}:`, exemptionCheck);
      
      if (exemptionCheck.isExempted) {
        let exemptionMessage = '';
        let exemptionTitle = 'Class Schedule Exempted';
        
        if (exemptionCheck.type === 'full_day') {
          exemptionMessage = `Your class schedule is exempted for the entire day due to approved ${exemptionCheck.reason}. No class attendance will be recorded today.`;
        } else {
          exemptionMessage = `Your class schedule is exempted from ${exemptionCheck.startTime} to ${exemptionCheck.endTime} due to approved ${exemptionCheck.reason}. Class attendance during this period will not be recorded.`;
        }
        
        showModernAlert(
          'info', 
          exemptionTitle, 
          exemptionMessage, 
          user.name, 
          user.role || '', 
          user.profile_picture || '', 
          'All Classes', 
          'Exempted', 
          `Current time: ${formatPhilippineTime(getCurrentTime())}`, 
          'exempted'
        );
        return;
      }
      
      // Check if user has schedules today
      const userSchedules = findActiveSchedules(user.id);
      
      if (userSchedules.length === 0) {
        const currentDay = getCurrentDayOfWeek();
        const currentTime = getCurrentTime();
        showModernAlert('error', 'No Schedule Found', `No class schedule for ${currentDay}`, user.name, user.role || '', user.profile_picture || '', '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        return;
      }
      
      // Find all schedules that can be tapped for
      const activeSchedules = userSchedules.filter(s => s.canTap);
      
      if (activeSchedules.length === 0) {
        const earlySchedules = userSchedules.filter(s => s.attendanceStatus === 'Early');
        const lateSchedules = userSchedules.filter(s => s.attendanceStatus === 'Absent');
        
        const currentTime = getCurrentTime();
        
        if (earlySchedules.length > 0) {
          const nextSchedule = earlySchedules[0];
          showModernAlert('error', 'Too Early!', `Class starts at ${formatPhilippineTime(nextSchedule.start_time)}`, user.name, user.role || '', user.profile_picture || '', nextSchedule.subject || 'N/A', nextSchedule.room || 'N/A', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        } else if (lateSchedules.length > 0) {
          for (const schedule of lateSchedules) {
            const { data: existingRecord } = await supabase
              .from('class_attendance')
              .select('*')
              .eq('user_id', user.id)
              .eq('schedule_id', schedule.id)
              .eq('att_date', today)
              .maybeSingle();
              
            if (!existingRecord) {
              await createAbsentRecord(user, schedule, today);
            }
          }
          showModernAlert('error', 'Classes Ended!', 'Marked as ABSENT for missed classes', user.name, user.role || '', user.profile_picture || '', '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        }
        return;
      }
      
      console.log('✅ Active schedules found:', activeSchedules.length);
      
      // Process each active schedule
      let recordedCount = 0;
      
      for (const scheduleInfo of activeSchedules) {
        const { data: existingAttendance, error: fetchError } = await supabase
          .from('class_attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('schedule_id', scheduleInfo.id)
          .eq('att_date', today)
          .maybeSingle();
          
        if (fetchError) {
          console.error('❌ Class attendance fetch error:', fetchError);
          continue;
        }
        
        const currentDateTime = new Date().toISOString();
        
        if (!existingAttendance) {
          // First tap - Create new attendance record (Time In)
          const attendanceData = {
            user_id: user.id,
            schedule_id: scheduleInfo.id,
            att_date: today,
            time_in: currentDateTime,
            time_out: null,
            attendance: scheduleInfo.attendanceStatus,
            status: true,
            notes: `Time In via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
          };
          
          const { error: insertError } = await supabase
            .from('class_attendance')
            .insert([attendanceData])
            .select();
            
          if (insertError) {
            console.error('❌ Insert error for schedule:', scheduleInfo.id, insertError);
            continue;
          }
          
          recordedCount++;
          
        } else if (!existingAttendance.time_out) {
          // Second tap - Record Time Out
          const { error: updateError } = await supabase
            .from('class_attendance')
            .update({
              time_out: currentDateTime,
              status: false,
              notes: `${existingAttendance.notes || ''} | Time Out via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
            })
            .eq('id', existingAttendance.id);
            
          if (updateError) {
            console.error('❌ Update error for time out:', scheduleInfo.id, updateError);
            continue;
          }
          
          recordedCount++;
          
        } else {
          // Third tap - Time In again
          const { error: updateError } = await supabase
            .from('class_attendance')
            .update({
              time_in: currentDateTime,
              time_out: null,
              status: true,
              notes: `${existingAttendance.notes || ''} | Time In again via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
            })
            .eq('id', existingAttendance.id);
            
          if (updateError) {
            console.error('❌ Update error for time in again:', scheduleInfo.id, updateError);
            continue;
          }
          
          recordedCount++;
        }
      }
      
      // Show appropriate success message
      if (recordedCount > 0) {
        if (recordedCount === 1) {
          const schedule = activeSchedules[0];
          
          const { data: currentRecord } = await supabase
            .from('class_attendance')
            .select('time_out, status, attendance')
            .eq('user_id', user.id)
            .eq('schedule_id', schedule.id)
            .eq('att_date', today)
            .single();
            
          
          if (currentRecord?.time_out && !currentRecord?.status) {
            showModernAlert('error', 'Time Out Successful', 'Your departure has been recorded.', user.name, user.role || '', user.profile_picture || '', schedule.subject || 'N/A', schedule.room || 'N/A', 'Checked Out', 'time_out');
          } else if (currentRecord?.status) {
            const action = currentRecord?.time_out ? 'Time In Again' : 'Time In';
            const statusText = currentRecord?.attendance === 'Late' ? 'Late' : currentRecord?.attendance === 'Present' ? 'Present' : 'Checked In';
            showModernAlert('success', `${action} Successful`, 'Your attendance has been recorded.', user.name, user.role || '', user.profile_picture || '', schedule.subject || 'N/A', schedule.room || 'N/A', statusText, 'time_in');
          }
        } else {
          showModernAlert('success', 'Multiple Classes Updated', `${recordedCount} attendance actions recorded successfully!`, user.name, user.role || '', user.profile_picture || '', 'Multiple Subjects', '', 'Updated', 'time_in');
        }
      }
      
    } catch (error: any) {
      console.error('❌ RFID Scan Error:', error);
      
      let errorMessage = 'Error recording class attendance';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      showModernAlert('error', 'System Error', errorMessage, '', '', '', '', '', '', 'error');
    } finally {
      setScannerLoading(false);
      setScannedCard('');
      
      setTimeout(() => {
        const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
        if (hiddenInput) {
          hiddenInput.focus();
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Class Attendance System</h1>
                <p className="text-sm text-gray-500">RFID Scanner Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{getRealTimeFullDate()}</p>
                <p className="text-xs text-gray-500 font-mono">{getRealTimeWithSeconds()}</p>
              </div>
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Side - Scanner Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full">
              
              {/* Scanner Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">RFID Scanner</h2>
                    <p className="text-white/80">Tap your card to record attendance</p>
                  </div>
                </div>
              </div>

              {/* Scanner Status */}
              <div className="p-8">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border-2 border-dashed border-gray-300">
                  {scannerLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                      <p className="text-gray-900 font-semibold text-lg">Processing...</p>
                      <p className="text-gray-500 text-sm">Please wait</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
                          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-900 font-bold text-xl mb-1">Ready to Scan</p>
                        <p className="text-gray-500">Place your RFID card near the scanner</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden Input for RFID Scanner */}
              <input
                autoFocus
                type="text"
                value={scannedCard}
                onChange={(e) => setScannedCard(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scannedCard.trim() !== '') {
                    const cardId = scannedCard.trim();
                    setScannedCard('');
                    handleRFIDScan(cardId);
                  }
                }}
                className="opacity-0 absolute -left-96 pointer-events-none"
                placeholder="RFID will be scanned here"
              />

              {/* Manual Input Option */}
              <div className="px-8 pb-8">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Manual Entry (Optional)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={scannedCard}
                      onChange={(e) => setScannedCard(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && scannedCard.trim() !== '') {
                          const cardId = scannedCard.trim();
                          setScannedCard('');
                          handleRFIDScan(cardId);
                        }
                      }}
                      className="flex-1 h-12 px-4 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      placeholder="Enter card ID"
                      disabled={scannerLoading}
                    />
                    <button
                      onClick={() => {
                        if (scannedCard.trim() !== '') {
                          const cardId = scannedCard.trim();
                          setScannedCard('');
                          handleRFIDScan(cardId);
                        }
                      }}
                      disabled={scannerLoading || !scannedCard.trim()}
                      className="px-6 h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {scannerLoading ? 'Processing...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Active Schedules */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">Today's Schedule</h3>
                    <p className="text-gray-300 text-sm">{getCurrentDayOfWeek()}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                  </div>
                </div>
              </div>

              {schedules.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {schedules
                    .filter(schedule => schedule.day_of_week === getCurrentDayOfWeek())
                    .sort((a, b) => {
                      // Sort by start_time
                      const timeA = a.start_time.split(':').map(Number);
                      const timeB = b.start_time.split(':').map(Number);
                      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                    })
                    .map(schedule => {
                      const user = users.find(u => u.id === schedule.user_id);
                      const currentTime = getCurrentTime();
                      const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
                      
                      let bgColor = 'bg-white/5';
                      let borderColor = 'border-white/10';
                      
                      if (attendanceStatus.status === 'Present' && attendanceStatus.canTap) {
                        bgColor = 'bg-green-500/20';
                        borderColor = 'border-green-400/40';
                      } else if (attendanceStatus.status === 'Late' && attendanceStatus.canTap) {
                        bgColor = 'bg-yellow-500/20';
                        borderColor = 'border-yellow-400/40';
                      } else if (attendanceStatus.status === 'Absent') {
                        bgColor = 'bg-red-500/20';
                        borderColor = 'border-red-400/40';
                      }
                      
                      return (
                        <div key={schedule.id} className={`${bgColor} border ${borderColor} rounded-xl p-4 transition-all duration-300 hover:shadow-md`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-lg">{formatPhilippineTime(schedule.start_time).split(':')[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-900 font-bold text-sm truncate">{user?.name || 'Unknown'}</p>
                                {schedule.subject && (
                                  <p className="text-gray-600 text-sm truncate">{schedule.subject}</p>
                                )}
                              </div>
                            </div>
                            {attendanceStatus.canTap ? (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 ${
                                attendanceStatus.status === 'Present' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-yellow-500 text-white'
                              }`}>
                                {attendanceStatus.status === 'Present' ? '✓ Active' : '⚠ Late'}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 ${
                                attendanceStatus.status === 'Early' 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {attendanceStatus.status === 'Early' ? 'Upcoming' : '✕ Ended'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">
                                {formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}
                              </span>
                            </div>
                            {schedule.room && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span>{schedule.room}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                    <p className="text-gray-500 text-xs">No schedules for today</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Modern Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAlert(false)}
          />
          
          <div className={`relative transform transition-all duration-700 ease-out ${
            showAlert ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
          }`}>
            
            <div className={`relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden max-w-lg w-full mx-4 ${
              alertData.type === 'success' 
                ? 'ring-4 ring-green-400/30' 
                : (alertData.type === 'error' && alertData.action === 'time_out')
                  ? 'ring-4 ring-orange-400/30'
                  : alertData.type === 'error' 
                    ? 'ring-4 ring-red-400/30'
                    : 'ring-4 ring-blue-400/30'
            }`}>
              
              {/* Status Bar */}
              <div className={`h-2 w-full ${
                alertData.type === 'success' 
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                  : (alertData.type === 'error' && alertData.action === 'time_out')
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                    : alertData.type === 'error' 
                      ? 'bg-gradient-to-r from-red-400 to-rose-500'
                      : 'bg-gradient-to-r from-blue-400 to-cyan-500'
              }`}>
                <div className="h-full bg-white/30 animate-pulse"></div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    alertData.type === 'success' 
                      ? 'bg-green-500/20 ring-4 ring-green-400/30' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'bg-orange-500/20 ring-4 ring-orange-400/30'
                        : alertData.type === 'error' 
                          ? 'bg-red-500/20 ring-4 ring-red-400/30'
                          : 'bg-blue-500/20 ring-4 ring-blue-400/30'
                  }`}>
                    {alertData.type === 'success' ? (
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : alertData.action === 'time_out' ? (
                      <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    ) : alertData.type === 'error' ? (
                      <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  {alertData.title}
                </h2>

                {/* Message */}
                <p className="text-white/70 text-center mb-6 text-lg">
                  {alertData.message}
                </p>

                {/* User Info */}
                {alertData.userName && (
                  <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                      {alertData.profilePicture ? (
                        <img 
                          src={alertData.profilePicture} 
                          alt={alertData.userName}
                          className="w-16 h-16 rounded-full object-cover ring-4 ring-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-white/20">
                          {alertData.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{alertData.userName}</h3>
                        {alertData.userRole && (
                          <p className="text-white/60 text-sm">{alertData.userRole}</p>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {alertData.subject && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Subject</p>
                          <p className="text-white font-medium">{alertData.subject}</p>
                        </div>
                      )}
                      {alertData.room && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Room</p>
                          <p className="text-white font-medium">{alertData.room}</p>
                        </div>
                      )}
                      {alertData.status && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Status</p>
                          <p className={`font-bold ${
                            alertData.status.includes('Late') ? 'text-yellow-400' :
                            alertData.status.includes('Present') ? 'text-green-400' :
                            alertData.status.includes('Out') ? 'text-orange-400' :
                            'text-white'
                          }`}>{alertData.status}</p>
                        </div>
                      )}
                      {alertData.time && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Time</p>
                          <p className="text-white font-medium">{alertData.time}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowAlert(false)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleScanner;

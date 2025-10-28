import { useState, useEffect } from "react";
import supabase from "../../../utils/supabase";
import { toast } from 'react-hot-toast';

interface GatePassReportData {
  id: number;
  name: string;
  role: string;
  type: string;
  purpose: string;
  destination: string;
  time_out: string;
  time_in: string;
  status: string;
  approved_by?: number;
  approved_by_name: string;
  guard_approved?: boolean;
  guard_approved_by?: number;
  guard_approved_by_name: string;
  approved_date: string;
  guard_approved_date: string;
  requester_position: string;
  profile_picture?: string;
  created_at: string;
}

interface GatePassReportProps {
  onBack: () => void;
}

export const GatePassReport = ({ onBack }: GatePassReportProps) => {
  const [gatePassData, setGatePassData] = useState<GatePassReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '2020-01-01', // Show all records from 2020 onwards
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] // Next year
  });
  const [statusFilter, setStatusFilter] = useState("All");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [selectedGatePass, setSelectedGatePass] = useState<GatePassReportData | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchGatePassData();
  }, [dateRange, statusFilter, destinationFilter]);

  const fetchGatePassData = async () => {
    setLoading(true);
    try {
      console.log('[GatePassReport] Fetching gate pass requests...');
      console.log('[GatePassReport] Date range:', dateRange);

      let query = supabase
        .from('requests')
        .select('*')
        .eq('request_type', 'Gate Pass')
        .gte('created_at', `${dateRange.startDate}T00:00:00`)
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      const { data: requests, error: requestError } = await query;

      console.log('[GatePassReport] Query result:', { requests, error: requestError });

      if (requestError) {
        console.error('[GatePassReport] Error fetching requests:', requestError);
        toast.error('Failed to fetch gate pass requests: ' + requestError.message);
        setGatePassData([]);
        setLoading(false);
        return;
      }

      if (!requests || requests.length === 0) {
        console.log('[GatePassReport] No gate pass requests found for date range');
        setGatePassData([]);
        setLoading(false);
        return;
      }

      console.log('[GatePassReport] Found', requests.length, 'gate pass requests');

      const requestsWithDetails = [];
      for (const request of requests) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
          .eq('id', request.user_id)
          .single();

        if (!userError && userData) {
          let deanApproverName = 'Pending';
          if (request.approved_by) {
            const { data: deanData } = await supabase
              .from('users')
              .select('name')
              .eq('id', request.approved_by)
              .single();
            
            if (deanData) {
              deanApproverName = deanData.name;
            }
          }

          let guardApproverName = 'Pending';
          if (request.guard_approved_by) {
            const { data: guardData } = await supabase
              .from('users')
              .select('name')
              .eq('id', request.guard_approved_by)
              .single();
            
            if (guardData) {
              guardApproverName = guardData.name;
            }
          }

          const gatePassRecord = {
            id: request.id,
            name: userData.name,
            role: userData.role || 'N/A',
            type: request.request_type,
            purpose: request.purpose || request.reason || 'Not specified',
            destination: request.destination || 'Not specified',
            time_out: request.time_out || '',
            time_in: request.time_in || '',
            status: request.status,
            approved_by: request.approved_by,
            approved_by_name: deanApproverName,
            guard_approved: request.guard_approved || false,
            guard_approved_by: request.guard_approved_by,
            guard_approved_by_name: guardApproverName,
            approved_date: request.approved_date || '',
            guard_approved_date: request.guard_approved_date || '',
            requester_position: userData.positions || '',
            profile_picture: userData.profile_picture,
            created_at: request.created_at
          };

          // Apply filters
          if (statusFilter !== "All" && request.status !== statusFilter) {
            continue;
          }

          if (destinationFilter && !request.destination?.toLowerCase().includes(destinationFilter.toLowerCase())) {
            continue;
          }

          requestsWithDetails.push(gatePassRecord);
        }
      }

      console.log('[GatePassReport] Processed gate pass data:', requestsWithDetails);
      console.log('[GatePassReport] Total records after filtering:', requestsWithDetails.length);
      setGatePassData(requestsWithDetails);

    } catch (error) {
      console.error('[GatePassReport] Error fetching gate pass data:', error);
      toast.error('Failed to fetch gate pass data');
      setGatePassData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (timeOut: string, timeIn: string) => {
    if (!timeOut || !timeIn) return 'N/A';
    
    const outDate = new Date(timeOut);
    const inDate = new Date(timeIn);
    
    const diffMs = inDate.getTime() - outDate.getTime();
    
    if (diffMs < 0) return 'Invalid';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
  };

  // Function to determine the actual status based on approval states
  const getActualStatus = (record: GatePassReportData) => {
    // Check if rejected
    if (record.status === 'Rejected') {
      return 'Rejected';
    }
    
    // Check if both dean and guard have approved
    if (record.approved_by && record.guard_approved && record.guard_approved_by) {
      return 'Fully Approved';
    }
    
    // Check if only dean has approved
    if (record.approved_by && (!record.guard_approved || !record.guard_approved_by) && record.status !== 'Rejected') {
      return 'Dean Approved';
    }
    
    // Default to pending dean approval
    return 'Pending Dean Approval';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Fully Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending Dean Approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Dean Approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatistics = () => {
    const total = gatePassData.length;
    const pending = gatePassData.filter(record => getActualStatus(record) === 'Pending Dean Approval').length;
    const deanApproved = gatePassData.filter(record => getActualStatus(record) === 'Dean Approved').length;
    const fullyApproved = gatePassData.filter(record => getActualStatus(record) === 'Fully Approved').length;
    const rejected = gatePassData.filter(record => getActualStatus(record) === 'Rejected').length;

    return { total, pending, deanApproved, fullyApproved, rejected };
  };

  const stats = getStatistics();

  const exportToCSV = () => {
    if (gatePassData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = gatePassData.map(record => ({
      'Request ID': record.id,
      'Employee Name': record.name,
      'Role': record.role,
      'Position': record.requester_position,
      'Purpose': record.purpose,
      'Destination': record.destination,
      'Time Out': formatDateTime(record.time_out),
      'Expected Time In': formatDateTime(record.time_in),
      'Duration': calculateDuration(record.time_out, record.time_in),
      'Status': getActualStatus(record),
      'Dean Approver': record.approved_by_name,
      'Guard Approver': record.guard_approved_by_name,
      'Dean Approval Date': record.approved_date ? formatDateTime(record.approved_date) : 'Pending',
      'Guard Approval Date': record.guard_approved_date ? formatDateTime(record.guard_approved_date) : 'Pending',
      'Submitted Date': formatDateTime(record.created_at)
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return `"${value || ''}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `gate_pass_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Gate pass report exported successfully!');
  };

  const handleViewGatePass = (record: GatePassReportData) => {
    setSelectedGatePass(record);
    setShowModal(true);
  };

  const printIndividualGatePass = (record: GatePassReportData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print gate pass');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate Pass - ${record.name}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Arial', sans-serif; 
              color: #000;
              line-height: 1.4;
              max-width: 210mm;
              margin: 0 auto;
            }
            .gate-pass-container {
              border: 3px double #000;
              padding: 15px;
              height: 100%;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px;
              margin-bottom: 15px;
              position: relative;
            }
            .school-logo {
              position: absolute;
              top: 0;
              left: 0;
              width: 100px;
              height: auto;
              object-fit: contain;
            }
            .school-name { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 3px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .school-address { 
              font-size: 11px; 
              margin-bottom: 8px;
            }
            .gate-pass-title { 
              font-size: 24px; 
              font-weight: bold; 
              margin-top: 8px;
              text-decoration: underline;
              letter-spacing: 2px;
            }
            .pass-number {
              font-size: 10px;
              margin-top: 5px;
              font-weight: normal;
            }
            .content-section {
              margin: 15px 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
              font-size: 12px;
            }
            .info-label {
              font-weight: bold;
              min-width: 120px;
              text-transform: uppercase;
            }
            .info-value {
              flex: 1;
              border-bottom: 1px solid #000;
              padding-left: 5px;
            }
            .purpose-box {
              margin: 12px 0;
              padding: 8px;
              border: 1px solid #000;
              min-height: 50px;
              font-size: 12px;
            }
            .purpose-label {
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 5px;
              font-size: 11px;
            }
            .time-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 15px 0;
              padding: 10px;
              border: 1px solid #000;
              background: #f9f9f9;
            }
            .time-box {
              text-align: center;
            }
            .time-label {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .time-value {
              font-size: 13px;
              font-weight: bold;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #000;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin: 30px 10px 5px 10px;
              padding-top: 5px;
            }
            .signature-label {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .signature-name {
              font-size: 11px;
              margin-top: 2px;
            }
            .signature-date {
              font-size: 9px;
              color: #666;
              margin-top: 2px;
            }
            .footer-note {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              text-align: center;
              font-size: 9px;
              font-style: italic;
            }
            .status-stamp {
              position: absolute;
              top: 80px;
              right: 30px;
              padding: 8px 15px;
              border: 2px solid ${getActualStatus(record).toLowerCase().includes('approved') ? '#166534' : 
                                    getActualStatus(record).toLowerCase().includes('rejected') ? '#991b1b' : '#92400e'};
              color: ${getActualStatus(record).toLowerCase().includes('approved') ? '#166534' : 
                                    getActualStatus(record).toLowerCase().includes('rejected') ? '#991b1b' : '#92400e'};
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              transform: rotate(-15deg);
              border-radius: 5px;
            }
            @media print {
              body { margin: 0; }
              .gate-pass-container { border: 3px double #000; }
            }
          </style>
        </head>
        <body>
          <div class="gate-pass-container">
            <div class="header">
              <img src="/assets/images/spctitle.png" alt="SPC Logo" class="school-logo" />
              <div class="school-name">St. Peter's College</div>
              <div class="school-address">RFID Payroll System</div>
              <div class="gate-pass-title">GATE PASS</div>
              <div class="pass-number">No. ${record.id.toString().padStart(6, '0')}</div>
            </div>

            <div class="status-stamp">${getActualStatus(record)}</div>

            <div class="content-section">
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">${record.name}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Role/Position:</div>
                <div class="info-value">${record.role}${record.requester_position ? ' - ' + record.requester_position : ''}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Destination:</div>
                <div class="info-value">${record.destination}</div>
              </div>

              <div class="info-row">
                <div class="info-label">Date Issued:</div>
                <div class="info-value">${currentDate}</div>
              </div>
            </div>

            <div class="purpose-box">
              <div class="purpose-label">Purpose of Visit:</div>
              <div>${record.purpose}</div>
            </div>

            <div class="time-section">
              <div class="time-box">
                <div class="time-label">Time Out</div>
                <div class="time-value">${new Date(record.time_out).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
              <div class="time-box">
                <div class="time-label">Expected Time In</div>
                <div class="time-value">${new Date(record.time_in).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">
                  <div class="signature-label">Approved By (Dean)</div>
                  <div class="signature-name">${record.approved_by_name}</div>
                  ${record.approved_date ? `<div class="signature-date">${new Date(record.approved_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</div>` : '<div class="signature-date">Pending</div>'}
                </div>
              </div>

              <div class="signature-box">
                <div class="signature-line">
                  <div class="signature-label">Verified By (Security)</div>
                  <div class="signature-name">${record.guard_approved_by_name}</div>
                  ${record.guard_approved_date ? `<div class="signature-date">${new Date(record.guard_approved_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</div>` : '<div class="signature-date">Pending</div>'}
                </div>
              </div>
            </div>

            <div class="footer-note">
              This gate pass is valid only for the date and time specified above. Present this to the security guard upon entry and exit.
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        toast.success('Gate pass printed successfully!');
      };
    };
  };

  const exportToPDF = () => {
    if (gatePassData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to export PDF');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate Pass Report - ${currentDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563EB; padding-bottom: 20px; }
            .header h1 { color: #2563EB; margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #2563EB; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #2563EB; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-approved { background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-weight: 600; }
            .status-pending { background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 6px; font-weight: 600; }
            .status-rejected { background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 6px; font-weight: 600; }
            .destination { font-weight: bold; color: #2563EB; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gate Pass Report</h1>
            <p>SPC RFID Payroll System</p>
            <p>Generated on: ${currentDate}</p>
            <p>Report Period: ${formatDateTime(dateRange.startDate + 'T00:00:00')} to ${formatDateTime(dateRange.endDate + 'T23:59:59')}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${stats.total}</div>
              <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.pending}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.deanApproved}</div>
              <div class="stat-label">Dean Approved</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.fullyApproved}</div>
              <div class="stat-label">Fully Approved</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.rejected}</div>
              <div class="stat-label">Rejected</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Position</th>
                <th>Destination</th>
                <th>Time Out</th>
                <th>Expected Time In</th>
                <th>Duration</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Dean Approver</th>
                <th>Guard Approver</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${gatePassData.map(record => `
                <tr>
                  <td>${record.id}</td>
                  <td>${record.name}</td>
                  <td>${record.role}</td>
                  <td>${record.requester_position}</td>
                  <td class="destination">${record.destination}</td>
                  <td>${formatDateTime(record.time_out)}</td>
                  <td>${formatDateTime(record.time_in)}</td>
                  <td><strong>${calculateDuration(record.time_out, record.time_in)}</strong></td>
                  <td>${record.purpose}</td>
                  <td>
                    <span class="status-${getActualStatus(record).toLowerCase().includes('approved') ? 'approved' : 
                                      getActualStatus(record).toLowerCase().includes('rejected') ? 'rejected' : 'pending'}">
                      ${getActualStatus(record)}
                    </span>
                  </td>
                  <td>${record.approved_by_name}</td>
                  <td>${record.guard_approved_by_name}</td>
                  <td>${formatDateTime(record.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This report contains ${gatePassData.length} gate pass request records</p>
            <p>© ${new Date().getFullYear()} SPC RFID Payroll System - All rights reserved</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        toast.success('PDF export completed!');
      };
    };
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gate Pass Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive gate pass request analytics and reporting</p>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Dean Approval">Pending Dean Approval</option>
                  <option value="Dean Approved">Dean Approved</option>
                  <option value="Fully Approved">Fully Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
                <input
                  type="text"
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  placeholder="Search destination..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold">Total</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.total}</p>
            <p className="text-blue-100 text-xs">All requests</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">Pending</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.pending}</p>
            <p className="text-yellow-100 text-xs">Awaiting dean approval</p>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">Dean Approved</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.deanApproved}</p>
            <p className="text-blue-100 text-xs">Dean approved only</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold">Fully Approved</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.fullyApproved}</p>
            <p className="text-green-100 text-xs">Fully approved</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-semibold">Rejected</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats.rejected}</p>
            <p className="text-red-100 text-xs">Declined requests</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={exportToCSV}
            disabled={gatePassData.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={exportToPDF}
            disabled={gatePassData.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>

          <button
            onClick={fetchGatePassData}
            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Gate Pass Request Records</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 font-medium text-lg">Loading gate pass data...</div>
            </div>
          ) : gatePassData.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Gate Pass Requests Found</h3>
                  <p className="text-gray-500">No gate pass requests match your current filters</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Destination</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Schedule</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Purpose</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Submitted</th>
                    <th className="px-3 py-2.5 text-center border-b text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gatePassData.map((record) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{record.id}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          {record.profile_picture ? (
                            <img
                              src={record.profile_picture}
                              alt={record.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-semibold">{record.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-gray-900 text-sm truncate">{record.name}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                                {record.role}
                              </span>
                              {record.requester_position && (
                                <span className="text-xs text-gray-600 font-medium">• {record.requester_position}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {record.destination}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="text-xs text-gray-600">
                          <div><strong>Out:</strong> {formatDateTime(record.time_out)}</div>
                          <div><strong>In:</strong> {formatDateTime(record.time_in)}</div>
                          <div className="mt-1 pt-1 border-t border-gray-300">
                            <strong>Duration:</strong> 
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {calculateDuration(record.time_out, record.time_in)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <p className="text-sm text-gray-700 max-w-xs truncate" title={record.purpose}>
                          {record.purpose}
                        </p>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(getActualStatus(record))}`}>
                          {getActualStatus(record)}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDateTime(record.created_at)}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <button
                          onClick={() => handleViewGatePass(record)}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-1 mx-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Gate Pass Modal */}
        {showModal && selectedGatePass && (
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 animate-slideUp">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6 flex items-center justify-between z-10 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gate Pass Details</h2>
                    <p className="text-blue-100 text-sm font-medium">Request ID: #{selectedGatePass.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-11 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-90"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
                <div className="p-8">
                  {/* Profile Section */}
                  <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-200">
                    {selectedGatePass.profile_picture ? (
                      <img
                        src={selectedGatePass.profile_picture}
                        alt={selectedGatePass.name}
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-blue-100 shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-3xl font-bold">{selectedGatePass.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-1">{selectedGatePass.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                          {selectedGatePass.role}
                        </span>
                        <span className="text-gray-600 text-base font-medium">
                          {selectedGatePass.requester_position || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs text-blue-700 uppercase font-bold mb-2 tracking-wide">Destination</p>
                      <p className="text-xl font-bold text-blue-700">{selectedGatePass.destination}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs text-green-700 uppercase font-bold mb-2 tracking-wide">Status</p>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${getStatusColor(getActualStatus(selectedGatePass))}`}>
                        {getActualStatus(selectedGatePass)}
                      </span>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs text-purple-700 uppercase font-bold mb-2 tracking-wide">Time Out</p>
                      <p className="text-base font-bold text-gray-800">{formatDateTime(selectedGatePass.time_out)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs text-purple-700 uppercase font-bold mb-2 tracking-wide">Expected Time In</p>
                      <p className="text-base font-bold text-gray-800">{formatDateTime(selectedGatePass.time_in)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-2xl border border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 md:col-span-2">
                      <p className="text-xs text-orange-700 uppercase font-bold mb-2 tracking-wide">Purpose</p>
                      <p className="text-base font-bold text-gray-800">{selectedGatePass.purpose}</p>
                    </div>
                  </div>

                  {/* Duration Highlight */}
                  <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white p-8 rounded-2xl text-center mb-6 shadow-xl">
                    <p className="text-sm opacity-90 mb-2 font-semibold tracking-wide uppercase">Total Duration</p>
                    <p className="text-4xl font-bold">{calculateDuration(selectedGatePass.time_out, selectedGatePass.time_in)}</p>
                  </div>

                  {/* Approval Details */}
                  <div className="mb-6">
                    <h4 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approval Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                        <p className="text-sm text-blue-700 font-bold mb-2 uppercase tracking-wide">Dean Approval</p>
                        <p className="text-lg font-bold text-gray-900">{selectedGatePass.approved_by_name}</p>
                        {selectedGatePass.approved_date && (
                          <p className="text-xs text-gray-600 mt-2 font-medium">{formatDateTime(selectedGatePass.approved_date)}</p>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-2xl border border-teal-200 shadow-sm hover:shadow-md transition-all duration-200">
                        <p className="text-sm text-teal-700 font-bold mb-2 uppercase tracking-wide">Guard Approval</p>
                        <p className="text-lg font-bold text-gray-900">{selectedGatePass.guard_approved_by_name}</p>
                        {selectedGatePass.guard_approved_date && (
                          <p className="text-xs text-gray-600 mt-2 font-medium">{formatDateTime(selectedGatePass.guard_approved_date)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submitted Date */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border border-gray-200 shadow-sm mb-6">
                    <p className="text-xs text-gray-700 uppercase font-bold mb-2 tracking-wide">Submitted Date</p>
                    <p className="text-base font-bold text-gray-800">{formatDateTime(selectedGatePass.created_at)}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => printIndividualGatePass(selectedGatePass)}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Gate Pass
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GatePassReport;

import { useState, useEffect } from "react";
import supabase from "../../../utils/supabase";
import { toast } from 'react-hot-toast';

interface LeaveReportData {
  id: number;
  name: string;
  type: string;
  leave_type: string;
  purpose: string;
  start_date: string;
  end_date: string;
  duration: string;
  status: string;
  approved_by_name: string;
  guard_approved_by_name: string;
  approved_date: string;
  guard_approved_date: string;
  requester_position: string;
  profile_picture?: string;
  created_at: string;
}

interface LeaveReportProps {
  onBack: () => void;
}

export const LeaveReport = ({ onBack }: LeaveReportProps) => {
  const [leaveData, setLeaveData] = useState<LeaveReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState("All");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");

  useEffect(() => {
    fetchLeaveData();
  }, [dateRange, statusFilter, leaveTypeFilter]);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      console.log('[LeaveReport] Fetching leave requests...');

      // Fetch leave requests from the requests table
      let query = supabase
        .from('requests')
        .select('*')
        .eq('request_type', 'Leave')
        .gte('created_at', `${dateRange.startDate}T00:00:00`)
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      const { data: requests, error: requestError } = await query;

      if (requestError) {
        console.error('[LeaveReport] Error fetching requests:', requestError);
        toast.error('Failed to fetch leave requests');
        return;
      }

      if (!requests || requests.length === 0) {
        console.log('[LeaveReport] No leave requests found');
        setLeaveData([]);
        return;
      }

      // Get user details for each request
      const requestsWithDetails = [];
      for (const request of requests) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
          .eq('id', request.user_id)
          .single();

        if (!userError && userData) {
          // Get dean approver details
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

          // Get HR approver details
          let hrApproverName = 'Pending';
          if (request.guard_approved_by) {
            const { data: hrData } = await supabase
              .from('users')
              .select('name')
              .eq('id', request.guard_approved_by)
              .single();
            
            if (hrData) {
              hrApproverName = hrData.name;
            }
          }

          const leaveRecord = {
            id: request.id,
            name: userData.name,
            type: request.request_type,
            leave_type: request.leave_type || 'Not specified',
            purpose: request.purpose || request.reason || 'Not specified',
            start_date: request.start_date || '',
            end_date: request.end_date || '',
            duration: request.duration || 'Not specified',
            status: request.status,
            approved_by_name: deanApproverName,
            guard_approved_by_name: hrApproverName,
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

          if (leaveTypeFilter !== "All" && request.leave_type !== leaveTypeFilter) {
            continue;
          }

          requestsWithDetails.push(leaveRecord);
        }
      }

      console.log('[LeaveReport] Processed leave data:', requestsWithDetails);
      setLeaveData(requestsWithDetails);

    } catch (error) {
      console.error('[LeaveReport] Error fetching leave data:', error);
      toast.error('Failed to fetch leave data');
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending Dean Approval':
        return 'bg-orange-100 text-orange-800';
      case 'Dean Approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const exportToCSV = () => {
    if (leaveData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = leaveData.map(record => ({
      'Request ID': record.id,
      'Employee Name': record.name,
      'Position': record.requester_position,
      'Leave Type': record.leave_type,
      'Purpose': record.purpose,
      'Start Date': formatDate(record.start_date),
      'End Date': formatDate(record.end_date),
      'Duration': record.duration,
      'Status': record.status,
      'Dean Approver': record.approved_by_name,
      'HR Approver': record.guard_approved_by_name,
      'Dean Approval Date': record.approved_date ? formatDateTime(record.approved_date) : 'Pending',
      'HR Approval Date': record.guard_approved_date ? formatDateTime(record.guard_approved_date) : 'Pending',
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
    link.setAttribute("download", `leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Leave report exported successfully!');
  };

  const exportToPDF = () => {
    if (leaveData.length === 0) {
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
          <title>Leave Report - ${currentDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B5CF6; padding-bottom: 20px; }
            .header h1 { color: #8B5CF6; margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #8B5CF6; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #8B5CF6; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-approved { background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; }
            .status-pending { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; }
            .status-rejected { background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Leave Report</h1>
            <p>SPC RFID Payroll System</p>
            <p>Generated on: ${currentDate}</p>
            <p>Report Period: ${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${stats.total}</div>
              <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.approved}</div>
              <div class="stat-label">Approved</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.pending}</div>
              <div class="stat-label">Pending</div>
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
                <th>Employee Name</th>
                <th>Position</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Dean Approver</th>
                <th>HR Approver</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${leaveData.map(record => `
                <tr>
                  <td>${record.id}</td>
                  <td>${record.name}</td>
                  <td>${record.requester_position}</td>
                  <td>${record.leave_type}</td>
                  <td>${formatDate(record.start_date)}</td>
                  <td>${formatDate(record.end_date)}</td>
                  <td>${record.duration}</td>
                  <td>${record.purpose}</td>
                  <td>
                    <span class="status-${record.status.toLowerCase().includes('approved') ? 'approved' : 
                                      record.status.toLowerCase().includes('rejected') ? 'rejected' : 'pending'}">
                      ${record.status}
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
            <p>This report contains ${leaveData.length} leave request records</p>
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

  const getUniqueLeaveTypes = () => {
    const types = leaveData.map(record => record.leave_type).filter(Boolean);
    return [...new Set(types)];
  };

  const getStatistics = () => {
    const total = leaveData.length;
    const approved = leaveData.filter(record => record.status === 'Approved').length;
    const pending = leaveData.filter(record => record.status.includes('Pending')).length;
    const rejected = leaveData.filter(record => record.status === 'Rejected').length;

    return { total, approved, pending, rejected };
  };

  const stats = getStatistics();

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-8 0V8a2 2 0 012-2h4a2 2 0 012 2v1" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Leave Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive leave request analytics and reporting</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Dean Approval">Pending Dean Approval</option>
                  <option value="Dean Approved">Dean Approved</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type</label>
                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="All">All Types</option>
                  {getUniqueLeaveTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={exportToCSV}
            disabled={leaveData.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={exportToPDF}
            disabled={leaveData.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>

          <button
            onClick={fetchLeaveData}
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
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Leave Request Records</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 font-medium text-lg">Loading leave data...</div>
            </div>
          ) : leaveData.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-8 0V8a2 2 0 012-2h4a2 2 0 012 2v1" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Leave Requests Found</h3>
                  <p className="text-gray-500">No leave requests match your current filters</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Name</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Leave Type</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Duration</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Purpose</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveData.map((record) => (
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
                              className="w-8 h-8 rounded-full object-cover border-2 border-purple-200"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">{record.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-800 text-sm">{record.name}</span>
                            <p className="text-xs text-gray-500">{record.requester_position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {record.leave_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="text-xs text-gray-600">
                          <div><strong>Start:</strong> {formatDate(record.start_date)}</div>
                          <div><strong>End:</strong> {formatDate(record.end_date)}</div>
                          <div><strong>Duration:</strong> {record.duration}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <p className="text-sm text-gray-700 max-w-xs truncate" title={record.purpose}>
                          {record.purpose}
                        </p>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDateTime(record.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LeaveReport;

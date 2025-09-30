import { useState, useEffect } from "react";
import supabase from "../../../utils/supabase";
import { toast } from 'react-hot-toast';

interface LoanReportData {
  id: number;
  name: string;
  type: string;
  amount: number;
  purpose: string;
  date_needed: string;
  monthly_deduction: number;
  total_months: number;
  repayment_terms: string;
  status: string;
  approved_by_name: string;
  guard_approved_by_name: string;
  approved_date: string;
  guard_approved_date: string;
  requester_position: string;
  profile_picture?: string;
  created_at: string;
}

interface LoanReportProps {
  onBack: () => void;
}

export const LoanReport = ({ onBack }: LoanReportProps) => {
  const [loanData, setLoanData] = useState<LoanReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState("All");
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });

  useEffect(() => {
    fetchLoanData();
  }, [dateRange, statusFilter, amountRange]);

  const fetchLoanData = async () => {
    setLoading(true);
    try {
      console.log('[LoanReport] Fetching loan requests...');

      let query = supabase
        .from('requests')
        .select('*')
        .eq('request_type', 'Loan')
        .gte('created_at', `${dateRange.startDate}T00:00:00`)
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      const { data: requests, error: requestError } = await query;

      if (requestError) {
        console.error('[LoanReport] Error fetching requests:', requestError);
        toast.error('Failed to fetch loan requests');
        return;
      }

      if (!requests || requests.length === 0) {
        console.log('[LoanReport] No loan requests found');
        setLoanData([]);
        return;
      }

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

          const loanRecord = {
            id: request.id,
            name: userData.name,
            type: request.request_type,
            amount: request.amount || 0,
            purpose: request.purpose || request.reason || 'Not specified',
            date_needed: request.date_needed || '',
            monthly_deduction: request.monthly_deduction || 0,
            total_months: request.total_months || 0,
            repayment_terms: request.repayment_terms || 'Not specified',
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

          if (amountRange.min && request.amount < parseFloat(amountRange.min)) {
            continue;
          }

          if (amountRange.max && request.amount > parseFloat(amountRange.max)) {
            continue;
          }

          requestsWithDetails.push(loanRecord);
        }
      }

      console.log('[LoanReport] Processed loan data:', requestsWithDetails);
      setLoanData(requestsWithDetails);

    } catch (error) {
      console.error('[LoanReport] Error fetching loan data:', error);
      toast.error('Failed to fetch loan data');
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
    if (loanData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = loanData.map(record => ({
      'Request ID': record.id,
      'Employee Name': record.name,
      'Position': record.requester_position,
      'Loan Amount': record.amount,
      'Purpose': record.purpose,
      'Date Needed': formatDate(record.date_needed),
      'Monthly Deduction': record.monthly_deduction,
      'Total Months': record.total_months,
      'Repayment Terms': record.repayment_terms,
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
    link.setAttribute("download", `loan_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Loan report exported successfully!');
  };

  const exportToPDF = () => {
    if (loanData.length === 0) {
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
          <title>Loan Report - ${currentDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #EA580C; padding-bottom: 20px; }
            .header h1 { color: #EA580C; margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .stat-number { font-size: 24px; font-weight: bold; color: #EA580C; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #EA580C; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-approved { background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; }
            .status-pending { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; }
            .status-rejected { background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; }
            .amount { font-weight: bold; color: #EA580C; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Loan Report</h1>
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
            <div class="stat-card">
              <div class="stat-number">₱${stats.totalAmount.toLocaleString()}</div>
              <div class="stat-label">Total Amount</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Position</th>
                <th>Loan Amount</th>
                <th>Date Needed</th>
                <th>Monthly Deduction</th>
                <th>Total Months</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Dean Approver</th>
                <th>HR Approver</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${loanData.map(record => `
                <tr>
                  <td>${record.id}</td>
                  <td>${record.name}</td>
                  <td>${record.requester_position}</td>
                  <td class="amount">₱${record.amount.toLocaleString()}</td>
                  <td>${formatDate(record.date_needed)}</td>
                  <td>₱${record.monthly_deduction.toLocaleString()}</td>
                  <td>${record.total_months} months</td>
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
            <p>This report contains ${loanData.length} loan request records</p>
            <p>Total loan amount requested: ₱${stats.totalAmount.toLocaleString()}</p>
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

  const getStatistics = () => {
    const total = loanData.length;
    const approved = loanData.filter(record => record.status === 'Approved').length;
    const pending = loanData.filter(record => record.status.includes('Pending')).length;
    const rejected = loanData.filter(record => record.status === 'Rejected').length;
    const totalAmount = loanData.reduce((sum, record) => sum + record.amount, 0);

    return { total, approved, pending, rejected, totalAmount };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Loan Reports</h1>
                  <p className="text-gray-600">Comprehensive loan request analytics and reporting</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToCSV}
                  disabled={loanData.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={loanData.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Dean Approval">Pending Dean Approval</option>
                  <option value="Dean Approved">Dean Approved</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Min Amount</label>
                <input
                  type="number"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                  placeholder="₱0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Amount</label>
                <input
                  type="number"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                  placeholder="₱100,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
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

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Amount</p>
                <p className="text-2xl font-bold">₱{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Loan Request Records</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 font-medium text-lg">Loading loan data...</div>
            </div>
          ) : loanData.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Loan Requests Found</h3>
                  <p className="text-gray-500">No loan requests match your current filters</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Amount</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Repayment</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Purpose</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {loanData.map((record) => (
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
                              className="w-8 h-8 rounded-full object-cover border-2 border-orange-200"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
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
                        <div className="text-sm">
                          <div className="font-bold text-orange-600">₱{record.amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Needed: {formatDate(record.date_needed)}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="text-xs text-gray-600">
                          <div><strong>Monthly:</strong> ₱{record.monthly_deduction.toLocaleString()}</div>
                          <div><strong>Months:</strong> {record.total_months}</div>
                          <div className="text-xs text-gray-500 mt-1">{record.repayment_terms}</div>
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

export default LoanReport;

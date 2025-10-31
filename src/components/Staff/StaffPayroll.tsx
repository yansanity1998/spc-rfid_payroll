// src/components/Staff/StaffPayroll.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { StaffNav } from "./StaffNav";

interface PayrollRecord {
  id: number;
  period: string;
  gross: number;
  deductions: number;
  loan_deduction?: number;
  net: number;
  status: string;
  created_at: string;
  user_id?: number;
  basic_salary?: number;
  overtime_pay?: number;
  allowances?: number;
  penalties?: number;
  sss?: number;
  philhealth?: number;
  pagibig?: number;
  tax?: number;
  other_deductions?: number;
}

export const StaffPayroll = () => {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [sortByPeriod, setSortByPeriod] = useState("");
  const [sortByStatus, setSortByStatus] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    fetchCurrentUserPayroll();
  }, []);

  const fetchCurrentUserPayroll = async () => {
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      // Find user in database in background
      supabase
        .from("users")
        .select("id, name, role, email")
        .eq("auth_id", user.id)
        .single()
        .then(({ data: userData, error: userError }) => {
          if (userError) {
            console.error("Error fetching user data:", userError);
            return;
          }

          setCurrentUser(userData);

          // Fetch payroll records for this user with detailed breakdown
          supabase
            .from("payrolls")
            .select("*")
            .eq("user_id", userData.id)
            .order("created_at", { ascending: false })
            .then(({ data: payrollData, error: payrollError }) => {
              if (payrollError) {
                console.error("Error fetching payroll data:", payrollError);
              } else {
                setPayrollRecords(payrollData || []);
              }
            });
        });
    } catch (error) {
      console.error("Error in fetchCurrentUserPayroll:", error);
    }
  };

  const handleViewDetails = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPayroll(null);
  };

  // Calculate actual penalties from the payroll data
  const calculateActualPenalties = (payroll: PayrollRecord) => {
    // If penalties field exists and has value, use it
    if (payroll.penalties && payroll.penalties > 0) {
      return payroll.penalties;
    }
    
    // Otherwise, calculate from total deductions minus known deductions
    const knownDeductions = (payroll.sss || 0) + 
                           (payroll.philhealth || 0) + 
                           (payroll.pagibig || 0) + 
                           (payroll.tax || 0) + 
                           (payroll.other_deductions || 0);
    
    const calculatedPenalties = payroll.deductions - knownDeductions;
    return calculatedPenalties > 0 ? calculatedPenalties : 0;
  };

  // Filter and sort payroll records
  const filteredRecords = payrollRecords.filter((record) => {
    const matchesSearch = record.period.toLowerCase().includes(search.toLowerCase()) ||
                         record.status.toLowerCase().includes(search.toLowerCase());
    const matchesPeriod = sortByPeriod === "" || record.period === sortByPeriod;
    const matchesStatus = sortByStatus === "" || record.status === sortByStatus;
    
    return matchesSearch && matchesPeriod && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "finalized":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Print payslip function (same as HRAdmin Payroll.tsx)
  const printPayslip = (data: PayrollRecord) => {
    try {
      const gross = data.gross || 0;
      const deductions = data.deductions || 0;
      const loan = data.loan_deduction || 0;
      const net = data.net || (gross - deductions - loan);
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Payslip - ${currentUser?.name || 'Employee'}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: 'Arial', sans-serif; background: white; padding: 0; font-size: 9pt; line-height: 1.3; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .payslip-container { max-width: 240mm; width: 90%; margin: 0 auto; background: white; border: 2px solid #000; padding: 0; }
            .header { text-align: center; padding: 15px 20px; border-bottom: 2px solid #000; }
            .header h1 { font-size: 13pt; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }
            .header .subtitle { font-size: 8pt; margin-bottom: 6px; }
            .header .period { font-size: 9pt; font-weight: bold; margin-top: 6px; }
            .section { padding: 10px 15px; border-bottom: 2px solid #000; }
            .section:last-child { border-bottom: none; }
            .section-title { font-weight: bold; font-size: 9pt; margin-bottom: 6px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 4px; font-size: 8pt; }
            .info-label { font-weight: normal; }
            .info-value { font-weight: normal; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .column-section { display: flex; flex-direction: column; }
            .amount-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 8pt; }
            .amount-label { font-weight: normal; }
            .amount-value { font-weight: normal; text-align: right; min-width: 70px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; margin-top: 6px; border-top: 2px solid #000; font-weight: bold; font-size: 9pt; }
            .net-pay-section { background: #f5f5f5; padding: 10px 15px; text-align: center; }
            .net-pay-label { font-size: 9pt; font-weight: bold; margin-bottom: 4px; }
            .net-pay-amount { font-size: 13pt; font-weight: bold; }
            .footer { padding: 10px 15px; font-size: 8pt; text-align: center; border-top: 2px solid #000; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 30px; padding: 0 20px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #000; margin-bottom: 5px; padding-top: 40px; }
            @media print { body { padding: 0; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header">
              <h1>ST. PETERS COLLEGE-PAYSLIP</h1>
              <div class="subtitle">Period: AUGUST 11 - AUGUST 25,2025</div>
              <div class="period">${data.period || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="section-title">INCOME:</div>
              <div class="info-grid">
                <div class="info-label">Department:</div>
                <div class="info-value">${currentUser?.role || 'N/A'}</div>
                <div class="info-label">Employee Name:</div>
                <div class="info-value">${currentUser?.name || 'N/A'}</div>
                <div class="info-label">ID #:</div>
                <div class="info-value">${data.user_id || 'N/A'}</div>
              </div>
            </div>
            <div class="section">
              <div class="two-column">
                <div class="column-section">
                  <div class="amount-row"><div class="amount-label">Basic Rate:</div><div class="amount-value">${gross.toFixed(2)}</div></div>
                  <div class="amount-row"><div class="amount-label">No. of Days/Hrs Worked:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Basic Pay:</div><div class="amount-value">${gross.toFixed(2)}</div></div>
                  <div class="amount-row"><div class="amount-label">Accumulated Overtimes:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Extra Load Amount:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">13th Month:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Other Income:</div><div class="amount-value">--</div></div>
                  <div class="total-row"><div>GROSS PAY:</div><div>${gross.toFixed(2)}</div></div>
                  <div class="total-row"><div>ADD: OTHER BENEFITS:</div><div>--</div></div>
                  <div class="total-row"><div>TOTAL PAY:</div><div>${gross.toFixed(2)}</div></div>
                </div>
                <div class="column-section">
                  <div class="section-title">DEDUCTIONS:</div>
                  <div class="amount-row"><div class="amount-label">SSS Employee Share:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">PHILHEALTH Payable:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">HDMF/EE Payable:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Groceries/Canteen:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">HDMF Loan:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Booklet/Loan:</div><div class="amount-value">${loan.toFixed(2)}</div></div>
                  <div class="amount-row"><div class="amount-label">SSS Loan:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">COOP:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Cash Advances:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Uniform/Misc:</div><div class="amount-value">--</div></div>
                  <div class="amount-row"><div class="amount-label">Other Deductions:</div><div class="amount-value">${deductions.toFixed(2)}</div></div>
                  <div class="total-row"><div>TOTAL DEDUCTIONS:</div><div>${(deductions + loan).toFixed(2)}</div></div>
                </div>
              </div>
            </div>
            <div class="net-pay-section">
              <div class="net-pay-label">PAYROLL NET PAY:</div>
              <div class="net-pay-amount">${net.toFixed(2)}</div>
            </div>
            <div class="footer">
              <div>Date: ${currentDate}</div>
              <div style="margin-top: 10px;">Received by:</div>
              <div class="signature-section"><div class="signature-box"><div class="signature-line"></div><div>Employee Signature</div></div></div>
            </div>
          </div>
        </body>
        </html>
      `;

      const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
      if (!w) { alert('Unable to open print window. Please allow popups.'); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 300);
    } catch (err) {
      console.error('Error printing payslip', err);
      alert('Failed to print payslip');
    }
  };

  // Get unique periods and statuses for filters
  const uniquePeriods = [...new Set(payrollRecords.map(record => record.period))];
  const uniqueStatuses = [...new Set(payrollRecords.map(record => record.status))];

  // Calculate summary statistics
  const totalGross = payrollRecords.reduce((sum, record) => sum + record.gross, 0);
  const totalDeductions = payrollRecords.reduce((sum, record) => sum + record.deductions, 0);
  const totalLoanDeductions = payrollRecords.reduce((sum, record) => sum + (record.loan_deduction || 0), 0);
  const totalNet = payrollRecords.reduce((sum, record) => sum + record.net, 0);
  const paidRecords = payrollRecords.filter(record => 
    record.status.toLowerCase() === 'paid' || record.status.toLowerCase() === 'finalized'
  );
  const pendingRecords = payrollRecords.filter(record => record.status.toLowerCase() === 'pending');
  const recordsWithLoans = payrollRecords.filter(record => record.loan_deduction && record.loan_deduction > 0).length;

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-100">
      <StaffNav />
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Payroll History</h1>
                <p className="text-red-100">
                  {currentUser ? `Welcome, ${currentUser.name}` : "Loading user information..."}
                </p>
              </div>
              <div className="text-right">
                <div className="text-red-100 text-sm">Total Records</div>
                <div className="text-3xl font-bold">{payrollRecords.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Gross Pay</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGross)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Loans</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalLoanDeductions)}</p>
                {recordsWithLoans > 0 && (
                  <p className="text-xs text-gray-500">{recordsWithLoans} period(s) with loans</p>
                )}
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Net Pay</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalNet)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Paid Records</p>
                <p className="text-2xl font-bold text-green-600">{paidRecords.length}</p>
                <p className="text-xs text-gray-500">Pending: {pendingRecords.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by period or status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select
                value={sortByPeriod}
                onChange={(e) => setSortByPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Periods</option>
                {uniquePeriods.map((period) => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={sortByStatus}
                onChange={(e) => setSortByStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payroll Records Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Payroll Records</h3>
            <p className="text-sm text-gray-600">Showing {filteredRecords.length} of {payrollRecords.length} records</p>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payroll Records Found</h3>
              <p className="text-gray-600">
                {search || sortByPeriod || sortByStatus 
                  ? "No records match your current filters. Try adjusting your search criteria."
                  : "You don't have any payroll records yet. Check back later or contact HR if you believe this is an error."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.period}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{formatCurrency(record.gross)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-red-600">{formatCurrency(record.deductions)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-orange-600">
                          {record.loan_deduction && record.loan_deduction > 0 
                            ? formatCurrency(record.loan_deduction) 
                            : <span className="text-gray-400">--</span>
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-600">{formatCurrency(record.net)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(record.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(record)}
                            className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                          <button
                            onClick={() => printPayslip(record)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payroll Details Modal */}
        {showDetailsModal && selectedPayroll && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Payroll Details</h2>
                    <p className="text-orange-100 text-sm">Period: {selectedPayroll.period}</p>
                  </div>
                  <button
                    onClick={closeDetailsModal}
                    className="text-white hover:text-orange-200 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Earnings Section */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Earnings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Basic Salary:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(selectedPayroll.basic_salary || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Overtime Pay:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(selectedPayroll.overtime_pay || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Allowances:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(selectedPayroll.allowances || 0)}
                        </span>
                      </div>
                      <div className="border-t border-green-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-green-800">Total Gross:</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(selectedPayroll.gross)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      Deductions
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">SSS:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.sss || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">PhilHealth:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.philhealth || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Pag-IBIG:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.pagibig || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Tax:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.tax || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Penalties:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(calculateActualPenalties(selectedPayroll))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Loan Deduction:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.loan_deduction || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Other Deductions:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(selectedPayroll.other_deductions || 0)}
                        </span>
                      </div>
                      <div className="border-t border-red-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-red-800">Total Deductions:</span>
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(selectedPayroll.deductions)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Payroll Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Gross Pay</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPayroll.gross)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Deductions</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(selectedPayroll.deductions)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Net Pay</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedPayroll.net)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">Status:</span>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedPayroll.status)}`}>
                        {selectedPayroll.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Created: {formatDate(selectedPayroll.created_at)}
                    </div>
                  </div>
                </div>

                {/* Loan Breakdown (if any) */}
                {selectedPayroll.loan_deduction && selectedPayroll.loan_deduction > 0 && (
                  <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Loan Deduction
                    </h3>
                    <div className="bg-white rounded p-3 border border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Loan Payment for this Period:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(selectedPayroll.loan_deduction)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This amount is deducted from your payroll for loan repayment as per your approved loan request.
                      </p>
                    </div>
                  </div>
                )}

                {/* Penalties Breakdown (if any) */}
                {calculateActualPenalties(selectedPayroll) > 0 && (
                  <div className="mt-6 bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Penalties Breakdown
                    </h3>
                    <div className="bg-white rounded p-3 border border-orange-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Penalties Applied:</span>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(calculateActualPenalties(selectedPayroll))}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This includes late arrival penalties, absent day penalties, and other attendance-related deductions.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        </section>
      </main>
    </div>
  );
};

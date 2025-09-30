// src/components/Accounting/Reports.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

interface PayrollRecord {
  id: number;
  user_id: number;
  period: string;
  gross: number;
  deductions: number;
  loan_deduction: number;
  net: number;
  status: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    role: string;
  };
}

export const Reports = () => {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch all payroll records with user details
  const fetchPayrollRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payrolls")
        .select(`
          id,
          user_id,
          period,
          gross,
          deductions,
          loan_deduction,
          net,
          status,
          created_at,
          users (
            id,
            name,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payroll records:", error);
      } else {
        // Transform data to match PayrollRecord interface
        const transformedData = (data || []).map((record: any) => ({
          ...record,
          user: Array.isArray(record.users) ? record.users[0] : record.users
        }));
        setPayrollRecords(transformedData);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  // Color coding for employee types
  const getEmployeeTypeColor = (role: string) => {
    switch (role) {
      case "Administrator":
        return "text-purple-800 bg-purple-100";
      case "HR Personnel":
        return "text-blue-800 bg-blue-100";
      case "Accounting":
        return "text-green-800 bg-green-100";
      case "Faculty":
        return "text-red-800 bg-red-100";
      case "Staff":
        return "text-orange-800 bg-orange-100";
      case "SA":
        return "text-yellow-800 bg-yellow-100";
      case "Guard":
        return "text-teal-800 bg-teal-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  // Filter records
  const filteredRecords = payrollRecords.filter((record) => {
    const matchesSearch =
      record.user.name.toLowerCase().includes(search.toLowerCase()) ||
      record.period.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !filterRole || record.user.role === filterRole;
    const matchesPeriod = !filterPeriod || record.period === filterPeriod;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesRole && matchesPeriod && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, filterPeriod, filterStatus]);

  // Calculate summary statistics
  const totalGross = filteredRecords.reduce((sum, record) => sum + record.gross, 0);
  const totalDeductions = filteredRecords.reduce((sum, record) => sum + record.deductions, 0);
  const totalLoans = filteredRecords.reduce((sum, record) => sum + (record.loan_deduction || 0), 0);
  const totalNet = filteredRecords.reduce((sum, record) => sum + record.net, 0);

  // Get unique periods for filter
  const uniquePeriods = Array.from(new Set(payrollRecords.map((r) => r.period))).sort();

  // Print/Export to PDF
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Employee ID", "Name", "Role", "Period", "Gross Pay", "Deductions", "Loan Deduction", "Net Pay", "Status", "Date Created"];
    const csvData = filteredRecords.map((record) => [
      record.user_id,
      record.user.name,
      record.user.role,
      record.period,
      record.gross,
      record.deductions,
      record.loan_deduction || 0,
      record.net,
      record.status,
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-100">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <section className="flex-shrink-0 space-y-4 print:mb-6">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Payroll Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive payroll history and records</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Records</h3>
                <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{filteredRecords.length}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Gross</h3>
                <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">₱{totalGross.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Deductions</h3>
                <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <p className="text-3xl font-bold">₱{(totalDeductions + totalLoans).toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Net Pay</h3>
                <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">₱{totalNet.toLocaleString()}</p>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between print:hidden">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or period..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="Administrator">Administrator</option>
                  <option value="HR Personnel">HR Personnel</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                  <option value="SA">SA</option>
                  <option value="Guard">Guard</option>
                </select>

                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm text-sm"
                >
                  <option value="">All Periods</option>
                  {uniquePeriods.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Finalized">Finalized</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>

              <button
                onClick={handlePrint}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print PDF
              </button>

              <button
                onClick={fetchPayrollRecords}
                className="bg-gray-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Employee ID</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Name</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Role</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Period</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Gross Pay</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Deductions</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Loan</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Net Pay</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-3 text-left border-b text-sm font-medium print:hidden">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all duration-200">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{record.user_id}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-semibold text-gray-800 text-sm">{record.user.name}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getEmployeeTypeColor(record.user.role)}`}>
                          {record.user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">{record.period}</td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-semibold text-green-600 text-sm">₱{record.gross.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-semibold text-red-600 text-sm">₱{record.deductions.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-semibold text-blue-600 text-sm">₱{(record.loan_deduction || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-bold text-purple-600 text-sm">₱{record.net.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            record.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : record.status === "Finalized"
                              ? "bg-blue-100 text-blue-800"
                              : record.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-xs print:hidden">
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Records Found</h3>
                          <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRecords.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-white print:hidden">
              <div className="relative flex items-center justify-center gap-4">
                <div className="absolute left-0 text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-gray-800">{Math.min(endIndex, filteredRecords.length)}</span> of{" "}
                  <span className="font-semibold text-gray-800">{filteredRecords.length}</span> records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1 ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-500 hover:text-green-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                      const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span key={pageNum} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                            currentPage === pageNum
                              ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md"
                              : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-500 hover:text-green-600"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1 ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-500 hover:text-green-600"
                    }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          main, main * {
            visibility: visible;
          }
          
          main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 10px;
            box-shadow: none !important;
            border: none !important;
          }
          
          table {
            width: 100%;
            font-size: 10px;
            border-collapse: collapse;
          }
          
          th, td {
            padding: 4px 6px !important;
            font-size: 9px;
            border: 1px solid #ddd;
          }
          
          th {
            background-color: #059669 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem;
          }
          
          h1 {
            font-size: 18px;
            margin-bottom: 10px;
          }
          
          .rounded-xl, .rounded-2xl {
            border-radius: 0 !important;
          }
          
          .shadow-xl, .shadow-2xl, .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};
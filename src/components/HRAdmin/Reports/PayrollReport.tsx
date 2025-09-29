import { useState, useEffect, useMemo } from "react";
import supabase from "../../../utils/supabase";
import toast from "react-hot-toast";

interface PayrollRecord {
  id: number;
  userId: number;
  name: string;
  role: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  status: string;
}

interface PayrollReportProps {
  onBack: () => void;
}

export const PayrollReport = ({ onBack }: PayrollReportProps) => {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Administrator": return "from-purple-500 to-purple-600 text-purple-800 bg-purple-100";
      case "HR Personnel": return "from-blue-500 to-blue-600 text-blue-800 bg-blue-100";
      case "Accounting": return "from-green-500 to-green-600 text-green-800 bg-green-100";
      case "Faculty": return "from-red-500 to-red-600 text-red-800 bg-red-100";
      case "Staff": return "from-orange-500 to-orange-600 text-orange-800 bg-orange-100";
      case "SA": return "from-yellow-500 to-yellow-600 text-yellow-800 bg-yellow-100";
      case "Guard": return "from-teal-500 to-teal-600 text-teal-800 bg-teal-100";
      default: return "from-gray-500 to-gray-600 text-gray-800 bg-gray-100";
    }
  };

  const fetchPayrollRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select(`
        id,
        name,
        role,
        payrolls (
          id,
          period,
          gross,
          deductions,
          net,
          status
        )
      `);

      if (error) {
        console.error("Error fetching payroll records:", error);
        toast.error("Failed to fetch payroll data");
      } else {
        // Flatten payrolls like in Payroll.tsx
        const flattenedPayrolls = (data || [])
          .map((user) =>
            user.payrolls?.length
              ? user.payrolls.map((pr: any) => ({
                  ...pr,
                  userId: user.id,
                  name: user.name,
                  role: user.role,
                }))
              : [
                  {
                    id: `no-payroll-${user.id}`,
                    userId: user.id,
                    name: user.name,
                    role: user.role,
                    period: "--",
                    gross: 0,
                    deductions: 0,
                    net: 0,
                    status: "No Record",
                  },
                ]
          )
          .flat();
        setPayrollRecords(flattenedPayrolls);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = payrollRecords.filter((record) => {
      const matchesRole = selectedRole === "All" || record.role === selectedRole;
      const matchesSearch = 
        record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.period?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRole && matchesSearch;
    });

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof PayrollRecord];
      let bValue: any = b[sortBy as keyof PayrollRecord];

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [payrollRecords, selectedRole, searchTerm, sortBy, sortOrder]);

  const availableRoles = useMemo(() => {
    const roles = [...new Set(payrollRecords.map(record => record.role))].filter(Boolean);
    return ["All", ...roles.sort()];
  }, [payrollRecords]);

  const exportToCSV = () => {
    const csvData = filteredAndSortedRecords.map(record => ({
      "Employee ID": record.userId || "",
      "Employee Name": record.name || "",
      "Role": record.role || "",
      "Period": record.period || "",
      "Gross Pay": record.gross || 0,
      "Deductions": record.deductions || 0,
      "Net Pay": record.net || 0,
      "Status": record.status || ""
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll_report_${selectedRole}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Payroll report exported successfully!");
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Payroll Report - ${selectedRole}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            h1 { color: #dc2626; text-align: center; margin-bottom: 30px; }
            .header { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .currency { text-align: right; }
            @media print {
              body { margin: 10px; }
              table { font-size: 10px; }
              th, td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <h1>Payroll Report</h1>
          <div class="header">
            <p><strong>Role Filter:</strong> ${selectedRole}</p>
            <p><strong>Total Records:</strong> ${filteredAndSortedRecords.length}</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Period</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedRecords.map(record => `
                <tr>
                  <td>${record.userId || "N/A"}</td>
                  <td>${record.name || "N/A"}</td>
                  <td>${record.role || "N/A"}</td>
                  <td>${record.period || "N/A"}</td>
                  <td class="currency">₱${record.gross?.toLocaleString() || "0"}</td>
                  <td class="currency">₱${record.deductions?.toLocaleString() || "0"}</td>
                  <td class="currency">₱${record.net?.toLocaleString() || "0"}</td>
                  <td class="status-${record.status?.toLowerCase()}">${record.status || "N/A"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success("Print dialog opened!");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading payroll data...</span>
          </div>
        </main>
      </div>
    );
  }

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Payroll Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive payroll records with filtering and export options</p>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Records</p>
                <p className="text-2xl font-bold">{payrollRecords.length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Net Pay</p>
                <p className="text-2xl font-bold">₱{payrollRecords.reduce((sum, record) => sum + (record.net || 0), 0).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Filtered Results</p>
                <p className="text-2xl font-bold">{filteredAndSortedRecords.length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pending Records</p>
                <p className="text-2xl font-bold">{payrollRecords.filter(record => record.status === "Pending").length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or period..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="name">Employee Name</option>
                <option value="period">Period</option>
                <option value="gross">Gross Pay</option>
                <option value="net">Net Pay</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={exportToCSV}
              disabled={filteredAndSortedRecords.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredAndSortedRecords.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>

            <button
              onClick={fetchPayrollRecords}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium">No payroll records found</p>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {record.userId || "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.name || "N/A"}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleColor(record.role || "")}`}>
                          {record.role || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.period || "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {record.gross > 0 ? `₱${record.gross.toLocaleString()}` : "--"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {record.deductions > 0 ? `₱${record.deductions.toLocaleString()}` : "--"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                        {record.net > 0 ? `₱${record.net.toLocaleString()}` : "--"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : record.status === "Finalized"
                            ? "bg-green-100 text-green-800"
                            : record.status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {record.status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredAndSortedRecords.length} of {payrollRecords.length} payroll records
              {selectedRole !== "All" && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  Role: {selectedRole}
                </span>
              )}
            </div>
            <div>
              Generated on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

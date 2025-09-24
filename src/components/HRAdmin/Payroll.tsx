// src/pages/Payroll.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Payroll = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [search, setSearch] = useState(""); // 🔍 search state
  const [sortByEmployeeType, setSortByEmployeeType] = useState("");
  const [sortByPeriod, setSortByPeriod] = useState("");

  // Color coding system for employee types
  const getEmployeeTypeColor = (role: string) => {
    switch (role) {
      case "Administrator":
        return "from-purple-500 to-purple-600 text-purple-800 bg-purple-100";
      case "HR Personnel":
        return "from-blue-500 to-blue-600 text-blue-800 bg-blue-100";
      case "Accounting":
        return "from-green-500 to-green-600 text-green-800 bg-green-100";
      case "Faculty":
        return "from-red-500 to-red-600 text-red-800 bg-red-100";
      case "Staff":
        return "from-orange-500 to-orange-600 text-orange-800 bg-orange-100";
      case "SA":
        return "from-yellow-500 to-yellow-600 text-yellow-800 bg-yellow-100";
      default:
        return "from-gray-500 to-gray-600 text-gray-800 bg-gray-100";
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
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
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const finalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Finalized" })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchPayrolls();
  };

  const unfinalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Pending" })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchPayrolls();
  };

  const savePayroll = async (id: number) => {
    // Find the current payroll record to get existing values
    const currentPayroll = payrolls.find(pr => pr.id === id);
    if (!currentPayroll) {
      alert("Payroll record not found");
      return;
    }

    // Use existing values if editData doesn't have them (for partial updates)
    const grossValue = editData.gross !== undefined ? editData.gross : currentPayroll.gross;
    const deductionsValue = editData.deductions !== undefined ? editData.deductions : currentPayroll.deductions;
    const netValue = grossValue - deductionsValue;

    const { error } = await supabase
      .from("payrolls")
      .update({
        gross: grossValue,
        deductions: deductionsValue,
        net: netValue,
      })
      .eq("id", id);

    if (error) alert(error.message);
    else {
      setEditing(null);
      setEditData({});
      fetchPayrolls();
    }
  };

  // Flatten payrolls
  const payrolls = users
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

  const filteredPayrolls = payrolls
    .filter((pr) => {
      // Search filter
      const matchesSearch = 
        pr.name.toLowerCase().includes(search.toLowerCase()) ||
        pr.role.toLowerCase().includes(search.toLowerCase()) ||
        pr.period.toLowerCase().includes(search.toLowerCase());
      
      // Employee type filter
      const matchesEmployeeType = !sortByEmployeeType || pr.role === sortByEmployeeType;
      
      // Period filter
      const matchesPeriod = !sortByPeriod || pr.period === sortByPeriod;
      
      return matchesSearch && matchesEmployeeType && matchesPeriod;
    })
    .sort((a, b) => {
      // Sort by employee type first if selected
      if (sortByEmployeeType) {
        if (a.role !== b.role) {
          return a.role.localeCompare(b.role);
        }
      }
      
      // Sort by period second if selected
      if (sortByPeriod) {
        if (a.period !== b.period) {
          return a.period.localeCompare(b.period);
        }
      }
      
      // Default sort by name
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Payroll Management</h1>
            </div>
            <p className="text-gray-600">Manage employee salaries and payroll processing</p>
          </div>

          {/* Modern Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, role, or period..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Sorting Controls */}
              <div className="flex gap-2">
                {/* Employee Type Sort */}
                <div className="relative">
                  <select
                    value={sortByEmployeeType}
                    onChange={(e) => setSortByEmployeeType(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm text-sm"
                  >
                    <option value="">All Employee Types</option>
                    <option value="Administrator">Administrator</option>
                    <option value="HR Personnel">HR Personnel</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                    <option value="SA">SA</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Period Sort */}
                <div className="relative">
                  <select
                    value={sortByPeriod}
                    onChange={(e) => setSortByPeriod(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm text-sm"
                  >
                    <option value="">All Periods</option>
                    {Array.from(new Set(payrolls.map(pr => pr.period).filter(period => period && period !== "--"))).sort().map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchPayrolls}
              className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </section>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Total Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Records</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.length}</p>
                <p className="text-blue-100 text-xs mt-1">Payroll entries</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Pending Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Pending</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.filter(p => p.status === "Pending").length}</p>
                <p className="text-yellow-100 text-xs mt-1">Awaiting processing</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Finalized Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Finalized</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.filter(p => p.status === "Finalized").length}</p>
                <p className="text-green-100 text-xs mt-1">Completed payrolls</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Amount */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Amount</h2>
                </div>
                <p className="text-2xl font-bold">₱{filteredPayrolls.reduce((sum, p) => sum + (p.net || 0), 0).toLocaleString()}</p>
                <p className="text-purple-100 text-xs mt-1">Net payroll total</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Payroll Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Payroll Records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Period</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Gross Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Deductions</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Net Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading payroll records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayrolls.length > 0 ? (
                  filteredPayrolls.map((pr) => (
                    <tr key={pr.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{pr.userId}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{pr.name || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(pr.role).split(' ').slice(2).join(' ')}`}>
                          {pr.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {pr.period}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {editing === pr.id ? (
                          <input
                            type="number"
                            className="border-2 border-gray-300 rounded-lg px-3 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={editData.gross || pr.gross}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                gross: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        ) : pr.gross > 0 ? (
                          <span className="font-semibold text-gray-700 text-sm">₱{pr.gross.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-500 text-sm">--</span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {editing === pr.id ? (
                          <input
                            type="number"
                            className="border-2 border-gray-300 rounded-lg px-3 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={editData.deductions || pr.deductions}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                deductions: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        ) : pr.deductions > 0 ? (
                          <span className="font-semibold text-red-600 text-sm">₱{pr.deductions.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-500 text-sm">--</span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-bold text-green-600 text-sm">
                          {editing === pr.id
                            ? `₱${(
                                (editData.gross || pr.gross) -
                                (editData.deductions || pr.deductions)
                              ).toLocaleString()}`
                            : pr.net > 0
                            ? `₱${pr.net.toLocaleString()}`
                            : "--"}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          pr.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : pr.status === "Finalized"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1.5">
                          {pr.status === "Pending" && editing !== pr.id && (
                            <button
                              onClick={() => {
                                setEditing(pr.id);
                                // Initialize editData with current values to prevent undefined issues
                                setEditData({
                                  gross: pr.gross,
                                  deductions: pr.deductions
                                });
                              }}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Edit
                            </button>
                          )}
                          {editing === pr.id && (
                            <button
                              onClick={() => savePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Save
                            </button>
                          )}
                          {pr.status === "Pending" ? (
                            <button
                              onClick={() => finalizePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Finalize
                            </button>
                          ) : pr.status === "Finalized" ? (
                            <button
                              onClick={() => unfinalizePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Unfinalize
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Payroll Records Found</h3>
                          <p className="text-gray-500">Check your search criteria or refresh the data.</p>
                          <button 
                            onClick={fetchPayrolls}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Refresh Data
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

// src/components/Accounting/Dashboard.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const AccDashboard = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch employees
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name, role, email, created_at")
        .order("created_at", { ascending: false });

      if (userError) {
        console.error("Error fetching employees:", userError);
        throw userError;
      }

      // Fetch payroll data
      const { data: payrollUsers, error: payrollError } = await supabase
        .from("users")
        .select(`
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
        `)
        .not("payrolls", "is", null);

      if (payrollError) {
        console.error("Error fetching payrolls:", payrollError);
      }

      setEmployees(users || []);
      setPayrollData(payrollUsers || []);
      
    } catch (error) {
      console.error("Error in fetchData:", error);
      setEmployees([]);
      setPayrollData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate payroll statistics
  const payrollRecords = payrollData.flatMap((user) =>
    user.payrolls.map((pr: any) => ({
      ...pr,
      name: user.name,
      role: user.role,
    }))
  );

  const totalGrossPay = payrollRecords.reduce((sum, pr) => sum + (pr.gross || 0), 0);
  const totalDeductions = payrollRecords.reduce((sum, pr) => sum + (pr.deductions || 0), 0);
  const totalNetPay = payrollRecords.reduce((sum, pr) => sum + (pr.net || 0), 0);
  const pendingPayrolls = payrollRecords.filter(pr => pr.status === "Pending").length;
  const finalizedPayrolls = payrollRecords.filter(pr => pr.status === "Finalized").length;

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          {/* Modern Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Accounting Dashboard</h1>
                <p className="text-gray-600">Financial overview and payroll management</p>
              </div>
            </div>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Employees */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Total Employees</h2>
                  </div>
                  <p className="text-3xl font-bold">{employees.length}</p>
                  <p className="text-blue-100 text-sm mt-1">Active workforce</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Total Gross Pay */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Total Gross Pay</h2>
                  </div>
                  <p className="text-3xl font-bold">₱{totalGrossPay.toLocaleString()}</p>
                  <p className="text-green-100 text-sm mt-1">Before deductions</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Total Deductions */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4 4m4-4l-4-4" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Total Deductions</h2>
                  </div>
                  <p className="text-3xl font-bold">₱{totalDeductions.toLocaleString()}</p>
                  <p className="text-orange-100 text-sm mt-1">Tax & contributions</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Total Net Pay */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Total Net Pay</h2>
                  </div>
                  <p className="text-3xl font-bold">₱{totalNetPay.toLocaleString()}</p>
                  <p className="text-purple-100 text-sm mt-1">Final amount</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>

          {/* Payroll Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {/* Pending Payrolls */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Pending Payrolls</h2>
                  </div>
                  <p className="text-3xl font-bold">{pendingPayrolls}</p>
                  <p className="text-yellow-100 text-sm mt-1">Awaiting processing</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Finalized Payrolls */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Finalized Payrolls</h2>
                  </div>
                  <p className="text-3xl font-bold">{finalizedPayrolls}</p>
                  <p className="text-emerald-100 text-sm mt-1">Completed payrolls</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Recent Payroll Records Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden min-h-[400px]">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Recent Payroll Records</h1>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm sm:text-base">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Employee</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Employee Type</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Period</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Gross Pay</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Net Pay</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading payroll data...</span>
                      </div>
                    </td>
                  </tr>
                ) : payrollRecords.length > 0 ? (
                  payrollRecords.slice(0, 10).map((pr: any) => (
                    <tr key={pr.id} className="hover:bg-white/80 transition-all duration-200">
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className="font-semibold text-gray-800">{pr.name}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(pr.role).split(' ').slice(2).join(' ')}`}>
                          {pr.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                        {pr.period || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-semibold text-gray-700">
                        ₱{pr.gross?.toLocaleString() || '0'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-bold text-green-600">
                        ₱{pr.net?.toLocaleString() || '0'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          pr.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : pr.status === "Finalized"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {pr.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Payroll Records Found</h3>
                          <p className="text-gray-500">Check your database connection or add payroll records to get started.</p>
                          <button 
                            onClick={fetchData}
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

export default AccDashboard;

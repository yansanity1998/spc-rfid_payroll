// src/pages/Hero.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const Dashboard = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState(1);
  const tableRow = 5;

  const [payrollPage, setPayrollPage] = useState(1);
  const payrollRow = 5;

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

  const payrollLast = payrollRow * payrollPage;
  const payrollFirst = payrollLast - payrollRow;


  const fetchData = async () => {
    setLoading(true);
    
    try {
      console.log("Starting to fetch employee data...");
      
      // fetch employees (for Employee List)
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, name, role, email, created_at")
        .order("created_at", { ascending: false });

      if (userError) {
        console.error("Error fetching employees:", userError);
        throw userError;
      }

      console.log("Fetched employees:", users);
      console.log("Number of employees:", users?.length || 0);

      // fetch only users with payrolls (inner join ensures user must have payrolls)
      const { data: payrollUsers, error: payrollError } = await supabase
        .from("users")
        .select(
          `
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
      `
        )
        .not("payrolls", "is", null);

      if (payrollError) {
        console.error("Error fetching payrolls:", payrollError);
      }

      console.log("Fetched payroll users:", payrollUsers);

      // Set the data
      setEmployees(users || []);
      setPayrollData(payrollUsers || []);
      
    } catch (error) {
      console.error("Error in fetchData:", error);
      // Set empty arrays on error
      setEmployees([]);
      setPayrollData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // flatten payrolls into one array
  const payrollRecords = payrollData.flatMap((user) =>
    user.payrolls.map((pr: any) => ({
      ...pr,
      name: user.name,
      role: user.role,
    }))
  );

  const payrollPageData = payrollRecords.slice(payrollFirst, payrollLast);

  const tableLast = tableRow * table;
  const tableFirst = tableLast - tableRow;
  const tablePage = employees.slice(tableFirst, tableLast);

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          {/* Modern Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">Welcome to your HR management portal</p>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Employees Card */}
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

            {/* Active Today Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Active Today</h2>
                  </div>
                  <p className="text-3xl font-bold">87</p>
                  <p className="text-green-100 text-sm mt-1">Present employees</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Pending Requests Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Pending Requests</h2>
                  </div>
                  <p className="text-3xl font-bold">5</p>
                  <p className="text-orange-100 text-sm mt-1">Awaiting approval</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Modern Employee List Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden min-h-[400px]">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Employee Directory</h1>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm sm:text-base">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">ID</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Name</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Employee Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading employees...</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length > 0 ? (
                  tablePage.map((emp, index) => (
                    <tr key={emp.id || index} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className="font-medium text-gray-700">{emp.id}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{emp.name || 'No Name'}</span>
                          {emp.email && (
                            <span className="text-sm text-gray-500">{emp.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(emp.role).split(' ').slice(2).join(' ')}`}>
                          {emp.role || 'No Role Assigned'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Employees Found</h3>
                          <p className="text-gray-500">Check your database connection or add employees to get started.</p>
                          <button 
                            onClick={fetchData}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setTable((prev) => Math.max(prev - 1, 1))}
              disabled={table === 1}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>{" "}
                </g>
              </svg>
            </button>

            <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
              Page {table} of {Math.ceil(employees.length / tableRow)}
            </span>

            <button
              onClick={() =>
                setTable((prev) =>
                  prev < Math.ceil(employees.length / tableRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={table === Math.ceil(employees.length / tableRow)}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>{" "}
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Modern Payroll Records Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden min-h-[400px]">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Payroll Management</h1>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm sm:text-base">
              <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Employee
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Employee Type
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Salary
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Deductions
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Net Pay
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Period
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading payroll data...</span>
                      </div>
                    </td>
                  </tr>
                ) : payrollPageData.length > 0 ? (
                  payrollPageData.map((pr: any) => (
                    <tr key={pr.id} className="hover:bg-white/80 transition-all duration-200">
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className="font-semibold text-gray-800">{pr.name}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(pr.role).split(' ').slice(2).join(' ')}`}>
                          {pr.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-semibold text-gray-700">
                        ₱{pr.gross?.toLocaleString() || '0'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-semibold text-red-600">
                        ₱{pr.deductions?.toLocaleString() || '0'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-bold text-green-600">
                        ₱{pr.net?.toLocaleString() || '0'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                        {pr.period || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          pr.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : pr.status === "Paid"
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
                    <td colSpan={7} className="text-center py-12">
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
                            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setPayrollPage((prev) => Math.max(prev - 1, 1))}
              disabled={payrollPage === 1}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>

            <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
              Page {payrollPage} of{" "}
              {Math.ceil(payrollRecords.length / payrollRow) || 1}
            </span>

            <button
              onClick={() =>
                setPayrollPage((prev) =>
                  prev < Math.ceil(payrollRecords.length / payrollRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                payrollPage === Math.ceil(payrollRecords.length / payrollRow) ||
                payrollRecords.length === 0
              }
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

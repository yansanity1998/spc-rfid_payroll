// src/components/Accounting/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import supabase from "../../utils/supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
      case "Guard":
        return "from-teal-500 to-teal-600 text-teal-800 bg-teal-100";
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

  // Pie Chart Data - Payroll Status Distribution
  const statusPieData = useMemo(() => ({
    labels: ['Pending', 'Finalized'],
    datasets: [{
      data: [pendingPayrolls, finalizedPayrolls],
      backgroundColor: [
        'rgba(234, 179, 8, 0.8)',    // Yellow for Pending
        'rgba(16, 185, 129, 0.8)'    // Green for Finalized
      ],
      borderColor: [
        'rgba(234, 179, 8, 1)',
        'rgba(16, 185, 129, 1)'
      ],
      borderWidth: 2
    }]
  }), [pendingPayrolls, finalizedPayrolls]);

  // Doughnut Chart Data - Financial Breakdown
  const financialDoughnutData = useMemo(() => ({
    labels: ['Gross Pay', 'Deductions', 'Net Pay'],
    datasets: [{
      data: [totalGrossPay, totalDeductions, totalNetPay],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',    // Green for Gross
        'rgba(239, 68, 68, 0.8)',    // Red for Deductions
        'rgba(147, 51, 234, 0.8)'    // Purple for Net
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(147, 51, 234, 1)'
      ],
      borderWidth: 2
    }]
  }), [totalGrossPay, totalDeductions, totalNetPay]);

  // Bar Chart Data - Payroll by Role
  const rolePayrollData = useMemo(() => {
    const roleStats: { [key: string]: number } = {};
    payrollRecords.forEach(pr => {
      const role = pr.role || 'Unknown';
      roleStats[role] = (roleStats[role] || 0) + (pr.net || 0);
    });

    const roles = Object.keys(roleStats);
    const amounts = Object.values(roleStats);

    return {
      labels: roles,
      datasets: [{
        label: 'Total Net Pay by Role',
        data: amounts,
        backgroundColor: roles.map(role => {
          const colors: { [key: string]: string } = {
            'Administrator': 'rgba(147, 51, 234, 0.8)',
            'HR Personnel': 'rgba(59, 130, 246, 0.8)',
            'Accounting': 'rgba(34, 197, 94, 0.8)',
            'Faculty': 'rgba(239, 68, 68, 0.8)',
            'Staff': 'rgba(249, 115, 22, 0.8)',
            'SA': 'rgba(234, 179, 8, 0.8)',
            'Guard': 'rgba(20, 184, 166, 0.8)'
          };
          return colors[role] || 'rgba(107, 114, 128, 0.8)';
        }),
        borderColor: roles.map(role => {
          const colors: { [key: string]: string } = {
            'Administrator': 'rgba(147, 51, 234, 1)',
            'HR Personnel': 'rgba(59, 130, 246, 1)',
            'Accounting': 'rgba(34, 197, 94, 1)',
            'Faculty': 'rgba(239, 68, 68, 1)',
            'Staff': 'rgba(249, 115, 22, 1)',
            'SA': 'rgba(234, 179, 8, 1)',
            'Guard': 'rgba(20, 184, 166, 1)'
          };
          return colors[role] || 'rgba(107, 114, 128, 1)';
        }),
        borderWidth: 2
      }]
    };
  }, [payrollRecords]);

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

          {/* Interactive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Pie Chart - Payroll Status */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Payroll Status</h2>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Pie data={statusPieData} options={{ maintainAspectRatio: false, responsive: true }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="bg-yellow-50 p-2 rounded-lg">
                  <p className="text-xl font-bold text-yellow-600">{pendingPayrolls}</p>
                  <p className="text-xs text-yellow-700">Pending</p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{finalizedPayrolls}</p>
                  <p className="text-xs text-green-700">Finalized</p>
                </div>
              </div>
            </div>

            {/* Doughnut Chart - Financial Breakdown */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Financial Overview</h2>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Doughnut data={financialDoughnutData} options={{ maintainAspectRatio: false, responsive: true }} />
              </div>
            </div>

            {/* Bar Chart - Payroll by Role */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Pay by Role</h2>
              </div>
              <div className="h-64">
                <Bar data={rolePayrollData} options={{ 
                  maintainAspectRatio: false, 
                  responsive: true,
                  scales: { 
                    y: { 
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '₱' + value.toLocaleString();
                        }
                      }
                    } 
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return context.dataset.label + ': ₱' + context.parsed.y.toLocaleString();
                        }
                      }
                    }
                  }
                }} />
              </div>
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

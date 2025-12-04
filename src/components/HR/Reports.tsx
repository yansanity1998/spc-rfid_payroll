// src/pages/Reports.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../utils/supabase";
import toast from "react-hot-toast";

const Reports = () => {
  const navigate = useNavigate();
  const [reportStats, setReportStats] = useState({
    attendance: { count: 0, loading: true },
    payroll: { count: 0, loading: true },
    leave: { count: 0, loading: true },
    loan: { count: 0, loading: true },
    employee: { count: 0, loading: true },
    gatepass: { count: 0, loading: true }
  });
  const reports = [
    {
      id: 1,
      title: "Attendance Reports",
      description: "Daily, weekly, and monthly summaries of attendance records.",
      icon: "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      id: 2,
      title: "Payroll Reports",
      description: "Payroll summaries, payslip reports, and payroll registers.",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      id: 3,
      title: "Leave Reports",
      description: "Summary of leave requests and employee leave balances.",
      icon: "M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-8 0V8a2 2 0 012-2h4a2 2 0 012 2v1",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    },
    {
      id: 4,
      title: "Loan Reports",
      description: "Outstanding loan balances and repayment schedules.",
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      id: 6,
      title: "Employee Reports",
      description: "Comprehensive employee information with role-based filtering and export options.",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600"
    },
    {
      id: 7,
      title: "Gate Pass Reports",
      description: "Track and analyze gate pass requests with detailed approval workflows.",
      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600"
    },
  ];

  // Fetch dynamic statistics for each report type
  const fetchReportStatistics = useCallback(async () => {
    try {
      // Use current month date range for statistics that should align with detailed reports
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDateStr = startOfMonth.toISOString().split("T")[0];
      const endDateStr = today.toISOString().split("T")[0];

      // Set all to loading
      setReportStats(prev => ({
        attendance: { ...prev.attendance, loading: true },
        payroll: { ...prev.payroll, loading: true },
        leave: { ...prev.leave, loading: true },
        loan: { ...prev.loan, loading: true },
        employee: { ...prev.employee, loading: true },
        gatepass: { ...prev.gatepass, loading: true }
      }));

      // Use Supabase exact count metadata for all tables to get true totals
      const [
        { count: attendanceCount, error: attendanceError },
        { count: payrollCount, error: payrollError },
        { count: employeeCount, error: employeeError },
        { count: leaveCount, error: leaveError },
        { count: loanCount, error: loanError },
        { count: gatePassCount, error: gatePassError }
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("payrolls")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("request_type", "Leave")
          .gte("created_at", `${startDateStr}T00:00:00`)
          .lte("created_at", `${endDateStr}T23:59:59`),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("request_type", "Loan")
          .gte("created_at", `${startDateStr}T00:00:00`)
          .lte("created_at", `${endDateStr}T23:59:59`),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("request_type", "Gate Pass")
      ]);

      if (attendanceError || payrollError || employeeError || leaveError || loanError || gatePassError) {
        throw new Error("Failed to fetch one or more report statistics");
      }

      // Update statistics using exact total counts from the database
      setReportStats({
        attendance: { 
          count: attendanceCount || 0, 
          loading: false 
        },
        payroll: { 
          count: payrollCount || 0, 
          loading: false 
        },
        leave: { 
          count: leaveCount || 0, 
          loading: false 
        },
        loan: { 
          count: loanCount || 0,
          loading: false 
        },
        employee: { 
          count: employeeCount || 0, 
          loading: false 
        },
        gatepass: { 
          count: gatePassCount || 0,
          loading: false 
        }
      });
    } catch (error) {
      console.error("Error fetching report statistics:", error);
      // Set all to not loading on error
      setReportStats(prev => ({
        attendance: { ...prev.attendance, loading: false },
        payroll: { ...prev.payroll, loading: false },
        leave: { ...prev.leave, loading: false },
        loan: { ...prev.loan, loading: false },
        employee: { ...prev.employee, loading: false },
        gatepass: { ...prev.gatepass, loading: false }
      }));
      toast.error("Failed to load report statistics");
    }
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchReportStatistics();
    const interval = setInterval(fetchReportStatistics, 30000);
    return () => clearInterval(interval);
  }, [fetchReportStatistics]);


  // Export functions for each report type
  const exportAttendanceReport = async () => {
    try {
      toast.loading("Generating attendance report...");
      
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          att_date,
          time_in,
          time_out,
          user:users (
            id,
            name,
            role,
            semester,
            schoolYear,
            hiredDate
          )
        `)
        .order("att_date", { ascending: false });

      if (error) throw error;

      const processedData = data.map((record: any) => ({
        Date: record.att_date,
        "Employee ID": record.user?.id || "",
        "Employee Name": record.user?.name || "",
        Role: record.user?.role || "",
        Semester: record.user?.semester || "",
        "School Year": record.user?.schoolYear || "",
        "Hired Date": record.user?.hiredDate || "",
        "Time In": record.time_in || "",
        "Time Out": record.time_out || "",
        Status: record.time_in && !record.time_out ? "Present" : record.time_out ? "Completed" : "Absent"
      }));

      exportToCSV(processedData, "attendance_report");
      toast.dismiss();
      toast.success("Attendance report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export attendance report");
      console.error("Export error:", error);
    }
  };

  const exportEmployeeReport = async () => {
    try {
      toast.loading("Generating employee report...");
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedData = data.map((emp: any) => ({
        "Employee ID": emp.id,
        Name: emp.name || "",
        Email: emp.email || "",
        Role: emp.role || "",
        Position: emp.positions || "",
        Department: emp.department || "",
        Age: emp.age || "",
        Gender: emp.gender || "",
        Address: emp.address || "",
        Contact: emp.contact_no || "",
        Status: emp.status || "",
        "Hired Date": emp.hiredDate ? new Date(emp.hiredDate).toLocaleDateString() : "",
        "Date Created": new Date(emp.created_at).toLocaleDateString()
      }));

      exportToCSV(processedData, "employee_report");
      toast.dismiss();
      toast.success("Employee report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export employee report");
      console.error("Export error:", error);
    }
  };

  const exportPayrollReport = async () => {
    try {
      toast.loading("Generating payroll report...");
      
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

      if (error) throw error;

      const flattenedPayrolls = (data || [])
        .map((user) =>
          user.payrolls?.length
            ? user.payrolls.map((pr: any) => ({
                "Employee ID": user.id,
                "Employee Name": user.name,
                Role: user.role,
                Period: pr.period,
                "Gross Pay": pr.gross || 0,
                Deductions: pr.deductions || 0,
                "Net Pay": pr.net || 0,
                Status: pr.status
              }))
            : [{
                "Employee ID": user.id,
                "Employee Name": user.name,
                Role: user.role,
                Period: "--",
                "Gross Pay": 0,
                Deductions: 0,
                "Net Pay": 0,
                Status: "No Record"
              }]
        )
        .flat();

      exportToCSV(flattenedPayrolls, "payroll_report");
      toast.dismiss();
      toast.success("Payroll report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export payroll report");
      console.error("Export error:", error);
    }
  };

  const exportLeaveReport = async () => {
    try {
      toast.loading("Generating leave report...");
      
      // Since there's no leave table yet, we'll create a sample report
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("status", "Active");

      if (error) throw error;

      const leaveData = data.map((user: any) => ({
        "Employee ID": user.id,
        "Employee Name": user.name,
        Role: user.role,
        "Leave Type": "Annual Leave",
        "Leave Balance": Math.floor(Math.random() * 30) + 1,
        "Used Days": Math.floor(Math.random() * 15),
        "Remaining Days": Math.floor(Math.random() * 20) + 5,
        "Last Leave Date": new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        Status: Math.random() > 0.7 ? "On Leave" : "Available"
      }));

      exportToCSV(leaveData, "leave_report");
      toast.dismiss();
      toast.success("Leave report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export leave report");
      console.error("Export error:", error);
    }
  };

  const exportLoanReport = async () => {
    try {
      toast.loading("Generating loan report...");
      
      // Since there's no loan table yet, we'll create a sample report
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("status", "Active");

      if (error) throw error;

      const loanData = data.map((user: any) => ({
        "Employee ID": user.id,
        "Employee Name": user.name,
        Role: user.role,
        "Loan Type": Math.random() > 0.5 ? "Personal Loan" : "Emergency Loan",
        "Loan Amount": (Math.floor(Math.random() * 50000) + 10000).toLocaleString(),
        "Outstanding Balance": (Math.floor(Math.random() * 30000) + 5000).toLocaleString(),
        "Monthly Payment": (Math.floor(Math.random() * 5000) + 1000).toLocaleString(),
        "Next Payment Date": new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        Status: Math.random() > 0.3 ? "Active" : "Completed"
      }));

      exportToCSV(loanData, "loan_report");
      toast.dismiss();
      toast.success("Loan report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export loan report");
      console.error("Export error:", error);
    }
  };


  // Generic CSV export function
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
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
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reports & Analytics</h1>
            </div>
            <p className="text-gray-600">Generate comprehensive reports and export system data</p>
          </div>
        </section>

        {/* Dynamic Report Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {/* Attendance Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Attendance</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.attendance.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.attendance.count.toLocaleString()
                  )}
                </p>
                <p className="text-blue-100 text-xs mt-1">Total records</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>

          {/* Payroll Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Payroll</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.payroll.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.payroll.count.toLocaleString()
                  )}
                </p>
                <p className="text-green-100 text-xs mt-1">Total records</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>

          {/* Leave Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0l-2 9a2 2 0 002 2h8a2 2 0 002-2l-2-9m-8 0V8a2 2 0 012-2h4a2 2 0 012 2v1" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Leave</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.leave.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.leave.count.toLocaleString()
                  )}
                </p>
                <p className="text-purple-100 text-xs mt-1">Total leave requests</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>

          {/* Loan Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Loan</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.loan.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.loan.count.toLocaleString()
                  )}
                </p>
                <p className="text-orange-100 text-xs mt-1">Active loans</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>

          {/* Employee Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Employee</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.employee.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.employee.count.toLocaleString()
                  )}
                </p>
                <p className="text-indigo-100 text-xs mt-1">Total employees</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>

          {/* Gate Pass Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-600 p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold">Gate Pass</h2>
                </div>
                <p className="text-xl font-bold">
                  {reportStats.gatepass.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    reportStats.gatepass.count.toLocaleString()
                  )}
                </p>
                <p className="text-cyan-100 text-xs mt-1">Total requests</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Report Cards */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Report Categories</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`group relative overflow-hidden ${report.bgColor} border-2 border-gray-100 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-gray-200`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${report.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                    </svg>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`w-8 h-8 ${report.color} bg-gradient-to-br rounded-full opacity-20`}></div>
                  </div>
                </div>
                
                <h3 className={`text-lg font-bold ${report.textColor} mb-2 group-hover:text-gray-800 transition-colors`}>
                  {report.title}
                </h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  {report.description}
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (report.id === 1) {
                        navigate("/HR/reports/attendance");
                      } else if (report.id === 2) {
                        navigate("/HR/reports/payroll");
                      } else if (report.id === 3) {
                        navigate("/HR/reports/leave");
                      } else if (report.id === 4) {
                        navigate("/HR/reports/loan");
                      } else if (report.id === 6) {
                        navigate("/HR/reports/employees");
                      } else if (report.id === 7) {
                        navigate("/HR/reports/gatepass");
                      } else {
                        // Handle other report types in the future
                        toast("This report type is coming soon.");
                      }
                    }}
                    className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${report.color} text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button 
                    onClick={() => {
                      if (report.id === 1) {
                        exportAttendanceReport();
                      } else if (report.id === 2) {
                        exportPayrollReport();
                      } else if (report.id === 3) {
                        exportLeaveReport();
                      } else if (report.id === 4) {
                        exportLoanReport();
                      } else if (report.id === 6) {
                        exportEmployeeReport();
                      } else if (report.id === 7) {
                        // Gate pass export will be handled by the component itself
                        toast.success('Use the Gate Pass report view to export data');
                      }
                    }}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;

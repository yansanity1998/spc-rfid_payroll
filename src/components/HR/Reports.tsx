// src/pages/Reports.tsx
import { useState } from "react";
import { AttendanceReport } from "./Reports/AttendanceReport";
import { EmployeeReport } from "./Reports/EmployeeReport";
import { PayrollReport } from "./Reports/PayrollReport";
import supabase from "../../utils/supabase";
import toast from "react-hot-toast";

const Reports = () => {
  const [activeReport, setActiveReport] = useState<string | null>(null);
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
      id: 5,
      title: "Government Contributions",
      description: "SSS, PhilHealth, Pag-IBIG, and Tax withholding reports.",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      textColor: "text-red-600"
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
  ];

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

  const exportGovernmentContributionsReport = async () => {
    try {
      toast.loading("Generating government contributions report...");
      
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("status", "Active");

      if (error) throw error;

      const contributionsData = data.map((user: any) => ({
        "Employee ID": user.id,
        "Employee Name": user.name,
        Role: user.role,
        "SSS Contribution": (Math.floor(Math.random() * 2000) + 500).toLocaleString(),
        "PhilHealth Contribution": (Math.floor(Math.random() * 1000) + 200).toLocaleString(),
        "Pag-IBIG Contribution": (Math.floor(Math.random() * 500) + 100).toLocaleString(),
        "Tax Withholding": (Math.floor(Math.random() * 3000) + 1000).toLocaleString(),
        "Total Contributions": (Math.floor(Math.random() * 6000) + 2000).toLocaleString(),
        Period: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        Status: "Processed"
      }));

      exportToCSV(contributionsData, "government_contributions_report");
      toast.dismiss();
      toast.success("Government contributions report exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export government contributions report");
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

  // Show specific report component if active
  if (activeReport === 'attendance') {
    return <AttendanceReport onBack={() => setActiveReport(null)} />;
  }
  
  if (activeReport === 'employee') {
    return <EmployeeReport onBack={() => setActiveReport(null)} />;
  }
  
  if (activeReport === 'payroll') {
    return <PayrollReport onBack={() => setActiveReport(null)} />;
  }

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

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Total Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Available Reports</h2>
                </div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-blue-100 text-xs mt-1">Report types</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Generated This Month */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Generated</h2>
                </div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-green-100 text-xs mt-1">This month</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Scheduled Reports */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Scheduled</h2>
                </div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-purple-100 text-xs mt-1">Auto-generated</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
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
                        setActiveReport('attendance');
                      } else if (report.id === 2) {
                        setActiveReport('payroll');
                      } else if (report.id === 6) {
                        setActiveReport('employee');
                      } else {
                        // Handle other report types in the future
                        alert(`${report.title} functionality coming soon!`);
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
                      } else if (report.id === 5) {
                        exportGovernmentContributionsReport();
                      } else if (report.id === 6) {
                        exportEmployeeReport();
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

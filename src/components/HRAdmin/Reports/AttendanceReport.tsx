// src/components/HRAdmin/Reports/AttendanceReport.tsx
import { useEffect, useState } from "react";
import supabase from "../../../utils/supabase";

interface AttendanceRecord {
  id: string;
  att_date: string;
  time_in: string;
  time_out: string;
  user: {
    id: string;
    name: string;
    role: string;
    semester?: number;
    schoolYear?: number;
    hiredDate?: string;
  };
  status: string;
}

export const AttendanceReport = ({ onBack }: { onBack: () => void }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

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

  // Helper function to format time in Philippine timezone
  const formatPhilippineTime = (dateString: string) => {
    // Handle different date string formats from Supabase
    let date: Date;
    
    if (dateString.includes('T')) {
      // ISO format with time
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        // No timezone info, assume UTC (common with Supabase)
        date = new Date(dateString + 'Z');
      } else {
        date = new Date(dateString);
      }
    } else {
      // Date only format, treat as UTC
      date = new Date(dateString + 'T00:00:00Z');
    }
    
    // Convert to Philippine time
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Helper function to format date in Philippine timezone
  const formatPhilippineDate = (dateString: string) => {
    // Handle date-only strings (YYYY-MM-DD format)
    const date = dateString.includes('T') 
      ? new Date(dateString)
      : new Date(dateString + 'T00:00:00Z');
    
    return date.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      let query = supabase
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

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching attendance data:", error);
        setRecords([]);
      } else {
        // Process the data to add status
        const processedData = data.map((record: any) => ({
          ...record,
          status: record.time_in && !record.time_out
            ? "Present"
            : record.time_out
            ? "Completed"
            : record.time_in
            ? "Late"
            : "Absent"
        }));
        setRecords(processedData);
      }
    } catch (error) {
      console.error("Error:", error);
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Filter records based on search
  const filteredRecords = records.filter(record =>
    record.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    record.user?.role?.toLowerCase().includes(search.toLowerCase()) ||
    record.status?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const indexOfLastRecord = currentPage * entriesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - entriesPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / entriesPerPage);

  // Change page
  // const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Role",
      "Semester",
      "School Year",
      "Hired Date",
      "Time In",
      "Time Out",
      "Status"
    ];

    const csvData = filteredRecords.map(record => [
      record.att_date,
      record.user?.id || "",
      record.user?.name || "",
      record.user?.role || "",
      record.user?.semester || "",
      record.user?.schoolYear || "",
      record.user?.hiredDate ? formatPhilippineDate(record.user.hiredDate) : "",
      record.time_in ? formatPhilippineTime(record.time_in) : "",
      record.time_out ? formatPhilippineTime(record.time_out) : "",
      record.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF function
  const exportToPDF = () => {
    // Create PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString();
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter(r => r.status === "Present").length;
    const completedCount = filteredRecords.filter(r => r.status === "Completed").length;
    const absentCount = filteredRecords.filter(r => r.status === "Absent").length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${currentDate}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #dc2626;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            gap: 20px;
          }
          .stat-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e2e8f0;
            flex: 1;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .present { color: #16a34a; }
          .completed { color: #7c3aed; }
          .absent { color: #dc2626; }
          .total { color: #2563eb; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #dc2626;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
          }
          .status-present {
            background-color: #dcfce7;
            color: #166534;
          }
          .status-completed {
            background-color: #ede9fe;
            color: #6b21a8;
          }
          .status-absent {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .status-late {
            background-color: #fef3c7;
            color: #92400e;
          }
          .role-badge {
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: bold;
          }
          .role-administrator { background-color: #f3e8ff; color: #6b21a8; }
          .role-hr { background-color: #dbeafe; color: #1e40af; }
          .role-accounting { background-color: #dcfce7; color: #166534; }
          .role-faculty { background-color: #fee2e2; color: #991b1b; }
          .role-staff { background-color: #fed7aa; color: #c2410c; }
          .role-sa { background-color: #fef3c7; color: #a16207; }
          .role-default { background-color: #f1f5f9; color: #475569; }
          @media print {
            body { margin: 0; }
            .stats { flex-direction: column; }
            .stat-card { margin: 5px 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <p>Generated on: ${currentDate}</p>
          <p>Total Records: ${totalRecords}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number total">${totalRecords}</div>
            <div class="stat-label">Total Records</div>
          </div>
          <div class="stat-card">
            <div class="stat-number present">${presentCount}</div>
            <div class="stat-label">Present</div>
          </div>
          <div class="stat-card">
            <div class="stat-number completed">${completedCount}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number absent">${absentCount}</div>
            <div class="stat-label">Absent</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Role</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map(record => {
              const getRoleClass = (role: string) => {
                switch (role) {
                  case "Administrator": return "role-administrator";
                  case "HR Personnel": return "role-hr";
                  case "Accounting": return "role-accounting";
                  case "Faculty": return "role-faculty";
                  case "Staff": return "role-staff";
                  case "SA": return "role-sa";
                  default: return "role-default";
                }
              };
              
              const getStatusClass = (status: string) => {
                switch (status) {
                  case "Present": return "status-present";
                  case "Completed": return "status-completed";
                  case "Absent": return "status-absent";
                  default: return "status-late";
                }
              };
              
              return `
                <tr>
                  <td>${formatPhilippineDate(record.att_date)}</td>
                  <td>${record.user?.id || ''}</td>
                  <td>${record.user?.name || 'Unknown'}</td>
                  <td><span class="role-badge ${getRoleClass(record.user?.role || '')}">${record.user?.role || 'No Role'}</span></td>
                  <td>${record.time_in ? formatPhilippineTime(record.time_in) : '--'}</td>
                  <td>${record.time_out ? formatPhilippineTime(record.time_out) : '--'}</td>
                  <td><span class="status-badge ${getStatusClass(record.status)}">${record.status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Attendance Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive attendance records with filtering and export options</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </section>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Total Records */}
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
                  <h2 className="text-base font-semibold">Total Records</h2>
                </div>
                <p className="text-2xl font-bold">{filteredRecords.length}</p>
                <p className="text-blue-100 text-xs mt-1">Attendance entries</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Present */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Present</h2>
                </div>
                <p className="text-2xl font-bold">{filteredRecords.filter(r => r.status === "Present").length}</p>
                <p className="text-green-100 text-xs mt-1">Currently at work</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Completed */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Completed</h2>
                </div>
                <p className="text-2xl font-bold">{filteredRecords.filter(r => r.status === "Completed").length}</p>
                <p className="text-purple-100 text-xs mt-1">Finished work day</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Absent */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Absent</h2>
                </div>
                <p className="text-2xl font-bold">{filteredRecords.filter(r => r.status === "Absent").length}</p>
                <p className="text-red-100 text-xs mt-1">Not present</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={exportToCSV}
            disabled={filteredRecords.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            onClick={exportToPDF}
            disabled={filteredRecords.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>

          <button
            onClick={fetchAttendanceData}
            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Modern Attendance Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Attendance Data</h2>
                  <p className="text-sm text-gray-600">
                    Showing {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Role</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time In</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Out</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {formatPhilippineDate(record.att_date)}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{record.user?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">ID: {record.user?.id}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(record.user?.role || '').split(' ').slice(2).join(' ')}`}>
                          {record.user?.role || 'No Role'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {record.time_in ? formatPhilippineTime(record.time_in) : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {record.time_out ? formatPhilippineTime(record.time_out) : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.status === "Present"
                            ? "bg-green-100 text-green-800"
                            : record.status === "Completed"
                            ? "bg-blue-100 text-blue-800"
                            : record.status === "Absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {record.status}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Attendance Records Found</h3>
                          <p className="text-gray-500">Try adjusting your search criteria or date range.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simplified Pagination Controls */}
          {/* Simplified Pagination Controls - Centered */}
          {/* Simplified Pagination Controls - One Horizontal Line */}
          {filteredRecords.length > entriesPerPage && (
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center">
              <div className="flex-1 text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstRecord + 1}</span> to{" "}
                <span className="font-medium">{Math.min(indexOfLastRecord, filteredRecords.length)}</span> of{" "}
                <span className="font-medium">{filteredRecords.length}</span> results
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    title="Previous page"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm">
                    {currentPage}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    title="Next page"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1"></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AttendanceReport;
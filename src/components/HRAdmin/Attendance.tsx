// src/pages/Attendance.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Attendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // 🔍 Search state

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

  const fetchAttendance = async () => {
    setLoading(true);

    // join attendance + user info
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
    *,
    user:users (
      id,
      name,
      role,
      semester,
      schoolYear,
      hiredDate
    )
  `
      )
      .order("att_date", { ascending: false });

    if (error) {
      console.error("Attendance fetch error:", error);
      setRecords([]);
    } else {
      console.log("Raw attendance data:", data);
      // Flatten into single array
      const flat = data.map((row: any) => ({
        id: row.id,
        att_date: row.att_date,
        time_in: row.time_in,
        time_out: row.time_out,
        attendance: row.attendance,
        userId: row.user?.id,
        name: row.user?.name,
        role: row.user?.role,
        semester: row.user?.semester,
        schoolYear: row.user?.schoolYear,
        hiredDate: row.user?.hiredDate,
        status: row.attendance === true
          ? row.time_in && !row.time_out
            ? "Present"
            : row.time_out
              ? "Completed"
              : "Late"
          : row.attendance === false
            ? "Absent"
            : row.time_in || row.time_out
              ? "Present" // Fallback: if there's time data but no attendance field
              : "Absent",
      }));

      console.log("Processed attendance data:", flat);
      setRecords(flat);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // 🔍 Filter logs
  const filtered = records.filter(
    (log) =>
      log.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.role?.toLowerCase().includes(search.toLowerCase()) ||
      log.semester?.toString().includes(search) ||
      log.schoolYear?.toString().includes(search) ||
      log.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Attendance Monitoring</h1>
            </div>
            <p className="text-gray-600">Track employee attendance and working hours</p>
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
                  placeholder="Search by name, role, year, or status..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAttendance}
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
          {/* Present Card */}
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
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Present").length}</p>
                <p className="text-green-100 text-xs mt-1">Currently at work</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Absent Card */}
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
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Absent").length}</p>
                <p className="text-red-100 text-xs mt-1">Not present today</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Completed Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
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
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Completed").length}</p>
                <p className="text-blue-100 text-xs mt-1">Finished work day</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Records Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
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
                <p className="text-2xl font-bold">{filtered.length}</p>
                <p className="text-purple-100 text-xs mt-1">All attendance logs</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Attendance Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Attendance Records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">User ID</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Name</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Semester</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">School Year</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Hired Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time In</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Out</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{log.userId}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{log.name || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(log.role).split(' ').slice(2).join(' ')}`}>
                          {log.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.semester ?? "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.schoolYear ?? "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.hiredDate
                          ? new Date(log.hiredDate).toLocaleDateString()
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.att_date}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_in
                          ? new Date(log.time_in).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_out
                          ? new Date(log.time_out).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.status === "Present"
                            ? "bg-green-100 text-green-800"
                            : log.status === "Completed"
                            ? "bg-blue-100 text-blue-800"
                            : log.status === "Absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Attendance Records Found</h3>
                          <p className="text-gray-500">Check your search criteria or refresh the data.</p>
                          <button 
                            onClick={fetchAttendance}
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

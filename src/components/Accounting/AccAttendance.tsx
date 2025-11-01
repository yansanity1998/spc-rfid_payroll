import { useEffect, useState, useMemo } from "react";
import supabase from "../../utils/supabase";

const AccAttendance = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Helper function to format time in Philippine timezone
  const formatPhilippineTime = (dateString: string) => {
    if (!dateString) return "-";
    
    let date: Date;
    
    if (dateString.includes('T')) {
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        date = new Date(dateString + 'Z');
      } else {
        date = new Date(dateString);
      }
    } else {
      const timeParts = dateString.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      return dateString;
    }
    
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log("No user found in auth");
          setLoading(false);
          return;
        }

        const { data: userData, error: userDataError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (userDataError) {
          console.error("Failed to fetch user data:", userDataError);
          setLoading(false);
          return;
        }

        console.log("Accounting Attendance: Fetching work hours attendance for user:", userData.id);
        
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", userData.id)
          .order("att_date", { ascending: false });

        if (attendanceError) {
          console.error("Accounting Attendance: Error fetching attendance:", attendanceError);
          setAttendance([]);
          setLoading(false);
          return;
        }

        console.log("Accounting Attendance: Raw attendance data:", attendanceData);

        const processedData = (attendanceData || []).map((row: any) => {
          let hoursWorked = 0;
          if (row.time_in && row.time_out) {
            const timeIn = new Date(row.time_in);
            const timeOut = new Date(row.time_out);
            const diffMs = timeOut.getTime() - timeIn.getTime();
            hoursWorked = diffMs / (1000 * 60 * 60);
          }
          
          let status = "Absent";
          if (row.time_in && row.time_out) {
            status = "Completed";
          } else if (row.time_in) {
            status = "Present";
          }
          
          return {
            ...row,
            hours_worked: hoursWorked,
            status: status,
            session: row.notes?.includes("Morning") ? "Morning" : 
                    row.notes?.includes("Afternoon") ? "Afternoon" : "N/A"
          };
        });
        
        setAttendance(processedData);

      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  const filteredAttendance = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    
    return attendance.filter((record) => {
      const searchLower = search.toLowerCase().trim();
      
      const matchesStatus = !statusFilter || record.status === statusFilter;
      
      if (!searchLower) {
        return matchesStatus;
      }
      
      const matchesSearch = 
        (record.att_date && record.att_date.toLowerCase().includes(searchLower)) ||
        (record.status && record.status.toLowerCase().includes(searchLower)) ||
        (record.session && record.session.toLowerCase().includes(searchLower)) ||
        (record.notes && record.notes.toLowerCase().includes(searchLower));
      
      return matchesSearch && matchesStatus;
    });
  }, [attendance, search, statusFilter]);

  const stats = useMemo(() => {
    const totalDays = filteredAttendance.length;
    const presentDays = filteredAttendance.filter((record: any) => 
      record.status === "Present" || record.status === "Completed"
    ).length;
    const absentDays = filteredAttendance.filter((record: any) => 
      record.status === "Absent"
    ).length;
    const totalHours = filteredAttendance.reduce((sum: number, record: any) => 
      sum + (record.hours_worked || 0), 0
    );
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0";
    
    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      attendanceRate
    };
  }, [filteredAttendance]);

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium text-lg">Loading attendance data...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Work Hours Attendance</h1>
                <p className="text-gray-600">Track your daily work hours and attendance records</p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Attendance Rate */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Attendance Rate</h2>
                  </div>
                  <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
                  <p className="text-blue-100 text-sm mt-1">Overall performance</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Total Hours */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Total Hours</h2>
                  </div>
                  <p className="text-3xl font-bold">{stats.totalHours.toFixed(1)}</p>
                  <p className="text-green-100 text-sm mt-1">Hours worked</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Present Days */}
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
                    <h2 className="text-lg font-semibold">Present Days</h2>
                  </div>
                  <p className="text-3xl font-bold">{stats.presentDays}</p>
                  <p className="text-emerald-100 text-sm mt-1">Days attended</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Absent Days */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Absent Days</h2>
                  </div>
                  <p className="text-3xl font-bold">{stats.absentDays}</p>
                  <p className="text-red-100 text-sm mt-1">Days missed</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by date, status, or session..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Completed">Completed</option>
                  <option value="Absent">Absent</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Work Hours Records</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Session</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Time In</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Time Out</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Hours Worked</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/80 transition-all duration-200">
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className="font-semibold text-gray-800">{log.att_date || '-'}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            log.session === "Morning" 
                              ? "bg-amber-100 text-amber-800"
                              : log.session === "Afternoon"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {log.session}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          <span className="font-medium text-green-600">
                            {log.time_in ? formatPhilippineTime(log.time_in) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          <span className="font-medium text-blue-600">
                            {log.time_out ? formatPhilippineTime(log.time_out) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className="font-semibold text-gray-700">
                            {log.hours_worked ? `${log.hours_worked.toFixed(1)}h` : "-"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            log.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : log.status === "Present"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {log.status === "Completed" ? "✅ Completed" : 
                             log.status === "Present" ? "🟢 Present" :
                             "❌ Absent"}
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
                            <p className="text-gray-500">No work hours attendance records match your current search criteria.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AccAttendance;

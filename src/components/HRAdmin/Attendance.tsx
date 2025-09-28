// src/pages/Attendance.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Attendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [scheduleAttendance, setScheduleAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // 🔍 Search state
  const [scheduleSearch, setScheduleSearch] = useState(""); // 🔍 Schedule search state
  const [regularSortBy, setRegularSortBy] = useState("all"); // 📊 Regular attendance sorting
  const [scheduleSortBy, setScheduleSortBy] = useState("all"); // 📊 Schedule attendance sorting
  
  // Pagination states for both tables
  const [regularAttendancePage, setRegularAttendancePage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const regularAttendanceRow = 5;
  const attendanceRow = 5;

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

  // Helper function to format time in Philippine timezone with AM/PM
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return "N/A";
    
    // Handle time string format (HH:MM:SS or HH:MM)
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      // Convert to 12-hour format with AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    return timeString;
  };

  // Helper function to format datetime in Philippine timezone
  const formatPhilippineDateTime = (dateString: string) => {
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

  const fetchAttendance = async () => {
    setLoading(true);

    try {
      // Fetch regular attendance records
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
        );

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

        // Sort by most recent activity (either time_in or time_out, whichever is more recent)
        const sortedFlat = flat.sort((a: any, b: any) => {
          // Get the most recent activity time for each record
          const getLatestActivity = (record: any) => {
            const timeIn = record.time_in ? new Date(record.time_in).getTime() : 0;
            const timeOut = record.time_out ? new Date(record.time_out).getTime() : 0;
            return Math.max(timeIn, timeOut);
          };

          const aLatest = getLatestActivity(a);
          const bLatest = getLatestActivity(b);
          
          // Sort in descending order (most recent first)
          return bLatest - aLatest;
        });

        console.log("Processed attendance data:", sortedFlat);
        setRecords(sortedFlat);
      }

      // Fetch class schedule attendance data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select(`
          id,
          user_id,
          day_of_week,
          start_time,
          end_time,
          subject,
          room,
          notes,
          created_at,
          users (
            id,
            name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error("Error fetching schedules:", schedulesError);
      }

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("class_attendance")
        .select(`
          id,
          user_id,
          schedule_id,
          att_date,
          time_in,
          time_out,
          attendance,
          status,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (attendanceError) {
        console.error("Error fetching schedule attendance:", attendanceError);
      }

      console.log("Fetched schedules:", schedulesData);
      console.log("Fetched attendance records:", attendanceData);

      // Combine schedules with their most recent attendance records
      const combinedScheduleData = (schedulesData || []).map(schedule => {
        // Find the most recent attendance record for this schedule
        const attendanceRecords = (attendanceData || []).filter(att => 
          att.schedule_id === schedule.id
        );
        
        // Sort by date descending to get the most recent record
        const mostRecentRecord = attendanceRecords.sort((a, b) => 
          new Date(b.att_date).getTime() - new Date(a.att_date).getTime()
        )[0];

        // If no attendance record exists, mark as absent
        let attendanceStatus = 'Absent';
        if (!mostRecentRecord) {
          attendanceStatus = 'Absent';
        }

        return {
          ...schedule,
          attendance_record: mostRecentRecord,
          att_date: mostRecentRecord?.att_date || new Date().toISOString().split('T')[0],
          time_in: mostRecentRecord?.time_in || null,
          time_out: mostRecentRecord?.time_out || null,
          attendance: mostRecentRecord?.attendance || attendanceStatus,
          status: mostRecentRecord?.status || false
        };
      });

      setScheduleAttendance(combinedScheduleData || []);
      
    } catch (error) {
      console.error("Error in fetchAttendance:", error);
      setRecords([]);
      setScheduleAttendance([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // 🔍 Filter regular attendance logs (maintain most recent tap sorting)
  const filtered = records
    .filter(
      (log) =>
        log.name?.toLowerCase().includes(search.toLowerCase()) ||
        log.role?.toLowerCase().includes(search.toLowerCase()) ||
        log.semester?.toString().includes(search) ||
        log.schoolYear?.toString().includes(search) ||
        log.status?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((log) => regularSortBy === "all" || log.role === regularSortBy)
    .sort((a, b) => {
      // Sort by most recent activity (who tapped last) - same logic as in fetchAttendance
      const getLatestActivity = (record: any) => {
        const timeIn = record.time_in ? new Date(record.time_in).getTime() : 0;
        const timeOut = record.time_out ? new Date(record.time_out).getTime() : 0;
        return Math.max(timeIn, timeOut);
      };

      const aLatest = getLatestActivity(a);
      const bLatest = getLatestActivity(b);
      
      // Sort in descending order (most recent first)
      return bLatest - aLatest;
    });

  // 🔍 Filter and sort schedule attendance (Faculty and SA only)
  const filteredScheduleAttendance = scheduleAttendance
    .filter((record) => {
      // Only show Faculty and SA roles
      const allowedRoles = ['Faculty', 'SA'];
      return allowedRoles.includes(record.users?.role);
    })
    .filter(
      (record) =>
        record.users?.name?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        record.users?.role?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        record.subject?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        record.room?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        record.day_of_week?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        record.attendance?.toLowerCase().includes(scheduleSearch.toLowerCase())
    )
    .filter((record) => scheduleSortBy === "all" || record.users?.role === scheduleSortBy)
    .sort((a, b) => {
      // Sort by most recent activity (who tapped last) - same logic as regular attendance
      const getLatestActivity = (record: any) => {
        const timeIn = record.time_in ? new Date(record.time_in).getTime() : 0;
        const timeOut = record.time_out ? new Date(record.time_out).getTime() : 0;
        return Math.max(timeIn, timeOut);
      };

      const aLatest = getLatestActivity(a);
      const bLatest = getLatestActivity(b);
      
      // Sort in descending order (most recent first)
      return bLatest - aLatest;
    });

  // Pagination for regular attendance table
  const regularAttendanceLast = regularAttendanceRow * regularAttendancePage;
  const regularAttendanceFirst = regularAttendanceLast - regularAttendanceRow;
  const regularAttendancePageData = filtered.slice(regularAttendanceFirst, regularAttendanceLast);

  // Pagination for class schedule attendance
  const attendanceLast = attendanceRow * attendancePage;
  const attendanceFirst = attendanceLast - attendanceRow;
  const attendancePageData = filteredScheduleAttendance.slice(attendanceFirst, attendanceLast);

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
              
              {/* Role Filter Dropdown */}
              <div className="relative">
                <select
                  value={regularSortBy}
                  onChange={(e) => setRegularSortBy(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="Administrator">Administrator</option>
                  <option value="HR Personnel">HR Personnel</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                  <option value="SA">SA</option>
                  <option value="Guard">Guard</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                <p className="text-2xl font-bold">{records.filter((l) => l.status === "Present").length}</p>
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
                <p className="text-2xl font-bold">{records.filter((l) => l.status === "Absent").length}</p>
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
                <p className="text-2xl font-bold">{records.filter((l) => l.status === "Completed").length}</p>
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
                <p className="text-2xl font-bold">{records.length}</p>
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
                ) : regularAttendancePageData.length > 0 ? (
                  regularAttendancePageData.map((log) => (
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
                          ? formatPhilippineDate(log.hiredDate)
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {formatPhilippineDate(log.att_date)}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_in
                          ? formatPhilippineDateTime(log.time_in)
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_out
                          ? formatPhilippineDateTime(log.time_out)
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
          
          {/* Pagination for Regular Attendance */}
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setRegularAttendancePage((prev) => Math.max(prev - 1, 1))}
              disabled={regularAttendancePage === 1}
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
              Page {regularAttendancePage} of{" "}
              {Math.ceil(filtered.length / regularAttendanceRow) || 1}
            </span>

            <button
              onClick={() =>
                setRegularAttendancePage((prev) =>
                  prev < Math.ceil(filtered.length / regularAttendanceRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                regularAttendancePage === Math.ceil(filtered.length / regularAttendanceRow) ||
                filtered.length === 0
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

        {/* Class Schedule Attendance Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Schedule Present Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Present</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Present").length}</p>
                <p className="text-emerald-100 text-xs mt-1">Attended classes</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Schedule Late Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Late</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Late").length}</p>
                <p className="text-amber-100 text-xs mt-1">Late arrivals</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Schedule Absent Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Absent</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Absent" || !r.attendance_record).length}</p>
                <p className="text-rose-100 text-xs mt-1">Missed classes</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Schedule Records Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Schedules</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.length}</p>
                <p className="text-indigo-100 text-xs mt-1">All class schedules</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Class Schedule Attendance Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Class Schedule Attendance</h2>
            </div>
            
            {/* Schedule Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between mb-4">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                    placeholder="Search by name, role, subject, room..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Role Filter Dropdown for Schedule Attendance */}
                <div className="relative">
                  <select
                    value={scheduleSortBy}
                    onChange={(e) => setScheduleSortBy(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All</option>
                    <option value="Faculty">Faculty</option>
                    <option value="SA">SA</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Role</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Subject</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Schedule</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time In</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Out</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading class schedule attendance...</span>
                      </div>
                    </td>
                  </tr>
                ) : attendancePageData.length > 0 ? (
                  attendancePageData.map((record: any) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{formatPhilippineDate(record.att_date)}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">
                            {record.users?.name || 'No Name'}
                          </span>
                          {record.users?.email && (
                            <span className="text-xs text-gray-500">{record.users.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(record.users?.role || '').split(' ').slice(2).join(' ')}`}>
                          {record.users?.role || 'No Role'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-sm">
                            {record.subject || 'N/A'}
                          </span>
                          {record.room && (
                            <span className="text-xs text-gray-500">Room: {record.room}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 text-sm">
                            {record.day_of_week}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatPhilippineTime(record.start_time)} - {formatPhilippineTime(record.end_time)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-green-600 text-sm">
                          {record.time_in ? new Date(record.time_in).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-blue-600 text-sm">
                          {record.time_out ? new Date(record.time_out).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.attendance === "Present"
                            ? "bg-green-100 text-green-800"
                            : record.attendance === "Late"
                            ? "bg-yellow-100 text-yellow-800"
                            : record.attendance === "Absent"
                            ? "bg-red-100 text-red-800"
                            : record.attendance === "No Record"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {record.attendance === "Present" ? "✅ Present" : 
                           record.attendance === "Late" ? "⏰ Late" :
                           record.attendance === "Absent" ? "❌ Absent" : 
                           record.attendance === "No Record" ? "📋 No Record" :
                           record.attendance || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Class Schedule Attendance Found</h3>
                          <p className="text-gray-500">Faculty and SA users haven't recorded any class attendance yet.</p>
                          <button 
                            onClick={fetchAttendance}
                            className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
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
          
          {/* Pagination for Class Schedule Attendance */}
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setAttendancePage((prev) => Math.max(prev - 1, 1))}
              disabled={attendancePage === 1}
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
              Page {attendancePage} of{" "}
              {Math.ceil(filteredScheduleAttendance.length / attendanceRow) || 1}
            </span>

            <button
              onClick={() =>
                setAttendancePage((prev) =>
                  prev < Math.ceil(filteredScheduleAttendance.length / attendanceRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                attendancePage === Math.ceil(filteredScheduleAttendance.length / attendanceRow) ||
                filteredScheduleAttendance.length === 0
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

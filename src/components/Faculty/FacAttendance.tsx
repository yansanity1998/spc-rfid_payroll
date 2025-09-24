import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PersonalAttendance = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Helper function to format time in Philippine timezone
  const formatPhilippineTime = (dateString: string) => {
    if (!dateString) return "-";
    
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
      // Time only format (HH:MM:SS), treat as Philippine time
      return dateString;
    }
    
    // Convert to Philippine time
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Absent":
        return "bg-red-100 text-red-800";
      case "Late":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

        // Get faculty data first
        const { data: facultyData, error: facultyError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (facultyError) {
          console.error("Failed to fetch faculty data:", facultyError);
          setLoading(false);
          return;
        }

        console.log("Faculty Attendance: Fetching for user:", facultyData.id, user.id);
        
        let attendanceData = null;
        
        // Try user_id first (most likely correct) - same logic as dashboard
        const { data: data1, error: error1 } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id);
        
        console.log("Faculty Attendance: Query with user_id =", user.id, "Results:", data1);
        if (error1) console.log("Faculty Attendance: Error with user_id query:", error1);
        
        if (data1 && data1.length > 0) {
          attendanceData = data1;
        } else {
          // Try with faculty ID from users table
          const { data: data2, error: error2 } = await supabase
            .from("attendance")
            .select("*")
            .eq("user_id", facultyData.id);
          
          console.log("Faculty Attendance: Query with faculty ID =", facultyData.id, "Results:", data2);
          if (error2) console.log("Faculty Attendance: Error with faculty ID query:", error2);
          
          if (data2 && data2.length > 0) {
            attendanceData = data2;
          }
        }

        if (attendanceData && attendanceData.length > 0) {
          // Sort by most recent activity (either time_in or time_out, whichever is more recent)
          const sortedData = attendanceData.sort((a: any, b: any) => {
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

          // Process attendance data with status calculation and hours calculation
          const processedData = sortedData.map((row: any) => {
            // Calculate hours worked
            let hoursWorked = 0;
            if (row.time_in && row.time_out) {
              const timeIn = new Date(row.time_in);
              const timeOut = new Date(row.time_out);
              const diffMs = timeOut.getTime() - timeIn.getTime();
              hoursWorked = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
            }
            
            return {
              ...row,
              hours_worked: hoursWorked,
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
            };
          });
          
          console.log("Faculty Attendance: Processed data:", processedData);
          setAttendance(processedData);
        } else {
          console.log("Faculty Attendance: No attendance data found");
          setAttendance([]);
        }

      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // --- Weekly work hours ---
  const weeklyData: { [key: string]: number } = {};
  attendance.forEach((record) => {
    if (!record.att_date) return;

    const d = new Date(record.att_date);
    const year = d.getFullYear();

    // Week number calculation
    const firstDay = new Date(year, 0, 1);
    const pastDays = Math.floor(
      (d.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

    const label = `Week ${weekNum} - ${year}`;
    // Use the calculated hours_worked from our processing
    weeklyData[label] = (weeklyData[label] || 0) + (record.hours_worked || 0);
  });

  const chartData = {
    labels: Object.keys(weeklyData),
    datasets: [
      {
        label: "Total Hours Worked (per week)",
        data: Object.values(weeklyData),
        backgroundColor: "rgba(220, 38, 38, 0.7)",
        borderColor: "rgba(220, 38, 38, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            weight: 'bold' as const
          },
          color: '#374151'
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          color: '#f3f4f6'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Filter attendance data
  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch = 
      record.att_date?.toLowerCase().includes(search.toLowerCase()) ||
      record.status?.toLowerCase().includes(search.toLowerCase()) ||
      record.remarks?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = !statusFilter || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalDays = attendance.length;
  const presentDays = attendance.filter(record => record.status === "Present" || record.status === "Completed").length;
  const absentDays = attendance.filter(record => record.status === "Absent").length;
  // Use the calculated hours_worked from our processing
  const totalHours = attendance.reduce((sum, record) => sum + (record.hours_worked || 0), 0);
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
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
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Attendance</h1>
                <p className="text-gray-600">Personal attendance records and statistics</p>
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
                  <p className="text-3xl font-bold">{attendanceRate}%</p>
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
                  <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
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
                  <p className="text-3xl font-bold">{presentDays}</p>
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
                  <p className="text-3xl font-bold">{absentDays}</p>
                  <p className="text-red-100 text-sm mt-1">Days missed</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Weekly Work Hours</h2>
              </div>
              <div className="bg-white p-4 rounded-xl" style={{ height: '400px' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by date, status, or remarks..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Completed">Completed</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
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
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Daily Attendance Logs</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Time In</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Time Out</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Hours Worked</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((log, idx) => (
                      <tr key={idx} className="hover:bg-white/80 transition-all duration-200">
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className="font-semibold text-gray-800">{log.att_date || '-'}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {formatPhilippineTime(log.time_in)}
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {formatPhilippineTime(log.time_out)}
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className="font-semibold text-gray-700">
                            {log.hours_worked ? `${log.hours_worked.toFixed(1)}h` : "-"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {log.remarks || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">No Attendance Records Found</h3>
                            <p className="text-gray-500">No records match your current search criteria.</p>
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

export default PersonalAttendance;

import { useEffect, useState, useMemo } from "react";
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

        console.log("Faculty Attendance: Fetching class schedule attendance for user:", facultyData.id);
        
        // First, fetch user's schedules to identify what should have attendance records
        const { data: userSchedules, error: schedulesError } = await supabase
          .from("schedules")
          .select("*")
          .eq("user_id", facultyData.id);

        if (schedulesError) {
          console.error("Faculty Attendance: Error fetching user schedules:", schedulesError);
        }

        console.log("Faculty Attendance: User schedules:", userSchedules);
        
        // Fetch class schedule attendance data with schedule details
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
            notes,
            created_at,
            schedules!inner (
              id,
              subject,
              room,
              day_of_week,
              start_time,
              end_time
            )
          `)
          .eq("user_id", facultyData.id)
          .order("att_date", { ascending: false });

        if (attendanceError) {
          console.error("Faculty Attendance: Error fetching class attendance:", attendanceError);
          setAttendance([]);
          setLoading(false);
          return;
        }

        console.log("Faculty Attendance: Raw class attendance data:", attendanceData);

        // Combine attendance data with schedule data, similar to HR Admin Dashboard
        const combinedData: any[] = [];
        
        if (userSchedules && userSchedules.length > 0) {
          // For each schedule, find corresponding attendance records or mark as absent
          for (const schedule of userSchedules) {
            const scheduleAttendanceRecords = (attendanceData || []).filter(att => 
              att.schedule_id === schedule.id
            );
            
            if (scheduleAttendanceRecords.length > 0) {
              // Process existing attendance records
              scheduleAttendanceRecords.forEach((row: any) => {
                // Calculate hours worked
                let hoursWorked = 0;
                if (row.time_in && row.time_out) {
                  const timeIn = new Date(`1970-01-01T${row.time_in}`);
                  const timeOut = new Date(`1970-01-01T${row.time_out}`);
                  const diffMs = timeOut.getTime() - timeIn.getTime();
                  hoursWorked = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
                }
                
                // Determine status based on attendance field
                let status = "Unknown";
                if (row.attendance === "Present") {
                  status = row.time_in && !row.time_out ? "Present" : row.time_out ? "Completed" : "Present";
                } else if (row.attendance === "Late") {
                  status = "Late";
                } else if (row.attendance === "Absent") {
                  status = "Absent";
                } else {
                  // Fallback logic
                  status = row.time_in || row.time_out ? "Present" : "Absent";
                }
                
                combinedData.push({
                  ...row,
                  hours_worked: hoursWorked,
                  status: status,
                  // Add schedule details for display
                  subject: row.schedules?.subject || schedule.subject || 'N/A',
                  room: row.schedules?.room || schedule.room || 'N/A',
                  day_of_week: row.schedules?.day_of_week || schedule.day_of_week || 'N/A',
                  start_time: row.schedules?.start_time || schedule.start_time || 'N/A',
                  end_time: row.schedules?.end_time || schedule.end_time || 'N/A',
                  // Keep original fields for compatibility
                  remarks: row.notes || ''
                });
              });
            } else {
              // No attendance record for this schedule - create absent record
              const today = new Date();
              
              // Create an absent record for recent dates when this schedule should have had attendance
              const absentRecord = {
                id: `absent-${schedule.id}`,
                user_id: facultyData.id,
                schedule_id: schedule.id,
                att_date: today.toISOString().split('T')[0], // Use today's date as example
                time_in: null,
                time_out: null,
                attendance: "Absent",
                status: false,
                notes: null,
                created_at: new Date().toISOString(),
                hours_worked: 0,
                // Add schedule details for display
                subject: schedule.subject || 'N/A',
                room: schedule.room || 'N/A',
                day_of_week: schedule.day_of_week || 'N/A',
                start_time: schedule.start_time || 'N/A',
                end_time: schedule.end_time || 'N/A',
                remarks: 'No attendance record'
              };
              
              combinedData.push(absentRecord);
            }
          }
        }
        
        // Also include any attendance records that might not have matching schedules
        if (attendanceData && attendanceData.length > 0) {
          attendanceData.forEach((row: any) => {
            // Check if this record is already included via schedule processing
            const alreadyIncluded = combinedData.some(record => 
              record.id === row.id && typeof record.id !== 'string'
            );
            
            if (!alreadyIncluded) {
              // Calculate hours worked
              let hoursWorked = 0;
              if (row.time_in && row.time_out) {
                const timeIn = new Date(`1970-01-01T${row.time_in}`);
                const timeOut = new Date(`1970-01-01T${row.time_out}`);
                const diffMs = timeOut.getTime() - timeIn.getTime();
                hoursWorked = diffMs / (1000 * 60 * 60);
              }
              
              let status = "Unknown";
              if (row.attendance === "Present") {
                status = row.time_in && !row.time_out ? "Present" : row.time_out ? "Completed" : "Present";
              } else if (row.attendance === "Late") {
                status = "Late";
              } else if (row.attendance === "Absent") {
                status = "Absent";
              } else {
                status = row.time_in || row.time_out ? "Present" : "Absent";
              }
              
              combinedData.push({
                ...row,
                hours_worked: hoursWorked,
                status: status,
                subject: row.schedules?.subject || 'N/A',
                room: row.schedules?.room || 'N/A',
                day_of_week: row.schedules?.day_of_week || 'N/A',
                start_time: row.schedules?.start_time || 'N/A',
                end_time: row.schedules?.end_time || 'N/A',
                remarks: row.notes || ''
              });
            }
          });
        }
        
        // Sort by attendance date descending, then by schedule time
        const sortedData = combinedData.sort((a, b) => {
          // Primary sort: by attendance date (most recent first)
          const dateA = new Date(a.att_date || a.created_at);
          const dateB = new Date(b.att_date || b.created_at);
          const dateDiff = dateB.getTime() - dateA.getTime();
          
          if (dateDiff !== 0) {
            return dateDiff;
          }
          
          // Secondary sort: by schedule start time (earliest first for same date)
          const timeA = a.start_time || '00:00:00';
          const timeB = b.start_time || '00:00:00';
          return timeA.localeCompare(timeB);
        });
        
        console.log("Faculty Attendance: Combined attendance data with absent records:", sortedData);
        setAttendance(sortedData);

      } catch (error) {
        console.error("Error fetching class attendance:", error);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);


  // Filter attendance data - Optimized search functionality
  const filteredAttendance = useMemo(() => {
    if (!attendance || attendance.length === 0) return [];
    
    return attendance.filter((record) => {
      const searchLower = search.toLowerCase().trim();
      
      // Status filter check
      const matchesStatus = !statusFilter || 
        record.status === statusFilter || 
        record.attendance === statusFilter;
      
      // If no search term, only apply status filter
      if (!searchLower) {
        return matchesStatus;
      }
      
      // Enhanced search across multiple fields
      const matchesSearch = 
        (record.att_date && record.att_date.toLowerCase().includes(searchLower)) ||
        (record.status && record.status.toLowerCase().includes(searchLower)) ||
        (record.attendance && record.attendance.toLowerCase().includes(searchLower)) ||
        (record.subject && record.subject.toLowerCase().includes(searchLower)) ||
        (record.room && record.room.toLowerCase().includes(searchLower)) ||
        (record.day_of_week && record.day_of_week.toLowerCase().includes(searchLower)) ||
        (record.start_time && record.start_time.toLowerCase().includes(searchLower)) ||
        (record.end_time && record.end_time.toLowerCase().includes(searchLower)) ||
        (record.remarks && record.remarks.toLowerCase().includes(searchLower)) ||
        (record.notes && record.notes.toLowerCase().includes(searchLower));
      
      return matchesSearch && matchesStatus;
    });
  }, [attendance, search, statusFilter]);

  // Calculate dynamic statistics based on filtered data (real-time) - Optimized with useMemo
  const stats = useMemo(() => {
    const totalDays = filteredAttendance.length;
    const presentDays = filteredAttendance.filter((record: any) => 
      record.status === "Present" || record.status === "Completed" || record.attendance === "Present"
    ).length;
    const lateDays = filteredAttendance.filter((record: any) => 
      record.status === "Late" || record.attendance === "Late"
    ).length;
    const absentDays = filteredAttendance.filter((record: any) => 
      record.status === "Absent" || record.attendance === "Absent"
    ).length;
    // Use the calculated hours_worked from our processing
    const totalHours = filteredAttendance.reduce((sum: number, record: any) => sum + (record.hours_worked || 0), 0);
    const attendanceRate = totalDays > 0 ? (((presentDays + lateDays) / totalDays) * 100).toFixed(1) : "0";
    
    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours,
      attendanceRate
    };
  }, [filteredAttendance]);

  // --- Weekly work hours (based on filtered data) - Optimized with useMemo ---
  const { chartData, chartOptions } = useMemo(() => {
    const weeklyData: { [key: string]: number } = {};
    filteredAttendance.forEach((record: any) => {
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

    return { chartData, chartOptions };
  }, [filteredAttendance]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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

            {/* Late Days */}
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
                    <h2 className="text-lg font-semibold">Late Days</h2>
                  </div>
                  <p className="text-3xl font-bold">{stats.lateDays}</p>
                  <p className="text-yellow-100 text-sm mt-1">Days late</p>
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
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by date, status, subject, room, day, or time..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Class Schedule Attendance</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Subject</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Schedule</th>
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
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {log.subject || 'N/A'}
                            </span>
                            {log.room && (
                              <span className="text-sm text-gray-500">Room: {log.room}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">
                              {log.day_of_week || 'N/A'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatPhilippineTime(log.start_time)} - {formatPhilippineTime(log.end_time)}
                            </span>
                          </div>
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
                            log.attendance === "Present"
                              ? "bg-green-100 text-green-800"
                              : log.attendance === "Late"
                              ? "bg-yellow-100 text-yellow-800"
                              : log.attendance === "Absent"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {log.attendance === "Present" ? "✅ Present" : 
                             log.attendance === "Late" ? "⏰ Late" :
                             log.attendance === "Absent" ? "❌ Absent" : 
                             log.attendance || 'Unknown'}
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">No Class Attendance Records Found</h3>
                            <p className="text-gray-500">No class schedule attendance records match your current search criteria.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Section - Moved below the table */}
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
        </section>
      </main>
    </div>
  );
};

export default PersonalAttendance;

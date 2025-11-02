import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Pie, Line, Bar } from 'react-chartjs-2';

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

const FacDashboard = () => {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<string>("Unknown");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [clearanceData, setClearanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick action handlers
  const handleViewAttendance = () => {
    navigate('/Faculty/attendance');
  };

  const handleViewSchedule = () => {
    navigate('/Faculty/schedule');
  };

  const handleSubmitRequest = () => {
    // For now, show an alert - you can replace this with actual request functionality
    alert('Request submission feature coming soon! This will allow you to submit loans, gatepasses, and other requests.');
  };

  const handleProfileSettings = () => {
    alert('Profile Settings: You can update your personal information through the navigation bar profile picture. Click on your profile picture in the top navigation to access settings.');
  };

  const handleViewClearance = () => {
    navigate('/Faculty/clearance');
  };


  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("No session found. Please log in again.");
        setLoading(false);
        return;
      }

      // Fetch faculty data
      const { data: facultyData, error: facultyError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (facultyError) {
        setErrorMsg("Failed to fetch faculty data.");
        console.error(facultyError);
        setLoading(false);
        return;
      }

      setFaculty(facultyData);

      console.log("Dashboard: Fetching class schedule attendance for user:", facultyData.id);
      
      // First, fetch user's schedules to identify what should have attendance records
      const { data: userSchedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("user_id", facultyData.id);

      if (schedulesError) {
        console.error("Dashboard: Error fetching user schedules:", schedulesError);
      }

      console.log("Dashboard: User schedules:", userSchedules);
      
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
        console.error("Dashboard: Error fetching class attendance:", attendanceError);
        setAttendance([]);
      } else {
        console.log("Dashboard: Raw class attendance data:", attendanceData);

        // Combine attendance data with schedule data, similar to Faculty Attendance
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
        
        // Sort by date descending, then by schedule time
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
        
        console.log("Dashboard: Combined attendance data with absent records:", sortedData);
        setAttendance(sortedData);

        // Get today's status
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = sortedData.find(record => record.att_date === today);
        setTodayStatus(todayRecord?.status || todayRecord?.attendance || "No Record");
      }


      // Set schedules data
      if (!schedulesError && userSchedules) {
        setSchedules(userSchedules);
      }

      // Fetch clearance data
      const { data: clearance, error: clearanceError } = await supabase
        .from("clearances")
        .select("*")
        .eq("user_id", facultyData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (clearanceError && clearanceError.code !== 'PGRST116') {
        console.error("Dashboard: Error fetching clearance:", clearanceError);
      } else {
        setClearanceData(clearance || null);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMsg("Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh functionality - refresh every 30 seconds for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[Dashboard] Auto-refreshing data...');
      fetchData();
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Calculate dynamic statistics based on attendance data (real-time)
  const stats = useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalHours: 0,
        attendanceRate: "0"
      };
    }

    const totalDays = attendance.length;
    const presentDays = attendance.filter((record: any) => 
      record.status === "Present" || record.status === "Completed" || record.attendance === "Present"
    ).length;
    const lateDays = attendance.filter((record: any) => 
      record.status === "Late" || record.attendance === "Late"
    ).length;
    const absentDays = attendance.filter((record: any) => 
      record.status === "Absent" || record.attendance === "Absent"
    ).length;
    // Use the calculated hours_worked from our processing
    const totalHours = attendance.reduce((sum: number, record: any) => sum + (record.hours_worked || 0), 0);
    const attendanceRate = totalDays > 0 ? (((presentDays + lateDays) / totalDays) * 100).toFixed(1) : "0";
    
    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours,
      attendanceRate
    };
  }, [attendance]);

  // Pie Chart Data - Attendance Distribution
  const pieChartData = useMemo(() => ({
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [stats.presentDays, stats.lateDays, stats.absentDays],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // Green for Present
        'rgba(234, 179, 8, 0.8)',    // Yellow for Late
        'rgba(239, 68, 68, 0.8)'     // Red for Absent
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 2
    }]
  }), [stats]);

  // Line Chart Data - Attendance Trend
  const lineChartData = useMemo(() => {
    const sortedData = [...attendance].sort((a, b) => 
      new Date(a.att_date || a.created_at).getTime() - new Date(b.att_date || b.created_at).getTime()
    );
    
    return {
      labels: sortedData.map(d => new Date(d.att_date || d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Attendance Trend',
        data: sortedData.map(d => {
          const status = d.status || d.attendance;
          if (status === 'Present' || status === 'Completed') return 100;
          if (status === 'Late') return 75;
          return 0;
        }),
        borderColor: 'rgba(220, 38, 38, 1)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }, [attendance]);

  // Bar Chart Data - Status Comparison
  const barChartData = useMemo(() => ({
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      label: 'Days Count',
      data: [stats.presentDays, stats.lateDays, stats.absentDays],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(234, 179, 8, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 2
    }]
  }), [stats]);

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium text-lg">Loading dashboard data...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Error Loading Dashboard</h3>
              <p className="text-red-600 mb-4">{errorMsg}</p>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
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
          {/* Modern Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome, {faculty?.name}</h1>
                <p className="text-gray-600">Faculty Dashboard - {faculty?.role}</p>
              </div>
            </div>
          </div>


          {/* Today's Status Card */}
          <div className="mb-6">
            <div className={`group relative overflow-hidden p-6 rounded-2xl shadow-xl ${
              todayStatus === "Present" || todayStatus === "Completed"
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : todayStatus === "Absent"
                  ? "bg-gradient-to-br from-red-500 to-red-600"
                  : todayStatus === "Late"
                    ? "bg-gradient-to-br from-yellow-500 to-yellow-600"
                    : "bg-gradient-to-br from-gray-500 to-gray-600"
            }`}>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold">Today's Status</h2>
                  </div>
                  <p className="text-4xl font-bold mb-2">{todayStatus}</p>
                  <p className="text-white/80 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-white/30">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Attendance Rate</p>
                  <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Total Hours</p>
                  <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Present</p>
                  <p className="text-2xl font-bold">{stats.presentDays}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Late</p>
                  <p className="text-2xl font-bold">{stats.lateDays}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Absent</p>
                  <p className="text-2xl font-bold">{stats.absentDays}</p>
                </div>
                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Interactive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart - Attendance Distribution */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Attendance Distribution</h2>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Pie data={pieChartData} options={{ maintainAspectRatio: false, responsive: true }} />
              </div>
            </div>

            {/* Bar Chart - Status Comparison */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Status Comparison</h2>
              </div>
              <div className="h-64">
                <Bar data={barChartData} options={{ maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true } } }} />
              </div>
            </div>
          </div>

          {/* Line Chart - Attendance Trend (Full Width) */}
          <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Attendance Trend</h2>
            </div>
            <div className="h-72">
              <Line data={lineChartData} options={{ maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* View Attendance */}
                <div 
                  onClick={handleViewAttendance}
                  className="group bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">View Attendance</h3>
                      <p className="text-xs text-blue-600 font-medium">{stats.totalDays} record{stats.totalDays !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Check your class attendance records and work hours</p>
                </div>

                {/* View Clearance */}
                <div 
                  onClick={handleViewClearance}
                  className="group bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 hover:border-emerald-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">My Clearance</h3>
                      <p className={`text-xs font-medium ${
                        clearanceData?.clearance_status?.toLowerCase() === 'cleared' 
                          ? 'text-green-600' 
                          : clearanceData?.clearance_status?.toLowerCase() === 'on-hold' || clearanceData?.clearance_status?.toLowerCase() === 'on hold'
                            ? 'text-orange-600'
                            : 'text-yellow-600'
                      }`}>
                        {clearanceData?.clearance_status || 'Pending'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">View your clearance status and details</p>
                </div>

                {/* Submit Request */}
                <div 
                  onClick={handleSubmitRequest}
                  className="group bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 hover:border-green-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Submit Request</h3>
                      <p className="text-xs text-green-600 font-medium">Coming Soon</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Request loans, gatepasses, or other services</p>
                </div>

                {/* View Schedule */}
                <div 
                  onClick={handleViewSchedule}
                  className="group bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 hover:border-red-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">My Schedule</h3>
                      <p className="text-xs text-red-600 font-medium">{schedules?.length || 0} schedule{schedules?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">View your weekly schedule and upcoming classes</p>
                </div>

                {/* Profile Settings */}
                <div 
                  onClick={handleProfileSettings}
                  className="group bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200 hover:border-purple-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">Profile Settings</h3>
                      <p className="text-xs text-purple-600 font-medium">Update Info</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">Update your personal information and preferences</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FacDashboard;

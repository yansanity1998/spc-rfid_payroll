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

const StaffDashboard = () => {
  const [staffPersonnel, setStaffPersonnel] = useState<{
    id: number;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<{
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: string;
  } | null>(null);
  const [todayStatus, setTodayStatus] = useState<string>("Unknown");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<Array<{
    date: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("No session found. Please log in again.");
        setLoading(false);
        return;
      }

      // Fetch staff personnel data
      const { data: staffData, error: staffError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (staffError) {
        console.error("Error fetching staff data:", staffError);
        setErrorMsg("Error fetching staff data");
        setLoading(false);
        return;
      }

      setStaffPersonnel(staffData);

      // Fetch attendance stats for current staff personnel
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", staffData.id)
        .eq("att_date", today)
        .single();

      if (attendanceError && attendanceError.code !== 'PGRST116') {
        console.error("Error fetching attendance:", attendanceError);
      } else if (attendanceData) {
        const status = attendanceData.attendance === true
          ? attendanceData.time_in && !attendanceData.time_out
            ? "Present"
            : attendanceData.time_out
              ? "Present"
              : "Late"
          : attendanceData.attendance === false
            ? "Absent"
            : attendanceData.time_in || attendanceData.time_out
              ? "Present"
              : "Unknown";
        setTodayStatus(status);
      }

      // Fetch attendance statistics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: statsData, error: statsError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", staffData.id)
        .gte("att_date", thirtyDaysAgo.toISOString().split('T')[0]);

      if (statsError) {
        console.error("Error fetching attendance stats:", statsError);
      } else {
        const recordsWithStatus = statsData.map(record => {
          const status = record.attendance === true
            ? record.time_in && !record.time_out
              ? "Present"
              : record.time_out
                ? "Present"
                : "Late"
            : record.attendance === false
              ? "Absent"
              : record.time_in || record.time_out
                ? "Present"
                : "Absent";
          return { ...record, status, date: record.att_date };
        });
        
        const present = recordsWithStatus.filter(record => record.status === "Present").length;
        const absent = recordsWithStatus.filter(record => record.status === "Absent").length;
        const late = recordsWithStatus.filter(record => record.status === "Late").length;
        
        setAttendanceStats({
          present,
          absent,
          late,
          total: recordsWithStatus.length,
          attendanceRate: recordsWithStatus.length > 0 ? ((present + late) / recordsWithStatus.length * 100).toFixed(1) : "0"
        });
        
        setDailyAttendance(recordsWithStatus.map(r => ({ date: r.date, status: r.status })));
      }

      // Fetch schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("user_id", staffData.id)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error("Error fetching schedules:", schedulesError);
      } else {
        setSchedules(schedulesData || []);
      }

    } catch (error) {
      console.error("Unexpected error:", error);
      setErrorMsg("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pie Chart Data - Attendance Distribution
  const pieChartData = useMemo(() => ({
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [
        attendanceStats?.present || 0,
        attendanceStats?.late || 0,
        attendanceStats?.absent || 0
      ],
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
  }), [attendanceStats]);

  // Line Chart Data - Attendance Trend
  const lineChartData = useMemo(() => {
    const sortedData = [...dailyAttendance].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return {
      labels: sortedData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Attendance Trend',
        data: sortedData.map(d => {
          if (d.status === 'Present') return 100;
          if (d.status === 'Late') return 75;
          return 0;
        }),
        borderColor: 'rgba(249, 115, 22, 1)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }, [dailyAttendance]);

  // Bar Chart Data - Status Comparison
  const barChartData = useMemo(() => {
    const weeklyData = { Present: 0, Late: 0, Absent: 0 };
    dailyAttendance.forEach(d => {
      if (d.status in weeklyData) {
        weeklyData[d.status as keyof typeof weeklyData]++;
      }
    });

    return {
      labels: ['Present', 'Late', 'Absent'],
      datasets: [{
        label: 'Days Count',
        data: [weeklyData.Present, weeklyData.Late, weeklyData.Absent],
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
    };
  }, [dailyAttendance]);

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-orange-700 font-medium">Loading Staff Dashboard...</p>
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
              <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
                {errorMsg}
              </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Staff Dashboard</h1>
            <p className="text-gray-600">Welcome back, {staffPersonnel?.name || 'Staff Personnel'}</p>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Today's Status</p>
                  <p className="text-2xl font-bold">{todayStatus}</p>
                </div>
                <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Attendance Rate</p>
                  <p className="text-2xl font-bold">{attendanceStats?.attendanceRate || "0"}%</p>
                </div>
                <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">My Schedules</p>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                </div>
                <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Interactive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart - Attendance Distribution */}
            <div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
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
              <h2 className="text-lg font-bold text-gray-800">Attendance Trend (Last 30 Days)</h2>
            </div>
            <div className="h-72">
              <Line data={lineChartData} options={{ maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffDashboard;

// src/components/SA/SADashboard.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const SADashboard = () => {
  const [saPersonnel, setSAPersonnel] = useState<{
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
  const [requests, setRequests] = useState<Array<{
    id: number;
    request_type: string;
    status: string;
    created_at: string;
  }>>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [students, setStudents] = useState<Array<{
    id: number;
    name: string;
    course: string;
    year_level: string;
  }>>([]);
  const [events, setEvents] = useState<Array<{
    id: number;
    title: string;
    description?: string;
    event_date: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Removed unused getEmployeeTypeColor function

  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("No session found. Please log in again.");
        setLoading(false);
        return;
      }

      // Fetch SA personnel data
      const { data: saData, error: saError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (saError) {
        console.error("Error fetching SA data:", saError);
        setErrorMsg("Error fetching SA data");
        setLoading(false);
        return;
      }

      setSAPersonnel(saData);

      // Fetch attendance stats for current SA personnel
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", saData.id)
        .eq("att_date", today) // Use correct field name
        .single();

      if (attendanceError && attendanceError.code !== 'PGRST116') {
        console.error("Error fetching attendance:", attendanceError);
      } else if (attendanceData) {
        // Calculate status from attendance data
        const status = attendanceData.attendance === true
          ? attendanceData.time_in && !attendanceData.time_out
            ? "Present"
            : attendanceData.time_out
              ? "Present" // Completed day
              : "Late"
          : attendanceData.attendance === false
            ? "Absent"
            : attendanceData.time_in || attendanceData.time_out
              ? "Present" // Fallback
              : "Unknown";
        setTodayStatus(status);
      }

      // Fetch attendance statistics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: statsData, error: statsError } = await supabase
        .from("attendance")
        .select("*") // Get all fields to calculate status
        .eq("user_id", saData.id)
        .gte("att_date", thirtyDaysAgo.toISOString().split('T')[0]); // Use correct field name

      if (statsError) {
        console.error("Error fetching attendance stats:", statsError);
      } else {
        // Calculate status for each record
        const recordsWithStatus = statsData.map(record => {
          const status = record.attendance === true
            ? record.time_in && !record.time_out
              ? "Present"
              : record.time_out
                ? "Present" // Completed day
                : "Late"
            : record.attendance === false
              ? "Absent"
              : record.time_in || record.time_out
                ? "Present" // Fallback
                : "Absent";
          return { ...record, status };
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
      }

      // Fetch recent requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select("*")
        .eq("user_id", saData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
      } else {
        setRequests(requestsData || []);
      }

      // Fetch schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("user_id", saData.id)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error("Error fetching schedules:", schedulesError);
      } else {
        setSchedules(schedulesData || []);
      }

      // Fetch students count (for SA overview)
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, course, year_level")
        .limit(5);

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      } else {
        setStudents(studentsData || []);
      }

      // Fetch upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString().split('T')[0])
        .order("event_date", { ascending: true })
        .limit(3);

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
      } else {
        setEvents(eventsData || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "text-green-800 bg-green-100";
      case "Absent":
        return "text-red-800 bg-red-100";
      case "Late":
        return "text-yellow-800 bg-yellow-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "text-green-800 bg-green-100";
      case "Rejected":
        return "text-red-800 bg-red-100";
      case "Pending":
        return "text-yellow-800 bg-yellow-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-red-700 font-medium">Loading SA Dashboard...</p>
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
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Student Affairs Dashboard</h1>
          <p className="text-gray-600">Welcome back, {saPersonnel?.name || 'SA Personnel'}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Today's Status */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Status</p>
                <p className={`text-2xl font-bold mt-1 px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(todayStatus)}`}>
                  {todayStatus}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {attendanceStats?.attendanceRate || "0"}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{events.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* My Schedule */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Schedule</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{schedules.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Requests */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Requests</h3>
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{request.request_type}</p>
                      <p className="text-sm text-gray-600">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRequestStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent requests</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <p className="text-sm text-yellow-600 mt-2">
                      📅 {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>

        {/* Attendance Summary */}
        {attendanceStats && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Attendance Summary (Last 30 Days)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-sm text-green-700">Present</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
                <p className="text-sm text-yellow-700">Late</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                <p className="text-sm text-red-700">Absent</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{attendanceStats.total}</p>
                <p className="text-sm text-blue-700">Total Days</p>
              </div>
            </div>
          </div>
        )}
        </section>
      </main>
    </div>
  );
};

export default SADashboard;

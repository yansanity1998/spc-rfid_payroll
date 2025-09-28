// src/components/SA/SADashboard.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { SANav } from "./SANav";

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
  const [ , setStudents] = useState<Array<{
    id: number;
    name: string;
    course: string;
    year_level: string;
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
        <SANav />
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-4 text-yellow-700 font-medium">Loading SA Dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <SANav />
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
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
      <SANav />
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          {/* Modern Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Student Affairs Dashboard</h1>
            <p className="text-gray-600">Welcome back, {saPersonnel?.name || 'SA Personnel'}</p>
          </div>

          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Today's Status Card */}
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
                    <h2 className="text-lg font-semibold">Today's Status</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{todayStatus}</p>
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </div>
                  <p className="text-yellow-100 text-sm mt-1">Current status</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* Attendance Rate Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{attendanceStats?.attendanceRate || "0"}%</p>
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </div>
                  <p className="text-green-100 text-sm mt-1">Last 30 days</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>

            {/* My Schedule Card */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">My Schedule</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{schedules.length}</p>
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                  </div>
                  <p className="text-blue-100 text-sm mt-1">Active schedules</p>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Recent Requests Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden min-h-[400px]">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2H11a2 2 0 01-2-2V5z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Recent Requests</h1>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm sm:text-base">
              <thead className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Request Type</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Date</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : requests.length > 0 ? (
                  requests.map((request, index) => (
                    <tr key={index} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className="font-medium text-gray-700">{request.request_type}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className="text-gray-600">{new Date(request.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getRequestStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2H11a2 2 0 01-2-2V5z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Recent Requests</h3>
                          <p className="text-gray-500">You haven't made any requests recently.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Summary */}
        {attendanceStats && (
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-800">Attendance Summary (Last 30 Days)</h1>
              </div>
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
          </div>
        )}
      </main>
    </div>
  );
};

export default SADashboard;

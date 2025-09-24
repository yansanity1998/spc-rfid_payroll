// src/components/SA/SAAttendance.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const SAAttendance = () => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No authenticated user found");
        return null;
      }

      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user data:", fetchError);
        return null;
      }

      return userData;
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return null;
    }
  };

  const fetchAttendanceData = async (userId: number) => {
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0])
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching attendance:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in fetchAttendanceData:", error);
      return [];
    }
  };

  const fetchTodayAttendance = async (userId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching today's attendance:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in fetchTodayAttendance:", error);
      return null;
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];

      // Determine status based on time (assuming 8:00 AM is the standard time)
      const checkInTime = new Date(`${today}T${currentTime}`);
      const standardTime = new Date(`${today}T08:00:00`);
      const status = checkInTime > standardTime ? "Late" : "Present";

      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            user_id: currentUser.id,
            date: today,
            check_in_time: currentTime,
            status: status,
            created_at: now.toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Error checking in:", error);
        alert("Error checking in. Please try again.");
        return;
      }

      setTodayAttendance(data);
      setCanCheckIn(false);
      setCanCheckOut(true);
      alert(`Successfully checked in at ${currentTime} - Status: ${status}`);
      
      // Refresh attendance data
      const updatedData = await fetchAttendanceData(currentUser.id);
      setAttendanceData(updatedData);
    } catch (error) {
      console.error("Error in handleCheckIn:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser || !todayAttendance) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out_time: currentTime,
          updated_at: now.toISOString()
        })
        .eq("id", todayAttendance.id)
        .select()
        .single();

      if (error) {
        console.error("Error checking out:", error);
        alert("Error checking out. Please try again.");
        return;
      }

      setTodayAttendance(data);
      setCanCheckOut(false);
      alert(`Successfully checked out at ${currentTime}`);
      
      // Refresh attendance data
      const updatedData = await fetchAttendanceData(currentUser.id);
      setAttendanceData(updatedData);
    } catch (error) {
      console.error("Error in handleCheckOut:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    const userData = await fetchUserData();
    if (!userData) {
      setLoading(false);
      return;
    }
    
    setCurrentUser(userData);
    
    const [attendanceData, todayData] = await Promise.all([
      fetchAttendanceData(userData.id),
      fetchTodayAttendance(userData.id)
    ]);
    
    setAttendanceData(attendanceData);
    setTodayAttendance(todayData);
    
    // Set check-in/out availability
    if (todayData) {
      setCanCheckIn(false);
      setCanCheckOut(!todayData.check_out_time);
    } else {
      setCanCheckIn(true);
      setCanCheckOut(false);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-800";
      case "Absent":
        return "bg-red-100 text-red-800";
      case "Late":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateStats = () => {
    const present = attendanceData.filter(record => record.status === "Present").length;
    const absent = attendanceData.filter(record => record.status === "Absent").length;
    const late = attendanceData.filter(record => record.status === "Late").length;
    const total = attendanceData.length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : "0";

    return { present, absent, late, total, attendanceRate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-red-700 font-medium">Loading attendance data...</p>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SA Attendance</h1>
          <p className="text-gray-600">Track and manage your attendance records</p>
        </div>

        {/* Check In/Out Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Today's Attendance</h2>
          
          {todayAttendance ? (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todayAttendance.status)}`}>
                    {todayAttendance.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check In</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {todayAttendance.check_in_time || "Not checked in"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check Out</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {todayAttendance.check_out_time || "Not checked out"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">No attendance record for today</p>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleCheckIn}
              disabled={!canCheckIn}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                canCheckIn
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Check In
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!canCheckOut}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                canCheckOut
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Check Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Attendance Records</h2>
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {attendanceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_in_time || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.check_out_time || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
              <p className="mt-1 text-sm text-gray-500">
                No attendance records found for {months[selectedMonth]} {selectedYear}
              </p>
            </div>
          )}
        </div>
        </section>
      </main>
    </div>
  );
};

export default SAAttendance;

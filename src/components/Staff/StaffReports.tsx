// src/components/Staff/StaffReports.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
// Chart imports removed as we're not using charts in this simplified version

const StaffReports = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reportData, setReportData] = useState<{
    totalAttendance: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    attendanceByMonth: Array<{ month: string; present: number; late: number; absent: number }>;
    attendanceRate: number;
    totalWorkingDays: number;
  }>({
    totalAttendance: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendanceByMonth: [],
    attendanceRate: 0,
    totalWorkingDays: 0
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user from database
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setCurrentUser(userData);
          fetchReportData(userData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchReportData = async (userId: number) => {
    try {
      setLoading(true);

      // Get current year for filtering
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      // Fetch attendance data for current user
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("att_date, time_in, time_out, status")
        .eq("user_id", userId)
        .gte("att_date", startOfYear)
        .lte("att_date", endOfYear)
        .order("att_date", { ascending: true });

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        setLoading(false);
        return;
      }

      // Process attendance data
      const totalAttendance = attendance?.length || 0;
      
      // Determine status for each record
      const processedAttendance = attendance?.map(record => {
        let status = 'absent';
        if (record.time_in) {
          const timeIn = new Date(`2000-01-01T${record.time_in}`);
          const morningStart = new Date(`2000-01-01T07:00:00`);
          const afternoonStart = new Date(`2000-01-01T13:00:00`);
          
          if (timeIn > morningStart && timeIn <= afternoonStart) {
            status = 'late';
          } else if (timeIn <= morningStart || (timeIn > afternoonStart && timeIn <= new Date(`2000-01-01T19:00:00`))) {
            status = 'present';
          } else {
            status = 'late';
          }
        }
        return { ...record, calculatedStatus: status };
      }) || [];

      const presentDays = processedAttendance.filter(record => record.calculatedStatus === 'present').length;
      const lateDays = processedAttendance.filter(record => record.calculatedStatus === 'late').length;
      const absentDays = processedAttendance.filter(record => record.calculatedStatus === 'absent').length;

      // Calculate attendance rate
      const totalWorkingDays = totalAttendance;
      const attendanceRate = totalWorkingDays > 0 ? ((presentDays + lateDays) / totalWorkingDays * 100) : 0;

      // Group by month
      const monthlyData: Record<string, { present: number; late: number; absent: number }> = {};
      
      processedAttendance.forEach(record => {
        const date = new Date(record.att_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { present: 0, late: 0, absent: 0 };
        }
        
        monthlyData[monthKey][record.calculatedStatus as keyof typeof monthlyData[string]]++;
      });

      const attendanceByMonth = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }));

      setReportData({
        totalAttendance,
        presentDays,
        lateDays,
        absentDays,
        attendanceByMonth,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalWorkingDays
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations removed - using simple cards instead

  if (loading) {
    return (
      <div className="flex-1 lg:ml-70 p-4 lg:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-70 p-4 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Reports & Analytics</h1>
                <p className="text-red-100">
                  {currentUser ? `${currentUser.name} - Personal Attendance Report` : "Loading user information..."}
                </p>
              </div>
              <div className="text-right">
                <div className="text-red-100 text-sm">Attendance Rate</div>
                <div className="text-3xl font-bold">{reportData.attendanceRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Days</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.totalAttendance}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Present Days</p>
                <p className="text-2xl font-bold text-green-600">{reportData.presentDays}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Late Days</p>
                <p className="text-3xl font-bold text-red-600">{reportData.lateDays}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Absent Days</p>
                <p className="text-2xl font-bold text-red-600">{reportData.absentDays}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Performance Metrics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">{reportData.attendanceRate}%</div>
              <div className="text-sm text-green-700 font-medium">Attendance Rate</div>
              <div className="text-xs text-green-600 mt-1">
                {reportData.attendanceRate >= 95 ? 'Excellent' : 
                 reportData.attendanceRate >= 90 ? 'Good' : 
                 reportData.attendanceRate >= 80 ? 'Fair' : 'Needs Improvement'}
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {reportData.presentDays + reportData.lateDays}
              </div>
              <div className="text-sm text-blue-700 font-medium">Working Days</div>
              <div className="text-xs text-blue-600 mt-1">Out of {reportData.totalWorkingDays} total</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {reportData.lateDays > 0 ? Math.round((reportData.lateDays / reportData.totalWorkingDays) * 100) : 0}%
              </div>
              <div className="text-sm text-red-700 font-medium">Late Rate</div>
              <div className="text-xs text-red-600 mt-1">
                {reportData.lateDays === 0 ? 'Perfect' : 
                 reportData.lateDays <= 2 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffReports;

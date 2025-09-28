// src/components/SA/SAAttendance.tsx
import { useEffect, useState, useCallback } from "react";
import supabase from "../../utils/supabase";

interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
}

const SAAttendance = () => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Notification helper
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Helper function to format time in Philippine timezone with AM/PM
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return "N/A";
    
    try {
      let date;
      
      if (timeString.includes('T')) {
        // Full ISO string format
        date = new Date(timeString);
      } else if (timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        // Time only format (HH:MM or HH:MM:SS) - treat as Philippine time for today  
        const today = new Date().toISOString().split('T')[0];
        date = new Date(`${today}T${timeString}`);
      } else {
        // Try to parse as-is
        date = new Date(timeString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return timeString;
      }
      
      // Convert to Philippine time with AM/PM format
      return date.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return timeString;
    }
  };

  // Helper function to format date
  const formatPhilippineDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    try {
      const date = dateString.includes('T') 
        ? new Date(dateString)
        : new Date(dateString + 'T00:00:00');
      
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };


  // Use all attendance data since filters are removed
  const filteredAttendanceData = attendanceData;

  // Get date range for data fetching (month only)
  const getDateRange = useCallback(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    return { startDate, endDate };
  }, [selectedMonth, selectedYear]);



  const fetchUserData = async () => {
    try {
      console.log("🔍 SA Attendance: Starting user data fetch...");
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ No authenticated user found:", userError);
        showNotification('error', 'Authentication failed. Please log in again.');
        return null;
      }

      console.log("✅ Auth user found:", { id: user.id, email: user.email });

      // Enhanced SA user detection with multiple strategies
      let userData = null;
      
      // Strategy 1: Try to find user in users table by auth_id
      console.log("🔍 Strategy 1: Finding user by auth_id...");
      let { data: userByAuthId, error: authIdError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (userByAuthId && !authIdError) {
        console.log("✅ User found by auth_id:", userByAuthId);
        userData = userByAuthId;
      } else {
        console.log("⚠️ User not found by auth_id, trying email lookup...");
        
        // Strategy 2: Try to find user by email
        const { data: userByEmail, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (userByEmail && !emailError) {
          console.log("✅ User found by email:", userByEmail);
          
          // Fix auth_id mismatch if needed
          if (userByEmail.auth_id !== user.id) {
            console.log("🔧 Fixing auth_id mismatch...");
            const { data: updatedUser, error: updateError } = await supabase
              .from("users")
              .update({ auth_id: user.id })
              .eq("id", userByEmail.id)
              .select()
              .single();

            if (updateError) {
              console.error("❌ Failed to fix auth_id:", updateError);
              userData = userByEmail; // Use original data even if update failed
            } else {
              console.log("✅ Auth_id fixed successfully");
              userData = updatedUser;
            }
          } else {
            userData = userByEmail;
          }
        } else {
          console.log("⚠️ User not found by email, trying SA role lookup...");
          
          // Strategy 3: Look for SA role and assume single SA user
          const { data: saRole, error: roleError } = await supabase
            .from("roles")
            .select("*")
            .eq("role", "SA")
            .single();

          if (saRole && !roleError) {
            console.log("✅ SA role found, looking for SA users...");
            
            // Find all SA users
            const { data: saUsers, error: saUsersError } = await supabase
              .from("users")
              .select("*")
              .eq("role", "SA");
              
            if (saUsersError) {
              console.error("❌ Error fetching SA users:", saUsersError);
            }

            if (saUsers && saUsers.length > 0) {
              console.log("✅ SA users found:", saUsers.length);
              
              // If only one SA user, use it
              if (saUsers.length === 1) {
                console.log("✅ Single SA user found, using it");
                userData = saUsers[0];
                
                // Update auth_id for future logins
                const { error: updateError } = await supabase
                  .from("users")
                  .update({ auth_id: user.id })
                  .eq("id", userData.id);
                  
                if (updateError) {
                  console.warn("⚠️ Could not update auth_id:", updateError);
                }
              } else {
                console.log("⚠️ Multiple SA users found, cannot determine which one");
                showNotification('error', 'Multiple SA accounts found. Contact administrator.');
                return null;
              }
            }
          }
        }
      }

      if (!userData) {
        console.error("❌ No user data found after all strategies");
        showNotification('error', 'SA user account not found. Contact administrator.');
        return null;
      }

      // Verify this is an SA user
      if (userData.role !== 'SA') {
        console.error("❌ User is not SA role:", userData.role);
        showNotification('error', 'Access denied. SA role required.');
        return null;
      }

      console.log("✅ SA User data retrieved:", { 
        id: userData.id, 
        email: userData.email, 
        name: userData.name || userData.first_name + ' ' + userData.last_name,
        role: userData.role 
      });
      
      return userData;
    } catch (error) {
      console.error("❌ Error in fetchUserData:", error);
      showNotification('error', 'Unexpected error occurred while fetching user data.');
      return null;
    }
  };

  const fetchAttendanceData = async (userId: number) => {
    try {
      console.log("🔍 SA Attendance: Fetching class schedule attendance for user ID:", userId);
      
      // Test database connection first
      const { error: testError } = await supabase
        .from("class_attendance")
        .select("count")
        .limit(1);
        
      if (testError) {
        console.error("❌ Database connection test failed:", testError);
        showNotification('error', 'Cannot connect to class attendance database. Please try again.');
        return [];
      }
      
      console.log("✅ Database connection test passed");
      
      const { startDate, endDate } = getDateRange();
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log("📅 Date range:", { startDate: startDateStr, endDate: endDateStr });

      // First, fetch user's schedules to identify what should have attendance records
      const { data: userSchedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("user_id", userId);

      if (schedulesError) {
        console.error("SA Attendance: Error fetching user schedules:", schedulesError);
      }

      console.log("SA Attendance: User schedules:", userSchedules);

      // Fetch class schedule attendance data with schedule details
      const { data, error } = await supabase
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
        .eq("user_id", userId)
        .gte("att_date", startDateStr)
        .lte("att_date", endDateStr)
        .order('att_date', { ascending: false });

      if (error) {
        console.error("❌ Error fetching class attendance:", error);
        showNotification('error', `Failed to fetch class attendance data: ${error.message}`);
        return [];
      }

      console.log("✅ Raw class attendance data fetched:", { 
        count: data?.length || 0, 
        dateRange: `${startDateStr} to ${endDateStr}`,
        sampleData: data?.slice(0, 3) 
      });

      console.log("ℹ️ Processing class attendance records and schedules for absent detection");

      // Combine attendance data with schedule data, similar to HR Admin Dashboard
      const combinedData: any[] = [];
      
      if (userSchedules && userSchedules.length > 0) {
        // For each schedule, find corresponding attendance records or mark as absent
        for (const schedule of userSchedules) {
          const scheduleAttendanceRecords = (data || []).filter(att => 
            att.schedule_id === schedule.id &&
            att.att_date >= startDateStr &&
            att.att_date <= endDateStr
          );
          
          if (scheduleAttendanceRecords.length > 0) {
            // Process existing attendance records
            scheduleAttendanceRecords.forEach((record: any) => {
              combinedData.push({
                id: record.id,
                date: record.att_date,
                check_in_time: record.time_in,
                check_out_time: record.time_out,
                user_id: record.user_id,
                status: record.attendance || "Unknown",
                subject: record.schedules?.subject || schedule.subject || 'N/A',
                room: record.schedules?.room || schedule.room || 'N/A',
                day_of_week: record.schedules?.day_of_week || schedule.day_of_week || 'N/A',
                start_time: record.schedules?.start_time || schedule.start_time || 'N/A',
                end_time: record.schedules?.end_time || schedule.end_time || 'N/A',
                att_date: record.att_date,
                time_in: record.time_in,
                time_out: record.time_out,
                attendance: record.attendance,
                notes: record.notes,
                created_at: record.created_at,
                updated_at: record.updated_at
              });
            });
          } else {
            // No attendance record for this schedule in the date range - create absent record
            const today = new Date();
            const absentRecord = {
              id: `absent-${schedule.id}`,
              date: today.toISOString().split('T')[0],
              check_in_time: null,
              check_out_time: null,
              user_id: userId,
              status: "Absent",
              subject: schedule.subject || 'N/A',
              room: schedule.room || 'N/A',
              day_of_week: schedule.day_of_week || 'N/A',
              start_time: schedule.start_time || 'N/A',
              end_time: schedule.end_time || 'N/A',
              att_date: today.toISOString().split('T')[0],
              time_in: null,
              time_out: null,
              attendance: "Absent",
              notes: 'No attendance record',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            combinedData.push(absentRecord);
          }
        }
      }
      
      // Also include any attendance records that might not have matching schedules
      if (data && data.length > 0) {
        data.forEach((record: any) => {
          // Check if this record is already included via schedule processing
          const alreadyIncluded = combinedData.some(item => 
            item.id === record.id && typeof item.id !== 'string'
          );
          
          if (!alreadyIncluded) {
            combinedData.push({
              id: record.id,
              date: record.att_date,
              check_in_time: record.time_in,
              check_out_time: record.time_out,
              user_id: record.user_id,
              status: record.attendance || "Unknown",
              subject: record.schedules?.subject || 'N/A',
              room: record.schedules?.room || 'N/A',
              day_of_week: record.schedules?.day_of_week || 'N/A',
              start_time: record.schedules?.start_time || 'N/A',
              end_time: record.schedules?.end_time || 'N/A',
              att_date: record.att_date,
              time_in: record.time_in,
              time_out: record.time_out,
              attendance: record.attendance,
              notes: record.notes,
              created_at: record.created_at,
              updated_at: record.updated_at
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

      console.log("✅ Combined SA attendance data with absent records:", { 
        count: sortedData.length,
        sampleTransformed: sortedData.slice(0, 3)
      });

      return sortedData;
    } catch (error) {
      console.error("❌ Error in fetchAttendanceData:", error);
      showNotification('error', 'Unexpected error while fetching class attendance data.');
      return [];
    }
  };


  const loadData = async () => {
    console.log("🚀 SA Attendance: Starting data load process...");
    setLoading(true);
    
    try {
      const userData = await fetchUserData();
      if (!userData) {
        console.log("❌ Failed to fetch user data, stopping load process");
        setLoading(false);
        return;
      }
      
      console.log("✅ User data loaded, setting current user...");
      setCurrentUser(userData);
      
      console.log("🔄 Fetching attendance data...");
      const attendanceData = await fetchAttendanceData(userData.id);
      
      console.log("📊 Setting attendance data:", { 
        attendanceCount: attendanceData.length,
        userId: userData.id,
        userEmail: userData.email
      });
      
      setAttendanceData(attendanceData);
      
      console.log("✅ SA Attendance: Data load completed successfully");
      
      // Show success notification with data summary
      if (attendanceData.length > 0) {
        showNotification('success', `Loaded ${attendanceData.length} attendance records successfully.`);
      } else {
        showNotification('info', 'No attendance records found for the selected period. You can start by checking in.');
      }
      
    } catch (error) {
      console.error("❌ Error in loadData:", error);
      showNotification('error', 'Failed to load attendance data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Auto-refresh functionality removed

  const calculateStats = () => {
    const present = filteredAttendanceData.filter(record => {
      const status = record.attendance || record.status || "";
      return status === "Present" || status === true;
    }).length;
    const absent = filteredAttendanceData.filter(record => {
      const status = record.attendance || record.status || "";
      return status === "Absent" || status === false;
    }).length;
    const late = filteredAttendanceData.filter(record => {
      const status = record.attendance || record.status || "";
      return status === "Late";
    }).length;
    const total = filteredAttendanceData.length;
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

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
            'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}



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
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Class Schedule Attendance Records</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredAttendanceData.length} class attendance records
              </p>
            </div>
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

          {filteredAttendanceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendanceData.map((record, index) => {
                    const displayStatus = record.attendance || record.status || 'Unknown';
                    const displayDate = record.att_date || record.date;
                    const displayCheckIn = record.time_in || record.check_in_time;
                    const displayCheckOut = record.time_out || record.check_out_time;
                    
                    return (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPhilippineDate(displayDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {record.subject || 'N/A'}
                            </span>
                            {record.room && (
                              <span className="text-xs text-gray-500">Room: {record.room}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700 text-sm">
                              {record.day_of_week || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatPhilippineTime(record.start_time)} - {formatPhilippineTime(record.end_time)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatPhilippineTime(displayCheckIn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {formatPhilippineTime(displayCheckOut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            displayStatus === "Present"
                              ? "bg-green-100 text-green-800"
                              : displayStatus === "Late"
                              ? "bg-yellow-100 text-yellow-800"
                              : displayStatus === "Absent"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {displayStatus === "Present" ? "✅ Present" : 
                             displayStatus === "Late" ? "⏰ Late" :
                             displayStatus === "Absent" ? "❌ Absent" : 
                             displayStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No class attendance records</h3>
              <p className="mt-1 text-sm text-gray-500">
                No class attendance records found for {months[selectedMonth]} {selectedYear}
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

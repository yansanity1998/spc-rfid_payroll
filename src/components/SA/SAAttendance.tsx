// src/components/SA/SAAttendance.tsx
import { useEffect, useState, useCallback } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Helper function to format time in Philippine timezone with AM/PM (aligned with HRAdmin)
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return "N/A";
    
    try {
      console.log('🕐 Formatting time:', timeString);
      
      // Handle different date string formats from Supabase
      let date: Date;
      
      if (timeString.includes('T')) {
        // ISO format with time
        if (!timeString.includes('Z') && !timeString.includes('+') && !timeString.includes('-', 10)) {
          // No timezone info, assume UTC (common with Supabase)
          date = new Date(timeString + 'Z');
        } else {
          date = new Date(timeString);
        }
      } else if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
        // Time only format (HH:MM:SS) - treat as Philippine time for today
        const today = new Date().toISOString().split('T')[0];
        date = new Date(`${today}T${timeString}`);
      } else if (timeString.match(/^\d{2}:\d{2}$/)) {
        // Time only format (HH:MM) - treat as Philippine time for today  
        const today = new Date().toISOString().split('T')[0];
        date = new Date(`${today}T${timeString}:00`);
      } else {
        // Try to parse as-is
        date = new Date(timeString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('❌ Invalid date format:', timeString);
        return timeString;
      }
      
      // Convert to Philippine time with AM/PM format (same as HRAdmin)
      const result = date.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      });
      
      console.log('✅ Philippine time result:', result);
      return result;
    } catch (error) {
      console.warn('❌ Error formatting time:', timeString, error);
      return timeString;
    }
  };

  // Helper function to format date in Philippine timezone
  const formatPhilippineDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    try {
      // Handle date-only strings (YYYY-MM-DD format)
      const date = dateString.includes('T') 
        ? new Date(dateString)
        : new Date(dateString + 'T00:00:00');
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return dateString;
      }
      
      return date.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Notification helper
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Filter attendance data based on search and status
  const filteredAttendanceData = attendanceData.filter(record => {
    const matchesSearch = searchTerm === "" || 
      formatPhilippineDate(record.date).toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get date range for data fetching
  const getDateRange = useCallback(() => {
    if (dateRange === 'week') {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return { startDate: startOfWeek, endDate: endOfWeek };
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      return { 
        startDate: new Date(customStartDate), 
        endDate: new Date(customEndDate) 
      };
    } else {
      // Default to month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      return { startDate, endDate };
    }
  }, [dateRange, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Export attendance data to CSV
  const exportToCSV = useCallback(() => {
    if (filteredAttendanceData.length === 0) {
      showNotification('error', 'No data to export');
      return;
    }

    setIsExporting(true);
    
    const headers = ['Date', 'Status', 'Check In', 'Check Out'];
    const csvContent = [
      headers.join(','),
      ...filteredAttendanceData.map(record => [
        formatPhilippineDate(record.date),
        record.status,
        formatPhilippineTime(record.check_in_time),
        formatPhilippineTime(record.check_out_time)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SA_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    setIsExporting(false);
    showNotification('success', 'Attendance data exported successfully');
  }, [filteredAttendanceData, formatPhilippineTime, showNotification]);

  // Debug function to test database connection
  const testDatabaseConnection = useCallback(async () => {
    console.log("🧪 Testing database connection...");
    showNotification('info', 'Testing database connection...');
    
    try {
      // Test 1: Check Supabase connection
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("🔐 Auth test:", { user: user?.email, error: authError });
      
      if (!user) {
        showNotification('error', 'Not authenticated. Please log in.');
        return;
      }

      // Test 2: Check users table access
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, name, auth_id")
        .limit(1);
      
      console.log("👥 Users table test:", { count: usersData?.length, error: usersError });

      // Test 3: Check attendance table access
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("id, user_id, date")
        .limit(1);
      
      console.log("📊 Attendance table test:", { count: attendanceData?.length, error: attendanceError });

      // Test 4: Check roles table access
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, role")
        .eq("role", "SA")
        .limit(1);
      
      console.log("🎭 Roles table test:", { count: rolesData?.length, error: rolesError });

      if (usersError || attendanceError || rolesError) {
        showNotification('error', 'Database connection issues detected. Check console for details.');
      } else {
        showNotification('success', 'Database connection test passed!');
      }

    } catch (error) {
      console.error("❌ Database test failed:", error);
      showNotification('error', 'Database test failed. Check console for details.');
    }
  }, [showNotification]);

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
      console.log("🔍 SA Attendance: Fetching attendance data for user ID:", userId);
      
      // Test database connection first
      const { error: testError } = await supabase
        .from("attendance")
        .select("count")
        .limit(1);
        
      if (testError) {
        console.error("❌ Database connection test failed:", testError);
        showNotification('error', 'Cannot connect to attendance database. Please try again.');
        return [];
      }
      
      console.log("✅ Database connection test passed");
      
      const { startDate, endDate } = getDateRange();
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log("📅 Date range:", { startDate: startDateStr, endDate: endDateStr, dateRange });

      // First, get all attendance records for this user to debug
      const { data: allUserData, error: allError } = await supabase
        .from("attendance")
        .select(`
          *,
          user:users (
            id,
            name,
            role
          )
        `)
        .eq("user_id", userId);
        
      console.log("📊 All attendance records for user:", { 
        userId, 
        totalRecords: allUserData?.length || 0, 
        records: allUserData?.slice(0, 5),
        error: allError 
      });

      // Now get filtered data using correct field names (att_date, time_in, time_out)
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          user:users (
            id,
            name,
            role
          )
        `)
        .eq("user_id", userId)
        .gte("att_date", startDateStr)
        .lte("att_date", endDateStr)
        .order('att_date', { ascending: false });

      if (error) {
        console.error("❌ Error fetching attendance:", error);
        showNotification('error', `Failed to fetch attendance data: ${error.message}`);
        return [];
      }

      console.log("✅ Raw attendance data fetched:", { 
        count: data?.length || 0, 
        dateRange: `${startDateStr} to ${endDateStr}`,
        sampleData: data?.slice(0, 3) 
      });

      if (!data || data.length === 0) {
        console.log("ℹ️ No attendance records found for the specified criteria");
        showNotification('info', `No attendance records found for the selected period (${startDateStr} to ${endDateStr})`);
        return [];
      }

      // Transform data to match expected format
      const transformedData = data.map((record: any) => ({
        id: record.id,
        date: record.att_date, // Map att_date to date
        check_in_time: record.time_in, // Map time_in to check_in_time
        check_out_time: record.time_out, // Map time_out to check_out_time
        user_id: record.user_id,
        // Calculate status based on attendance field and times
        status: record.attendance === true
          ? record.time_in && !record.time_out
            ? "Present"
            : record.time_out
              ? "Present" // Completed day
              : "Late"
          : record.attendance === false
            ? "Absent"
            : record.time_in || record.time_out
              ? "Present" // Fallback: if there's time data but no attendance field
              : "Absent",
        // Keep original fields for debugging
        att_date: record.att_date,
        time_in: record.time_in,
        time_out: record.time_out,
        attendance: record.attendance,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));

      console.log("✅ Transformed attendance data:", { 
        count: transformedData.length,
        sampleTransformed: transformedData.slice(0, 3)
      });

      return transformedData;
    } catch (error) {
      console.error("❌ Error in fetchAttendanceData:", error);
      showNotification('error', 'Unexpected error while fetching attendance data.');
      return [];
    }
  };

  const fetchTodayAttendance = async (userId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log("🔍 SA Attendance: Fetching today's attendance for user ID:", userId, "date:", today);
      
      // First check if there are any attendance records for this user at all
      const { data: anyRecords } = await supabase
        .from("attendance")
        .select("att_date") // Use correct field name
        .eq("user_id", userId)
        .limit(5);
        
      console.log("📊 Any attendance records for user:", { 
        userId, 
        recordCount: anyRecords?.length || 0,
        sampleDates: anyRecords?.map(r => r.att_date) 
      });
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .eq("att_date", today) // Use correct field name
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("❌ Error fetching today's attendance:", error);
        showNotification('error', `Failed to fetch today's attendance: ${error.message}`);
        return null;
      }

      if (error && error.code === 'PGRST116') {
        console.log("ℹ️ No attendance record found for today (", today, ")");
        return null;
      } else {
        console.log("✅ Today's raw attendance found:", data);
        
        // Transform today's data to match expected format
        const transformedData = {
          id: data.id,
          date: data.att_date,
          check_in_time: data.time_in,
          check_out_time: data.time_out,
          user_id: data.user_id,
          status: data.attendance === true
            ? data.time_in && !data.time_out
              ? "Present"
              : data.time_out
                ? "Present" // Completed day
                : "Late"
            : data.attendance === false
              ? "Absent"
              : data.time_in || data.time_out
                ? "Present" // Fallback
                : "Absent",
          // Keep original fields
          att_date: data.att_date,
          time_in: data.time_in,
          time_out: data.time_out,
          attendance: data.attendance,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        console.log("✅ Today's transformed attendance:", transformedData);
        return transformedData;
      }
    } catch (error) {
      console.error("❌ Error in fetchTodayAttendance:", error);
      showNotification('error', 'Unexpected error occurred while fetching today\'s attendance.');
      return null;
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;

    try {
      // Get current time in Manila timezone
      const now = new Date();
      
      // Create a proper Manila time representation
      const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const today = manilaTime.toISOString().split('T')[0];
      
      // Store the time in a format that preserves Manila timezone info
      // We'll store it as an ISO string but adjusted for Manila time
      const manilaHours = manilaTime.getHours();
      const manilaMinutes = manilaTime.getMinutes();
      const manilaSeconds = manilaTime.getSeconds();
      
      // Create Manila time string in HH:MM:SS format (24-hour)
      const manilaTimeString = `${manilaHours.toString().padStart(2, '0')}:${manilaMinutes.toString().padStart(2, '0')}:${manilaSeconds.toString().padStart(2, '0')}`;
      
      console.log('🕐 Check-in time details:');
      console.log('  - UTC now:', now.toISOString());
      console.log('  - Manila time object:', manilaTime.toString());
      console.log('  - Manila hours:', manilaHours, '(should be 15 for 3 PM)');
      console.log('  - Manila time string:', manilaTimeString);
      console.log('  - Today (Manila):', today);

      // Determine attendance status based on Manila time (assuming 8:00 AM is the standard time)
      const standardTime = new Date(`${today}T08:00:00`);
      const isLate = manilaTime > standardTime;
      
      console.log('📊 Status calculation:');
      console.log('  - Check-in time (Manila):', manilaTime.toString());
      console.log('  - Standard time (8 AM):', standardTime.toString());
      console.log('  - Is late?', isLate);

      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            user_id: currentUser.id,
            att_date: today, // Use correct field name
            time_in: manilaTimeString, // Store as HH:MM:SS in Manila time
            attendance: true, // Mark as present
            created_at: now.toISOString()
          }
        ])
        .select()
        .single();
        
      console.log('💾 Stored in database:');
      console.log('  - att_date:', today);
      console.log('  - time_in:', manilaTimeString);
      console.log('  - attendance:', true);

      if (error) {
        console.error("Error checking in:", error);
        showNotification('error', "Error checking in. Please try again.");
        return;
      }

      // Transform the returned data
      const transformedData = {
        id: data.id,
        date: data.att_date,
        check_in_time: data.time_in,
        check_out_time: data.time_out,
        user_id: data.user_id,
        status: isLate ? "Late" : "Present",
        att_date: data.att_date,
        time_in: data.time_in,
        time_out: data.time_out,
        attendance: data.attendance,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setTodayAttendance(transformedData);
      setCanCheckIn(false);
      setCanCheckOut(true);
      
      const statusText = isLate ? "Late" : "Present";
      const formattedTime = formatPhilippineTime(data.time_in);
      console.log('🎉 Check-in successful:');
      console.log('  - Stored time_in:', data.time_in);
      console.log('  - Formatted display:', formattedTime);
      
      showNotification('success', `Successfully checked in at ${formattedTime} - Status: ${statusText}`);
      
      // Refresh attendance data
      const updatedData = await fetchAttendanceData(currentUser.id);
      setAttendanceData(updatedData);
    } catch (error) {
      console.error("Error in handleCheckIn:", error);
      showNotification('error', "Error checking in. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser || !todayAttendance) return;

    try {
      // Get current time in Manila timezone
      const now = new Date();
      const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      
      // Create Manila time string in HH:MM:SS format (24-hour)
      const manilaHours = manilaTime.getHours();
      const manilaMinutes = manilaTime.getMinutes();
      const manilaSeconds = manilaTime.getSeconds();
      const manilaTimeString = `${manilaHours.toString().padStart(2, '0')}:${manilaMinutes.toString().padStart(2, '0')}:${manilaSeconds.toString().padStart(2, '0')}`;
      
      console.log('🕐 Check-out time details:');
      console.log('  - UTC now:', now.toISOString());
      console.log('  - Manila time object:', manilaTime.toString());
      console.log('  - Manila time string:', manilaTimeString);

      const { data, error } = await supabase
        .from("attendance")
        .update({
          time_out: manilaTimeString, // Store as HH:MM:SS in Manila time
          updated_at: now.toISOString()
        })
        .eq("id", todayAttendance.id)
        .select()
        .single();
        
      console.log('💾 Updated in database:');
      console.log('  - time_out:', manilaTimeString);

      if (error) {
        console.error("Error checking out:", error);
        showNotification('error', "Error checking out. Please try again.");
        return;
      }

      // Transform the returned data
      const transformedData = {
        id: data.id,
        date: data.att_date,
        check_in_time: data.time_in,
        check_out_time: data.time_out,
        user_id: data.user_id,
        status: "Present", // Completed day
        att_date: data.att_date,
        time_in: data.time_in,
        time_out: data.time_out,
        attendance: data.attendance,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setTodayAttendance(transformedData);
      setCanCheckOut(false);
      showNotification('success', `Successfully checked out at ${formatPhilippineTime(data.time_out)}`);
      
      // Refresh attendance data
      const updatedData = await fetchAttendanceData(currentUser.id);
      setAttendanceData(updatedData);
    } catch (error) {
      console.error("Error in handleCheckOut:", error);
      showNotification('error', "An unexpected error occurred. Please try again.");
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
      
      console.log("🔄 Fetching attendance and today's data in parallel...");
      const [attendanceData, todayData] = await Promise.all([
        fetchAttendanceData(userData.id),
        fetchTodayAttendance(userData.id)
      ]);
      
      console.log("📊 Setting attendance data:", { 
        attendanceCount: attendanceData.length, 
        todayData: todayData ? 'found' : 'not found',
        userId: userData.id,
        userEmail: userData.email
      });
      
      setAttendanceData(attendanceData);
      setTodayAttendance(todayData);
      
      // Set check-in/out availability
      if (todayData) {
        setCanCheckIn(false);
        setCanCheckOut(!todayData.check_out_time);
        console.log("✅ Today's attendance found - Check In:", false, "Check Out:", !todayData.check_out_time);
      } else {
        setCanCheckIn(true);
        setCanCheckOut(false);
        console.log("ℹ️ No today's attendance - Check In:", true, "Check Out:", false);
      }
      
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
  }, [selectedMonth, selectedYear, dateRange, customStartDate, customEndDate]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !currentUser) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentUser]);

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
    const present = filteredAttendanceData.filter(record => record.status === "Present").length;
    const absent = filteredAttendanceData.filter(record => record.status === "Absent").length;
    const late = filteredAttendanceData.filter(record => record.status === "Late").length;
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

        {/* Dynamic Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters & Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by date or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Auto Refresh */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Refresh</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-600">
                  {autoRefresh ? `Every ${refreshInterval/1000}s` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            <button
              onClick={exportToCSV}
              disabled={isExporting || filteredAttendanceData.length === 0}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isExporting || filteredAttendanceData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              disabled={!autoRefresh}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value={15000}>15 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </select>

            <button
              onClick={testDatabaseConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test DB
            </button>
          </div>
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
                    {formatPhilippineTime(todayAttendance.check_in_time) !== "N/A" ? formatPhilippineTime(todayAttendance.check_in_time) : "Not checked in"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check Out</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPhilippineTime(todayAttendance.check_out_time) !== "N/A" ? formatPhilippineTime(todayAttendance.check_out_time) : "Not checked out"}
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
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Attendance Records</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredAttendanceData.length} of {attendanceData.length} records
                {searchTerm && ` • Filtered by: "${searchTerm}"`}
                {statusFilter !== "All" && ` • Status: ${statusFilter}`}
              </p>
            </div>
            {dateRange === 'month' && (
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
            )}
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
                  {filteredAttendanceData.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhilippineDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhilippineTime(record.check_in_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhilippineTime(record.check_out_time)}
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
                {searchTerm || statusFilter !== "All" 
                  ? "No records match your current filters. Try adjusting your search or filter criteria."
                  : dateRange === 'week' 
                    ? "No attendance records found for this week"
                    : dateRange === 'custom'
                      ? "No attendance records found for the selected date range"
                      : `No attendance records found for ${months[selectedMonth]} ${selectedYear}`
                }
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

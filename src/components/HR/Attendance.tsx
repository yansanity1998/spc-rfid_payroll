// src/pages/Attendance.tsx
import { useEffect, useState, useMemo } from "react";
import supabase from "../../utils/supabase";

export const Attendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [scheduleAttendance, setScheduleAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // 🔍 Search state
  const [scheduleSearch, setScheduleSearch] = useState(""); // 🔍 Schedule search state
  const [regularSortBy, setRegularSortBy] = useState("all"); // 📊 Regular attendance sorting
  const [scheduleSortBy, setScheduleSortBy] = useState("all"); // 📊 Schedule attendance sorting
  const [sessionSort, setSessionSort] = useState("all"); // 📊 Session sorting (all, morning, afternoon)
  const [selectedDate, setSelectedDate] = useState(""); // 📅 Date filter state
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [regularAttendancePage, setRegularAttendancePage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const regularAttendanceRow = 5;
  const attendanceRow = 5;

  // 🔍 Filter regular attendance logs (sort by latest date and tap time)
  const filtered = records
    .filter(
      (log) => {
        try {
          if (!search || search.trim() === '') return true;
          
          const searchLower = search.toLowerCase();
          return (
            (log.name && log.name.toLowerCase().includes(searchLower)) ||
            (log.role && log.role.toLowerCase().includes(searchLower)) ||
            (log.semester && log.semester.toString().includes(search)) ||
            (log.schoolYear && log.schoolYear.toString().includes(search)) ||
            (log.status && log.status.toLowerCase().includes(searchLower))
          );
        } catch (error) {
          console.error('Error in regular attendance filter:', error, log);
          return false;
        }
      }
    )
    .filter((log) => {
      if (regularSortBy === "all") return true;
      if (regularSortBy === "Teaching") return log.role === "Faculty";
      if (regularSortBy === "Non-Teaching") return log.role === "Staff" || log.role === "SA";
      return log.role === regularSortBy;
    })
    .filter((log) => {
      // Filter by session
      if (sessionSort === "all") return true;
      return log.session === sessionSort;
    })
    .filter((log) => {
      // Filter by selected date
      if (!selectedDate) return true;
      return log.att_date === selectedDate;
    })
    .sort((a, b) => {
      // Sort by most recent tap time (time_in or time_out), newest first
      const getLatestActivity = (record: any) => {
        const timeIn = record.time_in ? new Date(record.time_in).getTime() : 0;
        const timeOut = record.time_out ? new Date(record.time_out).getTime() : 0;
        return Math.max(timeIn, timeOut);
      };

      const aLatest = getLatestActivity(a);
      const bLatest = getLatestActivity(b);
      return bLatest - aLatest;
    });

  // 🔍 Filter and sort schedule attendance (Faculty and Staff only)
  const filteredScheduleAttendance = scheduleAttendance
    .filter((record) => {
      // Only show Faculty and Staff roles
      const allowedRoles = ['Faculty', 'Staff'];
      return allowedRoles.includes(record.users?.role);
    })
    .filter(
      (record) => {
        try {
          if (!scheduleSearch || scheduleSearch.trim() === '') return true;
          
          const searchLower = scheduleSearch.toLowerCase();
          return (
            (record.users?.name && record.users.name.toLowerCase().includes(searchLower)) ||
            (record.users?.role && record.users.role.toLowerCase().includes(searchLower)) ||
            (record.subject && record.subject.toLowerCase().includes(searchLower)) ||
            (record.room && record.room.toLowerCase().includes(searchLower)) ||
            (record.day_of_week && record.day_of_week.toLowerCase().includes(searchLower)) ||
            (record.attendance && record.attendance.toLowerCase().includes(searchLower))
          );
        } catch (error) {
          console.error('Error in schedule attendance filter:', error, record);
          return false;
        }
      }
    )
    .filter((record) => scheduleSortBy === "all" || record.users?.role === scheduleSortBy)
    .filter((record) => {
      // Filter by selected date
      if (!selectedDate) return true;
      return record.att_date === selectedDate;
    })
    .sort((a, b) => {
      // First, sort by date (latest date first)
      const dateA = new Date(a.att_date).getTime();
      const dateB = new Date(b.att_date).getTime();

      if (dateB !== dateA) {
        return dateB - dateA; // Latest date first
      }

      // If dates are the same, sort by most recent tap time (time_in or time_out)
      const getLatestActivity = (record: any) => {
        const timeIn = record.time_in ? new Date(record.time_in).getTime() : 0;
        const timeOut = record.time_out ? new Date(record.time_out).getTime() : 0;
        return Math.max(timeIn, timeOut);
      };

      const aLatest = getLatestActivity(a);
      const bLatest = getLatestActivity(b);

      // Sort in descending order (most recent tap time first)
      return bLatest - aLatest;
    });

  // Calculate total working hours dynamically from FILTERED data
  const totalWorkingHours = useMemo(() => {
    let totalMinutes = 0;

    // Calculate from FILTERED regular attendance records
    filtered.forEach(record => {
      if (record.time_in && record.time_out) {
        const timeIn = new Date(record.time_in);
        const timeOut = new Date(record.time_out);
        const diffMs = timeOut.getTime() - timeIn.getTime();
        const diffMinutes = Math.max(0, diffMs / (1000 * 60)); // Convert to minutes
        totalMinutes += diffMinutes;
      }
    });

    // Calculate from FILTERED class schedule attendance records
    filteredScheduleAttendance.forEach(record => {
      if (record.time_in && record.time_out) {
        const timeIn = new Date(record.time_in);
        const timeOut = new Date(record.time_out);
        const diffMs = timeOut.getTime() - timeIn.getTime();
        const diffMinutes = Math.max(0, diffMs / (1000 * 60)); // Convert to minutes
        totalMinutes += diffMinutes;
      }
    });

    // Convert total minutes to hours and minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return { hours, minutes, totalMinutes };
  }, [filtered, filteredScheduleAttendance]);

  // Color coding system for employee types
  const getEmployeeTypeColor = (role: string) => {
    switch (role) {
      case "Administrator":
        return "from-purple-500 to-purple-600 text-purple-800 bg-purple-100";
      case "HR Personnel":
        return "from-blue-500 to-blue-600 text-blue-800 bg-blue-100";
      case "Accounting":
        return "from-green-500 to-green-600 text-green-800 bg-green-100";
      case "Faculty":
        return "from-red-500 to-red-600 text-red-800 bg-red-100";
      case "Staff":
        return "from-orange-500 to-orange-600 text-orange-800 bg-orange-100";
      case "SA":
        return "from-yellow-500 to-yellow-600 text-yellow-800 bg-yellow-100";
      case "Guard":
        return "from-teal-500 to-teal-600 text-teal-800 bg-teal-100";
      default:
        return "from-gray-500 to-gray-600 text-gray-800 bg-gray-100";
    }
  };

  // Helper function to format time in Philippine timezone with AM/PM
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return "N/A";

    // Handle time string format (HH:MM:SS or HH:MM)
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);

      // Convert to 12-hour format with AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    return timeString;
  };

  // Helper function to format datetime in Philippine timezone
  const formatPhilippineDateTime = (dateString: string) => {
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
      // Date only format, treat as UTC
      date = new Date(dateString + 'T00:00:00Z');
    }

    // Convert to Philippine time
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Delete a regular attendance record
  const handleDeleteAttendance = async (attendanceId: number | string) => {
    // Only allow deleting persisted DB records (numeric IDs)
    if (typeof attendanceId !== 'number') return;

    try {
      setDeletingId(attendanceId);
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) {
        console.error('Error deleting attendance:', error);
        alert('Failed to delete record. Please try again.');
        return;
      }

      // Remove from local state
      setRecords((prev) => prev.filter((r) => r.id !== attendanceId));
    } catch (err) {
      console.error('Unexpected error deleting attendance:', err);
      alert('Unexpected error occurred.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Helper function to format date in Philippine timezone
  const formatPhilippineDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    
    try {
      // Handle date-only strings (YYYY-MM-DD format)
      const date = dateString.includes('T')
        ? new Date(dateString)
        : new Date(dateString + 'T00:00:00Z');

      return date.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "";
    }
  };

  // Normalize a datetime string to Asia/Manila clock minutes since midnight
  const getManilaMinutesSinceMidnight = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    let date: Date;
    if (dateString.includes('T')) {
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        date = new Date(dateString + 'Z');
      } else {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString + 'T00:00:00Z');
    }
    // Render date in Manila and extract hour/minute components
    const parts = date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    return hour * 60 + minute;
  };

  // Function to add automatic absent records for users who forgot to tap
  const addAutomaticAbsentRecords = async (existingRecords: any[], exemptedTodayUserIds?: Set<number>) => {
    try {
      // Determine today's date in Manila and current Manila time
      const nowUtc = new Date();
      const today = new Date(nowUtc.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))
        .toISOString()
        .split('T')[0];
      const currentMinutes = getManilaMinutesSinceMidnight(nowUtc.toISOString());
      const afternoonEnd = 19 * 60; // 7:00 PM

      // Check if today is a holiday (active holidays only)
      const { data: holidayCheck, error: holidayError } = await supabase
        .from("holidays")
        .select("id, title, is_active")
        .eq("date", today)
        .eq("is_active", true)
        .maybeSingle();

      if (holidayError) {
        console.error("[AutoAbsent] Error checking holiday:", holidayError);
      }

      if (holidayCheck) {
        console.log(`[AutoAbsent] Today (${today}) is a holiday: "${holidayCheck.title}". Skipping auto-absent logic.`);
        return; // Exit early - no one should be marked absent on a holiday
      }

      // Get all active users (Faculty, SA, Accounting, Staff)
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id, name, role")
        .in("role", ["Faculty", "SA", "Accounting", "Staff"]);

      if (usersError) {
        console.error("Error fetching users for absent check:", usersError);
        return;
      }

      console.log(`[AutoAbsent] Checking ${allUsers?.length || 0} users for today (${today})`);

      // If not provided, prefetch exemptions for today once and cache in a Set for O(1) checks
      let exemptedSet = exemptedTodayUserIds;
      if (!exemptedSet) {
        const userIds = (allUsers || []).map(u => u.id);
        const { data: exemptionsToday } = await supabase
          .from('schedule_exemptions')
          .select('user_id, request_type, start_time, end_time, exemption_date')
          .eq('exemption_date', today)
          .in('user_id', userIds);
        exemptedSet = new Set((exemptionsToday || []).map(e => e.user_id));
      }

      // Check each user for attendance today
      for (const user of allUsers || []) {
        // Check if user has any attendance record for today
        const userAttendanceToday = existingRecords.filter(record =>
          record.userId === user.id && record.att_date === today
        );

        // Skip if user is exempted today
        if (exemptedSet && exemptedSet.has(user.id)) {
          console.log(`[AutoAbsent] Skipping user ${user.name} due to exemption.`);
          continue;
        }

        // If user has no attendance records for today and it's past 7:00 PM, create one full-day absent
        if (currentMinutes !== null && currentMinutes >= afternoonEnd && userAttendanceToday.length === 0) {
          console.log(`[AutoAbsent] Creating full-day absent for user ${user.name} (${user.id})`);
          const { error: insertError } = await supabase
            .from('attendance')
            .insert([
              {
                user_id: user.id,
                att_date: today,
                time_in: null,
                time_out: null,
                status: false,
                late_minutes: 0,
                overtime_minutes: 0,
                penalty_amount: 240,
                notes: 'Automatic absent - No attendance recorded for both morning and afternoon sessions'
              }
            ]);
          if (insertError) {
            console.error(`[AutoAbsent] Error creating full-day absent for user ${user.id}:`, insertError);
          } else {
            existingRecords.push({
              id: `auto_absent_${user.id}_${today}`,
              att_date: today,
              time_in: null,
              time_out: null,
              attendance: false,
              userId: user.id,
              name: user.name,
              role: user.role,
              semester: null,
              schoolYear: null,
              hiredDate: null,
              status: 'Absent'
            });
          }
        }
      }
    } catch (error) {
      console.error("[AutoAbsent] Error in addAutomaticAbsentRecords:", error);
    }
  };

  // (removed old per-row exemption checker in favor of batched queries)

  const fetchAttendance = async () => {
    setLoading(true);

    try {
      // Fetch regular attendance records
      const { data, error } = await supabase
        .from("attendance")
        .select(
          `
      *,
      user:users (
        id,
        name,
        role,
        semester,
        schoolYear,
        hiredDate
      )
    `
        );

      if (error) {
        console.error("Attendance fetch error:", error);
        setRecords([]);
      } else {
        console.log("Raw attendance data:", data);

        // Prepare batch exemption lookup for attendance records
        const attendanceUserIds = Array.from(new Set((data || []).map((row: any) => row.user?.id).filter(Boolean)));
        const attendanceDates = Array.from(new Set((data || []).map((row: any) => row.att_date).filter(Boolean)));
        let exemptionMap = new Map<string, any>();
        
        // Fetch holidays for the date range
        let holidayDates = new Set<string>();
        if (attendanceDates.length > 0) {
          const { data: holidays } = await supabase
            .from('holidays')
            .select('date, title')
            .in('date', attendanceDates)
            .eq('is_active', true);
          
          for (const holiday of (holidays || [])) {
            holidayDates.add(holiday.date);
            console.log(`[Holiday] ${holiday.date} is a holiday: ${holiday.title}`);
          }
        }
        
        if (attendanceUserIds.length > 0 && attendanceDates.length > 0) {
          const { data: exemptions } = await supabase
            .from('schedule_exemptions')
            .select('*')
            .in('user_id', attendanceUserIds)
            .in('exemption_date', attendanceDates);
          for (const ex of (exemptions || [])) {
            const key = `${ex.user_id}|${ex.exemption_date}`;
            // Determine exemption type
            let type = 'time_specific';
            if (ex.request_type === 'Leave' || (!ex.start_time && !ex.end_time)) type = 'full_day';
            exemptionMap.set(key, {
              isExempted: true,
              reason: ex.reason,
              type,
              requestType: ex.request_type,
              startTime: ex.start_time,
              endTime: ex.end_time,
            });
          }
        }

        // Process attendance records using preloaded exemption map and holiday dates
        const processedRecords = (data || []).map((row: any) => {
          const key = `${row.user?.id}|${row.att_date}`;
          const exemptionCheck = exemptionMap.get(key) || { isExempted: false, reason: null, type: null };
          
          // Check if this date is a holiday
          const isHoliday = holidayDates.has(row.att_date);

          // Note: we no longer need to count per-day records for status

          return {
            id: row.id,
            att_date: row.att_date,
            time_in: row.time_in,
            time_out: row.time_out,
            attendance: row.attendance,
            session: (() => {
              // Prefer explicit DB column first
              if (row.session === 'morning' || row.session === 'afternoon') return row.session;
              // Fallback to notes tag
              const n: string = (row.notes || '').toString();
              if (n.includes('Afternoon session')) return 'afternoon';
              if (n.includes('Morning session')) return 'morning';
              // Fallback to time window inference based on time_in
              const minutes = getManilaMinutesSinceMidnight(row.time_in);
              if (minutes !== null) {
                if (minutes >= 7 * 60 && minutes < 12 * 60) return 'morning';
                if (minutes >= 13 * 60 && minutes < 19 * 60) return 'afternoon';
              }
              return undefined;
            })(),
            userId: row.user?.id,
            name: row.user?.name,
            role: row.user?.role,
            semester: row.user?.semester,
            schoolYear: row.user?.schoolYear,
            hiredDate: row.user?.hiredDate,
            exemption: exemptionCheck, // Add exemption info
            isHoliday: isHoliday, // Add holiday flag
            status: (() => {
              // Check if date is a holiday first - highest priority
              if (isHoliday) return "Exempted";
              
              // Respect exemptions next
              if (exemptionCheck.isExempted) return "Exempted";

              // Explicit absent flag from DB
              if (row.attendance === false) return "Absent";

              // No taps at all
              if (!row.time_in && !row.time_out) return "Absent";

              // Helper: Manila lateness check
              const isLateTimeIn = (timeInString: string) => {
                if (!timeInString) return false;
                const timeInMinutes = getManilaMinutesSinceMidnight(timeInString);
                if (timeInMinutes === null) return false;
                const morningStart = 7 * 60; // 7:00 AM
                const morningGrace = morningStart + 15; // 7:15 AM
                const noon = 12 * 60; // 12:00 PM
                const afternoonStart = 13 * 60; // 1:00 PM
                const afternoonGrace = afternoonStart + 15; // 1:15 PM
                const afternoonEnd = 19 * 60; // 7:00 PM

                if (timeInMinutes >= morningStart && timeInMinutes <= noon) {
                  return timeInMinutes > morningGrace;
                }
                if (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd) {
                  return timeInMinutes > afternoonGrace;
                }
                return timeInMinutes > afternoonEnd; // after 7pm considered late
              };

              // Both time in and out within a session -> Present
              if (row.time_in && row.time_out) return "Present";

              // Only time-in -> Late if beyond grace, else Present
              if (row.time_in && !row.time_out) return isLateTimeIn(row.time_in) ? "Late" : "Present";

              // Only time-out -> treat as Present (allowed per requirement)
              if (!row.time_in && row.time_out) return "Present";

              return "Absent";
            })(),
          };
        });

        // Sort by most recent activity (either time_in or time_out, whichever is more recent)
        const sortedFlat = processedRecords.sort((a: any, b: any) => {
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

        console.log("Processed attendance data:", sortedFlat);

        // 🔥 Add automatic absent records for users who forgot to tap (both morning and afternoon)
        // Prefetch today's exemptions for auto-absent check
        const nowUtc = new Date();
        const today = new Date(nowUtc.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))
          .toISOString()
          .split('T')[0];
        const autoAbsentUserIds = Array.from(new Set(sortedFlat.map((r: any) => r.userId).filter(Boolean)));
        let exemptedTodaySet: Set<number> | undefined = undefined;
        if (autoAbsentUserIds.length > 0) {
          const { data: exemptionsToday } = await supabase
            .from('schedule_exemptions')
            .select('user_id')
            .eq('exemption_date', today)
            .in('user_id', autoAbsentUserIds);
          exemptedTodaySet = new Set((exemptionsToday || []).map(e => e.user_id));
        }

        await addAutomaticAbsentRecords(sortedFlat, exemptedTodaySet);

        setRecords(sortedFlat);
      }

      // Fetch class schedule attendance data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select(`
          id,
          user_id,
          day_of_week,
          start_time,
          end_time,
          subject,
          room,
          notes,
          created_at,
          users (
            id,
            name,
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error("Error fetching schedules:", schedulesError);
      }

      // Fetch attendance records
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
          created_at
        `)
        .order("created_at", { ascending: false });

      if (attendanceError) {
        console.error("Error fetching schedule attendance:", attendanceError);
      }

      console.log("Fetched schedules:", schedulesData);
      console.log("Fetched attendance records:", attendanceData);

      // Prepare batch exemption lookup for schedules (include today for rows with no recent record)
      const scheduleUserIds = Array.from(new Set((schedulesData || []).map(s => s.user_id)));
      const mostRecentDates = new Set<string>();
      (attendanceData || []).forEach(a => mostRecentDates.add(a.att_date));
      const todayStr = new Date().toISOString().split('T')[0];
      const scheduleDates = Array.from(new Set([ ...Array.from(mostRecentDates), todayStr ]));
      
      // Fetch holidays for schedule attendance dates
      let scheduleHolidayDates = new Set<string>();
      if (scheduleDates.length > 0) {
        const { data: scheduleHolidays } = await supabase
          .from('holidays')
          .select('date, title')
          .in('date', scheduleDates)
          .eq('is_active', true);
        
        for (const holiday of (scheduleHolidays || [])) {
          scheduleHolidayDates.add(holiday.date);
          console.log(`[Schedule Holiday] ${holiday.date} is a holiday: ${holiday.title}`);
        }
      }
      
      let scheduleExemptionsMap = new Map<string, any>();
      if (scheduleUserIds.length > 0 && scheduleDates.length > 0) {
        const { data: scheduleExemptions } = await supabase
          .from('schedule_exemptions')
          .select('*')
          .in('user_id', scheduleUserIds)
          .in('exemption_date', scheduleDates);
        for (const ex of (scheduleExemptions || [])) {
          const key = `${ex.user_id}|${ex.exemption_date}`;
          let type = 'time_specific';
          if (ex.request_type === 'Leave' || (!ex.start_time && !ex.end_time)) type = 'full_day';
          scheduleExemptionsMap.set(key, {
            isExempted: true,
            reason: ex.reason,
            type,
            requestType: ex.request_type,
            startTime: ex.start_time,
            endTime: ex.end_time,
          });
        }
      }

      // Combine schedules with their most recent attendance records and check for exemptions
      const combinedScheduleData = (schedulesData || []).map(schedule => {
        // Find the most recent attendance record for this schedule
        const attendanceRecords = (attendanceData || []).filter(att =>
          att.schedule_id === schedule.id
        );

        // Sort by date descending to get the most recent record
        const mostRecentRecord = attendanceRecords.sort((a, b) =>
          new Date(b.att_date).getTime() - new Date(a.att_date).getTime()
        )[0];

        // Get the date for exemption checking (use most recent record date or today)
        const checkDate = mostRecentRecord?.att_date || todayStr;

        // Check if this date is a holiday (HIGHEST PRIORITY)
        const isHoliday = scheduleHolidayDates.has(checkDate);

        // Check for exemptions from preloaded map
        const exemptionCheck = scheduleExemptionsMap.get(`${schedule.user_id}|${checkDate}`) || { isExempted: false, reason: null, type: null };

        // Determine attendance status
        let attendanceStatus = 'Absent';
        if (isHoliday) {
          // Holiday takes highest priority
          attendanceStatus = 'Exempted';
        } else if (exemptionCheck.isExempted) {
          attendanceStatus = 'Exempted';
        } else if (mostRecentRecord) {
          attendanceStatus = mostRecentRecord.attendance;
        }

        return {
          ...schedule,
          attendance_record: mostRecentRecord,
          att_date: checkDate,
          time_in: mostRecentRecord?.time_in || null,
          time_out: mostRecentRecord?.time_out || null,
          attendance: attendanceStatus,
          status: mostRecentRecord?.status || false,
          exemption: exemptionCheck, // Add exemption info
          isHoliday: isHoliday // Add holiday flag
        };
      });

      setScheduleAttendance(combinedScheduleData || []);

    } catch (error) {
      console.error("Error in fetchAttendance:", error);
      setRecords([]);
      setScheduleAttendance([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Lock background scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (confirmDeleteId !== null || showInfoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow || '';
    }
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [confirmDeleteId, showInfoModal]);

  // Pagination for regular attendance table
  const regularAttendanceLast = regularAttendanceRow * regularAttendancePage;
  const regularAttendanceFirst = regularAttendanceLast - regularAttendanceRow;
  const regularAttendancePageData = filtered.slice(regularAttendanceFirst, regularAttendanceLast);

  // Pagination for class schedule attendance
  const attendanceLast = attendanceRow * attendancePage;
  const attendanceFirst = attendanceLast - attendanceRow;
  const attendancePageData = filteredScheduleAttendance.slice(attendanceFirst, attendanceLast);

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Attendance Monitoring</h1>
            </div>
            <p className="text-gray-600">Track employee attendance and working hours</p>
          </div>

          {/* Modern Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, role, year, or status..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Role Filter Dropdown */}
              <div className="relative">
                <select
                  value={regularSortBy}
                  onChange={(e) => setRegularSortBy(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="HR Personnel">HR Personnel</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Non-Teaching">Non-Teaching</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                  title="Filter by specific date"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear date filter"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Session Filter Dropdown */}
              <div className="relative">
                <select
                  value={sessionSort}
                  onChange={(e) => setSessionSort(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                >
                  <option value="all">All Sessions</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center">
              {/* Manual Refresh Button */}
              <button
                onClick={fetchAttendance}
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </section>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mt-6">
          {/* Present Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Present</h2>
                </div>
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Present").length}</p>
                <p className="text-green-100 text-xs mt-1">Currently at work</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Absent Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Absent</h2>
                </div>
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Absent").length}</p>
                <p className="text-red-100 text-xs mt-1">Not present today</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Late Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Late</h2>
                </div>
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Late").length}</p>
                <p className="text-orange-100 text-xs mt-1">Arrived late</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Exempted Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Exempted</h2>
                </div>
                <p className="text-2xl font-bold">{filtered.filter((l) => l.status === "Exempted").length}</p>
                <p className="text-blue-100 text-xs mt-1">Schedule exemption</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Working Hours Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Working Hours</h2>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">{totalWorkingHours.hours}</p>
                  <span className="text-sm font-medium">h</span>
                  <p className="text-xl font-bold">{totalWorkingHours.minutes}</p>
                  <span className="text-sm font-medium">m</span>
                </div>
                <p className="text-indigo-100 text-xs mt-1">Total work time today</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Records Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Records</h2>
                </div>
                <p className="text-2xl font-bold">{filtered.length}</p>
                <p className="text-purple-100 text-xs mt-1">{search || regularSortBy !== 'all' ? 'Filtered records' : 'All attendance logs'}</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Attendance Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Attendance Records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Name</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Session</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time In</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Out</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Information</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : regularAttendancePageData.length > 0 ? (
                  regularAttendancePageData.map((log) => (
                    <tr key={log.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{log.name || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(log.role).split(' ').slice(2).join(' ')}`}>
                          {log.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {formatPhilippineDate(log.att_date)}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-700 text-sm">
                        {log.session ? (
                          <div className="flex items-center gap-2">
                            {log.session === 'morning' ? (
                              <>
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                                <span>Morning</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                                <span>Afternoon</span>
                              </>
                            )}
                          </div>
                        ) : '--'}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_in
                          ? formatPhilippineDateTime(log.time_in)
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {log.time_out
                          ? formatPhilippineDateTime(log.time_out)
                          : "--"}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.status === "Present"
                            ? "bg-green-100 text-green-800"
                            : log.status === "Exempted"
                            ? "bg-blue-100 text-blue-800"
                            : log.status === "Late"
                            ? "bg-orange-100 text-orange-800"
                            : log.status === "Absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedUserInfo(log);
                            setShowInfoModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-800 text-white hover:bg-red-900 shadow-sm transition-colors"
                          title="View user information"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Info</span>
                        </button>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {typeof log.id === 'number' ? (
                          <button
                            onClick={() => typeof log.id === 'number' ? setConfirmDeleteId(log.id) : null}
                            disabled={deletingId === log.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            title="Delete attendance record"
                          >
                            {deletingId === log.id ? (
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                                <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8l-1-2H10l-1 2z" />
                              </svg>
                            )}
                            <span>{deletingId === log.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Attendance Records Found</h3>
                          <p className="text-gray-500">Check your search criteria or refresh the data.</p>
                          <button 
                            onClick={fetchAttendance}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Refresh Data
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for Regular Attendance */}
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setRegularAttendancePage((prev) => Math.max(prev - 1, 1))}
              disabled={regularAttendancePage === 1}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>

            <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
              Page {regularAttendancePage} of{" "}
              {Math.ceil(filtered.length / regularAttendanceRow) || 1}
            </span>

            <button
              onClick={() =>
                setRegularAttendancePage((prev) =>
                  prev < Math.ceil(filtered.length / regularAttendanceRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                regularAttendancePage === Math.ceil(filtered.length / regularAttendanceRow) ||
                filtered.length === 0
              }
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Class Schedule Attendance Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {/* Schedule Present Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Present</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Present").length}</p>
                <p className="text-emerald-100 text-xs mt-1">Attended classes</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Schedule Late Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Late</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Late").length}</p>
                <p className="text-amber-100 text-xs mt-1">Late arrivals</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Schedule Absent Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Absent</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Absent" || !r.attendance_record).length}</p>
                <p className="text-rose-100 text-xs mt-1">Missed classes</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Schedule Exempted Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Classes Exempted</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.filter((r) => r.attendance === "Exempted").length}</p>
                <p className="text-blue-100 text-xs mt-1">Schedule exemption</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Schedule Records Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Schedules</h2>
                </div>
                <p className="text-2xl font-bold">{scheduleAttendance.length}</p>
                <p className="text-indigo-100 text-xs mt-1">All class schedules</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Class Schedule Attendance Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Class Schedule Attendance</h2>
            </div>
            
            {/* Schedule Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between mb-4">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                    placeholder="Search by name, role, subject, room..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Role Filter Dropdown for Schedule Attendance */}
                <div className="relative">
                  <select
                    value={scheduleSortBy}
                    onChange={(e) => setScheduleSortBy(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Date Filter for Schedule Attendance */}
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                    title="Filter by specific date"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear date filter"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Role</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Subject</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Schedule</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time In</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Time Out</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading class schedule attendance...</span>
                      </div>
                    </td>
                  </tr>
                ) : attendancePageData.length > 0 ? (
                  attendancePageData.map((record: any) => (
                    <tr key={record.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{formatPhilippineDate(record.att_date)}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">
                            {record.users?.name || 'No Name'}
                          </span>
                          {record.users?.email && (
                            <span className="text-xs text-gray-500">{record.users.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(record.users?.role || '').split(' ').slice(2).join(' ')}`}>
                          {record.users?.role || 'No Role'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-sm">
                            {record.subject || 'N/A'}
                          </span>
                          {record.room && (
                            <span className="text-xs text-gray-500">Room: {record.room}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 text-sm">
                            {record.day_of_week}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatPhilippineTime(record.start_time)} - {formatPhilippineTime(record.end_time)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-green-600 text-sm">
                          {record.time_in ? new Date(record.time_in).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-blue-600 text-sm">
                          {record.time_out ? new Date(record.time_out).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.attendance === "Present"
                            ? "bg-green-100 text-green-800"
                            : record.attendance === "Late"
                            ? "bg-yellow-100 text-yellow-800"
                            : record.attendance === "Absent"
                            ? "bg-red-100 text-red-800"
                            : record.attendance === "Exempted"
                            ? "bg-blue-100 text-blue-800"
                            : record.attendance === "No Record"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {record.attendance === "Present" ? "✅ Present" : 
                           record.attendance === "Late" ? "⏰ Late" :
                           record.attendance === "Absent" ? "❌ Absent" : 
                           record.attendance === "Exempted" ? "✅ Exempted" :
                           record.attendance === "No Record" ? "📋 No Record" :
                           record.attendance || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Class Schedule Attendance Found</h3>
                          <p className="text-gray-500">Faculty and Staff users haven't recorded any class attendance yet.</p>
                          <button 
                            onClick={fetchAttendance}
                            className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                          >
                            Refresh Data
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for Class Schedule Attendance */}
          <div className="flex justify-center space-x-3 items-center mt-6 p-4">
            <button
              onClick={() => setAttendancePage((prev) => Math.max(prev - 1, 1))}
              disabled={attendancePage === 1}
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>

            <span className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
              Page {attendancePage} of{" "}
              {Math.ceil(filteredScheduleAttendance.length / attendanceRow) || 1}
            </span>

            <button
              onClick={() =>
                setAttendancePage((prev) =>
                  prev < Math.ceil(filteredScheduleAttendance.length / attendanceRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                attendancePage === Math.ceil(filteredScheduleAttendance.length / attendanceRow) ||
                filteredScheduleAttendance.length === 0
              }
              className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </main>
      {/* User Information Modal */}
      {showInfoModal && selectedUserInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}></div>
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-800 to-red-900 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-base font-semibold">User Information</h3>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">User ID</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedUserInfo.userId || '--'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Full Name</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedUserInfo.name || '--'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Role</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedUserInfo.role || '--'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Semester</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedUserInfo.semester || '--'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">School Year</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedUserInfo.schoolYear || '--'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Hired Date</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    {selectedUserInfo.hiredDate ? formatPhilippineDate(selectedUserInfo.hiredDate) : '--'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full bg-gradient-to-r from-red-800 to-red-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:from-red-900 hover:to-red-950 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8l-1-2H10l-1 2z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-semibold">Delete Attendance</h3>
              </div>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <p className="text-gray-700 text-sm">Are you sure you want to delete this attendance record? This action cannot be undone.</p>
            </div>
            <div className="px-5 pb-5 flex items-center justify-center gap-3 sticky bottom-0 bg-white border-t border-gray-200 z-10 pt-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAttendance(confirmDeleteId)}
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={deletingId === confirmDeleteId}
              >
                <span className="inline-flex items-center gap-2">
                  {deletingId === confirmDeleteId ? (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8l-1-2H10l-1 2z" />
                    </svg>
                  )}
                  <span>{deletingId === confirmDeleteId ? 'Deleting...' : 'Delete'}</span>
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import { useState, useEffect, useRef } from "react";
import supabase from "../../utils/supabase";
import { spc1, spc2, spc3, spc4 } from "../../utils";
import { Link } from "react-router-dom";
import TapHistory from "./TapHistory";

const Scanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  
  // Session and Action Selection
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [selectedAction, setSelectedAction] = useState<'time_in' | 'time_out'>('time_in');
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success', // 'success', 'error', 'info'
    title: '',
    message: '',
    userName: '',
    userRole: '',
    profilePicture: '',
    time: '',
    action: '' // 'time_in', 'time_out', 'error'
  });

  const carouselImages = [
    { src: spc1, alt: "SPC Image 1" },
    { src: spc2, alt: "SPC Image 2" },
    { src: spc3, alt: "SPC Image 3" },
    { src: spc4, alt: "SPC Image 4" },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  // Auto-close alert after 4 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Refocus hidden input after scan completes to receive next RFID tap
  useEffect(() => {
    if (!loading && hiddenInputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [loading]);

  // Keep hidden input focused at all times for RFID scanning
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // Function to speak text
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Lightweight sound effects using Web Audio API
  const playSound = (type: 'success' | 'error' | 'info') => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);

      if (type === 'success') {
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
      } else if (type === 'error') {
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.2);
      } else {
        oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(740, audioCtx.currentTime + 0.12);
      }

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();

      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      oscillator.stop(audioCtx.currentTime + 0.26);
    } catch (_) {
      // ignore if audio cannot be played (e.g., autoplay policy)
    }
  };

  const speakAttendance = (action: 'time_in' | 'time_out', userName: string, at: Date) => {
    const timeSpoken = at.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const phrase = action === 'time_in' ? 'Time in' : 'Time out';
    speak(`${phrase} for ${userName} at ${timeSpoken}`);
  };

  // Function to log tap to history
  const logTapToHistory = (
    userName: string,
    userRole: string,
    profilePicture: string,
    action: 'time_in' | 'time_out',
    session: 'morning' | 'afternoon',
    type: 'success' | 'error' | 'info'
  ) => {
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    if ((window as any).addTapHistory) {
      (window as any).addTapHistory({
        id: `${Date.now()}-${Math.random()}`,
        userName,
        userRole,
        profilePicture,
        action,
        session,
        time: currentTime,
        timestamp: new Date(),
        type
      });
    }
  };

  // Function to show modern alert
  const showModernAlert = (
    type: 'success' | 'error' | 'info', 
    title: string, 
    message: string, 
    userName: string = '', 
    userRole: string = '',
    profilePicture: string = '',
    action: string = ''
  ) => {
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    setAlertData({
      type,
      title,
      message,
      userName,
      userRole,
      profilePicture,
      time: currentTime,
      action
    });
    setShowAlert(true);
  };

  // Check if user has schedule exemption for current date/time
  const checkScheduleExemption = async (userId: number, currentTime: Date) => {
    try {
      const today = currentTime.toISOString().split('T')[0];
      const currentTimeStr = currentTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      const { data, error } = await supabase
        .from("schedule_exemptions")
        .select("*")
        .eq("user_id", userId)
        .eq("exemption_date", today);

      if (error) {
        console.error('[Scanner] Error checking exemptions:', error);
        return { isExempted: false, reason: null };
      }

      if (!data || data.length === 0) {
        return { isExempted: false, reason: null };
      }

      // Check for full day exemptions (leave requests)
      const fullDayExemption = data.find(exemption => 
        exemption.request_type === 'Leave' || 
        (!exemption.start_time && !exemption.end_time)
      );

      if (fullDayExemption) {
        return { 
          isExempted: true, 
          reason: fullDayExemption.reason,
          type: 'full_day'
        };
      }

      // Check for time-specific exemptions (gate pass requests)
      const timeExemption = data.find(exemption => {
        if (!exemption.start_time || !exemption.end_time) return false;
        
        const exemptionStart = exemption.start_time;
        const exemptionEnd = exemption.end_time;
        
        return currentTimeStr >= exemptionStart && currentTimeStr <= exemptionEnd;
      });

      if (timeExemption) {
        return { 
          isExempted: true, 
          reason: timeExemption.reason,
          type: 'time_specific',
          startTime: timeExemption.start_time,
          endTime: timeExemption.end_time
        };
      }

      return { isExempted: false, reason: null };
    } catch (error) {
      console.error('[Scanner] Error checking schedule exemption:', error);
      return { isExempted: false, reason: null };
    }
  };

  // Round currency consistently to 2 decimals
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  type UserWorkHours = {
    work_am_start?: string | null;
    work_am_end?: string | null;
    work_pm_start?: string | null;
    work_pm_end?: string | null;
  };

  // Helper to parse "HH:MM" time strings into minutes since midnight
  const parseTimeToMinutes = (
    timeStr: string | null | undefined,
    fallbackHour: number,
    fallbackMinute: number
  ): number => {
    if (timeStr && timeStr.includes(":")) {
      const [hStr, mStr] = timeStr.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        return h * 60 + m;
      }
    }
    return fallbackHour * 60 + fallbackMinute;
  };

  // Determine which session (morning or afternoon) based on time and per-user work hours
  const getCurrentSession = (
    currentTime: Date,
    workHours?: UserWorkHours
  ): 'morning' | 'afternoon' => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeMinutes = hour * 60 + minute;

    const amStartMin = parseTimeToMinutes(workHours?.work_am_start, 8, 0); // default 08:00
    const amEndMin = parseTimeToMinutes(workHours?.work_am_end, 12, 0);   // default 12:00
    const pmStartMin = parseTimeToMinutes(workHours?.work_pm_start, 13, 0); // default 13:00
    const pmEndMin = parseTimeToMinutes(workHours?.work_pm_end, 17, 30);   // default 17:30

    console.log(
      `[getCurrentSession] time=${timeMinutes}min, AM=${amStartMin}-${amEndMin}, PM=${pmStartMin}-${pmEndMin}`
    );

    if (timeMinutes >= amStartMin && timeMinutes < amEndMin) {
      return 'morning';
    }
    if (timeMinutes >= pmStartMin && timeMinutes < pmEndMin) {
      return 'afternoon';
    }

    // Fallback: before AM end -> morning, otherwise afternoon
    const fallback = timeMinutes < amEndMin ? 'morning' : 'afternoon';
    console.log(`[getCurrentSession] Fallback session=${fallback}`);
    return fallback;
  };

  // Calculate penalties with precise durations (to the minute) and distinct morning vs afternoon logic
  // Special handling for SA: single session 8 AM - 5:30 PM
  const calculatePenalties = (
    timeIn: Date,
    timeOut: Date | null,
    session: 'morning' | 'afternoon',
    userRole: string = '',
    workHours?: UserWorkHours
  ) => {
    const penalties = {
      lateMinutes: 0,
      overtimeMinutes: 0,
      latePenalty: 0,
      overtimePenalty: 0,
      totalPenalty: 0,
      notes: [] as string[]
    };

    // Build session start/cutoff Date objects for today for exact computation
    const buildTodayAt = (hour: number, minute: number, second = 0) => {
      const d = new Date(timeIn);
      d.setHours(hour, minute, second, 0);
      return d;
    };

    // SA has single session: 8 AM - 5:30 PM
    if (userRole === 'SA') {
      const saStart = buildTodayAt(8, 0, 0); // 8:00 AM
      const saEnd = buildTodayAt(17, 30, 0); // 5:30 PM
      const graceMinutes = 15;
      const latePerMinute = 1;
      const overtimePerMinute = 0.5;

      // Late calculation for time in (8:00 AM + 15 min grace = 8:15 AM)
      const gracePoint = new Date(saStart.getTime() + graceMinutes * 60_000);
      if (timeIn.getTime() > gracePoint.getTime()) {
        const lateMs = timeIn.getTime() - gracePoint.getTime();
        penalties.lateMinutes = Math.ceil(lateMs / 60_000);
        penalties.latePenalty = penalties.lateMinutes * latePerMinute;
        penalties.notes.push(`Late by ${penalties.lateMinutes} minute(s) after ${graceMinutes}-min grace`);
      }

      // Overtime calculation for time out (after 5:00 PM)
      if (timeOut && timeOut.getTime() > saEnd.getTime()) {
        const overtimeMs = timeOut.getTime() - saEnd.getTime();
        penalties.overtimeMinutes = Math.ceil(overtimeMs / 60_000);
        penalties.overtimePenalty = penalties.overtimeMinutes * overtimePerMinute;
        penalties.notes.push(`Overtime by ${penalties.overtimeMinutes} minute(s) past 5:30 PM`);
      }

      penalties.totalPenalty = penalties.latePenalty + penalties.overtimePenalty;
      return penalties;
    }

    // Regular dual session logic for other roles (Faculty, Accounting, Staff)
    const RATES = {
      morning: {
        graceMinutes: 15,
        latePerMinute: 1, // ₱ per minute late
      },
      afternoon: {
        graceMinutes: 15,
        latePerMinute: 1, // ₱ per minute late
        overtimeCutoffHour: 17, // 5:30 PM
        overtimeCutoffMinute: 30, // 5:30 PM
        overtimePerMinute: 0.5, // ₱ per minute overtime after cutoff
      },
    } as const;

    // Derive per-user schedule (falling back to defaults when not set)
    const amStartMin = parseTimeToMinutes(workHours?.work_am_start, 8, 0);
    const pmStartMin = parseTimeToMinutes(workHours?.work_pm_start, 13, 0);
    const pmEndMin = parseTimeToMinutes(
      workHours?.work_pm_end,
      RATES.afternoon.overtimeCutoffHour,
      RATES.afternoon.overtimeCutoffMinute
    );

    const morningStart = buildTodayAt(Math.floor(amStartMin / 60), amStartMin % 60, 0);
    const afternoonStart = buildTodayAt(Math.floor(pmStartMin / 60), pmStartMin % 60, 0);
    const afternoonEnd = buildTodayAt(Math.floor(pmEndMin / 60), pmEndMin % 60, 0);

    // Late calculation — exact to the minute (ceil any seconds into a full minute)
    if (session === 'morning') {
      const gracePoint = new Date(morningStart.getTime() + RATES.morning.graceMinutes * 60_000);
      if (timeIn.getTime() > gracePoint.getTime()) {
        const lateMs = timeIn.getTime() - gracePoint.getTime();
        penalties.lateMinutes = Math.ceil(lateMs / 60_000);
        penalties.latePenalty = penalties.lateMinutes * RATES.morning.latePerMinute;
        penalties.notes.push(`Late for morning session by ${penalties.lateMinutes} minute(s) after ${RATES.morning.graceMinutes}-min grace`);
      }
    } else {
      const gracePoint = new Date(afternoonStart.getTime() + RATES.afternoon.graceMinutes * 60_000);
      if (timeIn.getTime() > gracePoint.getTime()) {
        const lateMs = timeIn.getTime() - gracePoint.getTime();
        penalties.lateMinutes = Math.ceil(lateMs / 60_000);
        penalties.latePenalty = penalties.lateMinutes * RATES.afternoon.latePerMinute;
        penalties.notes.push(`Late for afternoon session by ${penalties.lateMinutes} minute(s) after ${RATES.afternoon.graceMinutes}-min grace`);
      }
    }

    // Overtime calculation (applies only when timeOut is provided)
    if (timeOut) {
      if (timeOut.getTime() > afternoonEnd.getTime()) {
        const overtimeMs = timeOut.getTime() - afternoonEnd.getTime();
        penalties.overtimeMinutes = Math.ceil(overtimeMs / 60_000);
        penalties.overtimePenalty = penalties.overtimeMinutes * RATES.afternoon.overtimePerMinute;
        penalties.notes.push(`Overtime by ${penalties.overtimeMinutes} minute(s) past 5:30 PM`);
      }
    }

    penalties.totalPenalty = penalties.latePenalty + penalties.overtimePenalty;
    return penalties;
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setMessage("");

    try {
      // Use system time directly (laptop time) for consistency with Attendance.tsx
      const now = new Date();
      const phNow = now; // Use system time directly
      
      // Format date as YYYY-MM-DD using system time
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      // Use user-selected session instead of auto-detection
      const activeSession = selectedSession;
      
      console.log(`[Scanner] ========================================`);
      console.log(`[Scanner] 🕒 USING LAPTOP/DEVICE TIME`);
      console.log(`[Scanner] System Date/Time: ${now.toLocaleString()}`);
      console.log(`[Scanner] Date (YYYY-MM-DD): ${today}`);
      console.log(`[Scanner] Time: ${now.toLocaleTimeString()}`);
      console.log(`[Scanner] Selected session: ${activeSession}`);
      console.log(`[Scanner] ========================================`);

      // 🔍 Step 1: Find user with this cardId in users table (including work hours)
      const { data: user, error: userError } = await supabase
        .from("users")
        .select(
          "id, name, role, profile_picture, work_am_start, work_am_end, work_pm_start, work_pm_end"
        ) // fetch profile picture, role, and work hours
        .eq("id", cardId)   // if RFID = users.id
        .maybeSingle();

      if (userError) throw userError;
      if (!user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', 'error');
        playSound('error');
        return;
      }

      // Check if user has a valid role for default scheduling
      const validRoles = ['Faculty', 'SA', 'Accounting', 'Staff', 'Administrator', 'HR Personnel'];
      if (!validRoles.includes(user.role)) {
        showModernAlert('error', 'Invalid Role', `Role ${user.role} is not configured for attendance tracking.`, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'error');
        playSound('error');
        return;
      }

      // 🔍 Step 1.5: Check for schedule exemptions
      const exemptionCheck = await checkScheduleExemption(user.id, now);
      if (exemptionCheck.isExempted) {
        const exemptionMessage = exemptionCheck.type === 'full_day' 
          ? `You are exempted from attendance for the entire day due to: ${exemptionCheck.reason}`
          : `You are exempted from attendance during ${exemptionCheck.startTime} - ${exemptionCheck.endTime} due to: ${exemptionCheck.reason}`;
        
        showModernAlert(
          'info', 
          'Schedule Exempted', 
          exemptionMessage, 
          user.name ?? user.id, 
          user.role ?? '', 
          user.profile_picture ?? '', 
          'exempted'
        );
        playSound('info');
        return;
      }

      // 🔍 Step 2: Check existing attendance records for today
      let { data: existingRecords, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("att_date", today)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // If no records for today's PH date and we are timing out, try to find the latest open record
      if ((!existingRecords || existingRecords.length === 0) && selectedAction === 'time_out') {
        const { data: latestOpen, error: latestErr } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .is('time_out', null)
          .order('created_at', { ascending: false })
          .limit(1);
        if (latestErr) {
          console.error('[Scanner] Error fetching latest open record:', latestErr);
        }
        if (latestOpen && latestOpen.length > 0) {
          existingRecords = latestOpen;
        }
      }

      // ⭐ SPECIAL HANDLING FOR SA: Single session (7 AM - 5 PM)
      if (user.role === 'SA') {
        console.log(`[Scanner] SA user detected - using single session mode`);
        
        // Find any existing record for today (SA only has one record per day)
        const saRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
        
        if (selectedAction === 'time_in') {
          // TIME IN for SA
          if (!saRecord) {
            // Create new record
            const penalties = calculatePenalties(now, null, 'afternoon', user.role);
            const displayPenalty = round2(penalties.latePenalty);
            
            const { error: insertError } = await supabase.from("attendance").insert([{
              user_id: user.id,
              att_date: today,
              time_in: phNow.toISOString(),
              status: true,
              late_minutes: penalties.lateMinutes,
              penalty_amount: displayPenalty,
              notes: `Afternoon session - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${displayPenalty > 0 ? `; Penalty: ₱${displayPenalty}` : ''}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
            }]);

            if (insertError) throw insertError;
            
            const penaltyMessage = `Time In! Welcome! Your attendance has been recorded.`;
            
            showModernAlert(
              'success',
              'Time In Successful',
              penaltyMessage,
              user.name ?? user.id,
              user.role ?? '',
              user.profile_picture ?? '',
              'time_in'
            );
            logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in', 'afternoon', 'success');
            playSound('success');
            speakAttendance('time_in', user.name ?? String(user.id), now);
          } else if (saRecord.time_out) {
            // Already completed for the day
            showModernAlert(
              'info',
              'Already Completed',
              'You have already completed your attendance for today.',
              user.name ?? user.id,
              user.role ?? '',
              user.profile_picture ?? '',
              'completed'
            );
            playSound('info');
          } else {
            // Already timed in, update time in
            const penalties = calculatePenalties(now, null, 'afternoon', user.role);
            const displayPenalty = round2(penalties.latePenalty);
            
            const { error: updateError } = await supabase
              .from("attendance")
              .update({
                time_in: phNow.toISOString(),
                status: true,
                late_minutes: penalties.lateMinutes,
                penalty_amount: displayPenalty,
                notes: `Afternoon session (updated) - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${displayPenalty > 0 ? `; Penalty: ₱${displayPenalty}` : ''}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
              })
              .eq("id", saRecord.id);

            if (updateError) throw updateError;
            
            showModernAlert(
              'success',
              'Time In Updated',
              'Your time in has been updated.',
              user.name ?? user.id,
              user.role ?? '',
              user.profile_picture ?? '',
              'time_in'
            );
            logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in', 'afternoon', 'success');
            playSound('success');
            speakAttendance('time_in', user.name ?? String(user.id), now);
          }
        } else {
          // TIME OUT for SA
          if (!saRecord || !saRecord.time_in) {
            showModernAlert('error', 'No Time In Record', 'You haven\'t timed in yet. Please time in first.', user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'error');
            playSound('error');
          } else if (saRecord.time_out) {
            showModernAlert('info', 'Already Timed Out', 'You have already timed out for today.', user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'completed');
            playSound('info');
          } else {
            // Process time out
            const timeInDate = new Date(saRecord.time_in);
            const penalties = calculatePenalties(timeInDate, now, 'afternoon', user.role);
            const displayOvertime = round2(penalties.overtimePenalty);
            const existingDbPenalty = Number(saRecord.penalty_amount) || 0;
            const displayTotal = round2(existingDbPenalty + displayOvertime);
            
            const { error: updateError } = await supabase
              .from("attendance")
              .update({
                time_out: phNow.toISOString(),
                status: false,
                late_minutes: penalties.lateMinutes,
                overtime_minutes: penalties.overtimeMinutes,
                penalty_amount: displayTotal,
                att_date: today,
                notes: `Afternoon session - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${penalties.overtimeMinutes > 0 ? `; Overtime: ${penalties.overtimeMinutes} min` : ''}; Total Penalty: ₱${displayTotal}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
              })
              .eq("id", saRecord.id);

            if (updateError) throw updateError;
            
            const penaltyMessage = `Time Out! Your departure has been recorded.`;
            
            showModernAlert('success', 'Time Out Successful', penaltyMessage, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_out');
            logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_out', 'afternoon', 'success');
            playSound('success');
            speakAttendance('time_out', user.name ?? String(user.id), now);
          }
        }
        
        // Exit early for SA users
        return;
      }

      // Require configured work hours for non-SA users to use the scanner
      if (user.role !== 'SA') {
        const { work_am_start, work_am_end, work_pm_start, work_pm_end } = user as any;

        console.log('[Scanner] Work hours fetched for user', {
          userId: user.id,
          role: user.role,
          work_am_start,
          work_am_end,
          work_pm_start,
          work_pm_end,
          activeSession,
        });

        // 1) Block if the user has no schedule configured at all
        const hasAnySchedule =
          !!work_am_start ||
          !!work_am_end ||
          !!work_pm_start ||
          !!work_pm_end;

        if (!hasAnySchedule) {
          showModernAlert(
            'error',
            'Work schedule not set',
            'This user does not have work hours configured. Please ask HR to set their AM/PM schedule before scanning.',
            user.name ?? user.id,
            user.role ?? '',
            user.profile_picture ?? '',
            'error'
          );
          playSound('error');
          return;
        }

        // 2) Block per-session if that specific session has no configured schedule
        const hasMorningSchedule = !!work_am_start || !!work_am_end;
        const hasAfternoonSchedule = !!work_pm_start || !!work_pm_end;
        const sessionNameForError = activeSession === 'morning' ? 'Morning' : 'Afternoon';

        const hasSessionSchedule =
          activeSession === 'morning' ? hasMorningSchedule : hasAfternoonSchedule;

        if (!hasSessionSchedule) {
          showModernAlert(
            'error',
            `${sessionNameForError} schedule not set`,
            `This user does not have a ${sessionNameForError.toLowerCase()} schedule configured. Please ask HR to set their ${sessionNameForError.toLowerCase()} schedule before scanning for this session.`,
            user.name ?? user.id,
            user.role ?? '',
            user.profile_picture ?? '',
            'error'
          );
          playSound('error');
          return;
        }
      }

      // Build per-user work hours object once
      const userWorkHours: UserWorkHours = {
        work_am_start: (user as any).work_am_start ?? null,
        work_am_end: (user as any).work_am_end ?? null,
        work_pm_start: (user as any).work_pm_start ?? null,
        work_pm_end: (user as any).work_pm_end ?? null,
      };

      // Separate morning and afternoon records based on notes field (primary) or time_in (fallback)
      const morningRecord = existingRecords?.find(record => {
        // Prefer explicit session tag in notes added by this scanner
        const notes: string = (record.notes || '').toString();
        if (notes.includes('Morning session')) return true;
        // Fallback: check time_in if no explicit session tag
        if (!record.time_in) return false;
        const timeIn = new Date(record.time_in);
        const session = getCurrentSession(timeIn, userWorkHours);
        return session === 'morning';
      });

      const afternoonRecord = existingRecords?.find(record => {
        const notes: string = (record.notes || '').toString();
        if (notes.includes('Afternoon session')) return true;
        // Fallback: check time_in if no explicit session tag
        if (!record.time_in) return false;
        const timeIn = new Date(record.time_in);
        const session = getCurrentSession(timeIn, userWorkHours);
        return session === 'afternoon';
      });

      console.log(`[Scanner] Current session (selected): ${activeSession}`);
      console.log(`[Scanner] Morning record:`, morningRecord ? 'exists' : 'none');
      console.log(`[Scanner] Afternoon record:`, afternoonRecord ? 'exists' : 'none');

      // 🚫 Check if user has completed both sessions (no longer blocks taps; used only for logging)
      const morningCompleted = morningRecord && morningRecord.time_in && morningRecord.time_out;
      const afternoonCompleted = afternoonRecord && afternoonRecord.time_in && afternoonRecord.time_out;
      if (morningCompleted && afternoonCompleted) {
        console.log(`[Scanner] User ${user.name} already has completed morning and afternoon sessions today – allowing additional scans as extra records.`);
      }

      // Determine current session record based on user selection
      const currentRecord = activeSession === 'morning' ? morningRecord : afternoonRecord;
      const sessionName = activeSession === 'morning' ? 'Morning' : 'Afternoon';

      // Handle based on selected action (Time In or Time Out)
      if (selectedAction === 'time_in') {
        // TIME IN ACTION: create or update records, allowing re-entry even after a completed session
        if (!currentRecord) {
          // Create new record for this session
          const penalties = calculatePenalties(now, null, activeSession, user.role, userWorkHours);
          const displayPenalty = round2(penalties.latePenalty);
          
          const { error: insertError } = await supabase.from("attendance").insert([
            {
              user_id: user.id,
              att_date: today,
              time_in: phNow.toISOString(),
              status: true,
              late_minutes: penalties.lateMinutes,
              penalty_amount: displayPenalty,
              notes: `${sessionName} session - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${displayPenalty > 0 ? `; Penalty: ₱${displayPenalty}` : ''}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
            },
          ]);

          if (insertError) throw insertError;
          
          console.log(`[Scanner] Created new ${sessionName} session record for user ${user.name}`);
          
          const penaltyMessage = `${sessionName} Time In! Welcome! Your attendance has been recorded.`;
          
          showModernAlert(
            'success',
            'Time In Successful',
            penaltyMessage,
            user.name ?? user.id,
            user.role ?? '',
            user.profile_picture ?? '',
            'time_in'
          );
          logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in', activeSession, 'success');
          playSound('success');
          speakAttendance('time_in', user.name ?? String(user.id), now);
        } else if (currentRecord.time_out) {
          // Current session already has time_out – create a NEW record for re-entry
          const penalties = calculatePenalties(now, null, activeSession, user.role, userWorkHours);
          const displayPenalty = round2(penalties.latePenalty);
          
          const { error: insertError } = await supabase.from("attendance").insert([
            {
              user_id: user.id,
              att_date: today,
              time_in: phNow.toISOString(),
              status: true,
              late_minutes: penalties.lateMinutes,
              penalty_amount: displayPenalty,
              notes: `${sessionName} session (re-entry) - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${displayPenalty > 0 ? `; Penalty: ₱${displayPenalty}` : ''}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
            },
          ]);

          if (insertError) throw insertError;
          
          console.log(`[Scanner] Created re-entry ${sessionName} session record for user ${user.name}`);
          
          const penaltyMessage = `${sessionName} Time In! Welcome back! Your re-entry has been recorded.`;
          
          showModernAlert(
            'success',
            'Time In Successful',
            penaltyMessage,
            user.name ?? user.id,
            user.role ?? '',
            user.profile_picture ?? '',
            'time_in'
          );
          logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in', activeSession, 'success');
          playSound('success');
          speakAttendance('time_in', user.name ?? String(user.id), now);
        } else {
          // Existing record has time_in but no time_out – update time in
          const penalties = calculatePenalties(now, null, activeSession, user.role, userWorkHours);
          const displayPenalty = round2(penalties.latePenalty);
          
          const { error: updateError } = await supabase
            .from("attendance")
            .update({
              time_in: phNow.toISOString(),
              status: true,
              late_minutes: penalties.lateMinutes,
              overtime_minutes: 0,
              penalty_amount: displayPenalty,
              notes: `${sessionName} session (updated) - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${displayPenalty > 0 ? `; Penalty: ₱${displayPenalty}` : ''}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
            })
            .eq("id", currentRecord.id);

          if (updateError) throw updateError;
          
          console.log(`[Scanner] Updated ${sessionName} session record for user ${user.name}`);
          
          const penaltyMessage = `${sessionName} Time In! Your attendance has been updated.`;
          
          showModernAlert(
            'success',
            'Time In Successful',
            penaltyMessage,
            user.name ?? user.id,
            user.role ?? '',
            user.profile_picture ?? '',
            'time_in'
          );
          logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in', activeSession, 'success');
          playSound('success');
          speakAttendance('time_in', user.name ?? String(user.id), now);
        }
      } else {
        // TIME OUT ACTION
        // Choose the correct open record to close (prefer matching selected session; otherwise latest open record)
        const openRecords = (existingRecords || []).filter(r => r.time_in && !r.time_out);

        let recordToUpdate = currentRecord && !currentRecord.time_out ? currentRecord : undefined;

        if (!recordToUpdate) {
          // Try to find an open record whose session from time_in matches the selected session
          const matchingOpen = openRecords.find(r => getCurrentSession(new Date(r.time_in)) === activeSession);
          if (matchingOpen) {
            recordToUpdate = matchingOpen;
          } else if (openRecords.length > 0) {
            // Fallback: pick the latest open record by time_in
            recordToUpdate = openRecords.sort((a, b) => new Date(b.time_in).getTime() - new Date(a.time_in).getTime())[0];
          }
        }

        if (!recordToUpdate) {
          showModernAlert('error', 'No Time In Record', `You haven't timed in for the ${sessionName.toLowerCase()} session yet. Please time in first.`, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'error');
          playSound('error');
          return;
        }

        const timeInDate = new Date(recordToUpdate.time_in);
        // Determine session for penalty calculation with reliable precedence:
        // 1) Explicit session tag in notes
        // 2) User-selected session at scan time
        // 3) Fallback: infer from time_in clock time
        const recordNotes: string = (recordToUpdate.notes || '').toString();
        const sessionFromNotes = recordNotes.includes('Afternoon session')
          ? 'afternoon'
          : (recordNotes.includes('Morning session') ? 'morning' : null);
        const resolvedSession = (sessionFromNotes || activeSession || getCurrentSession(timeInDate, userWorkHours)) as 'morning' | 'afternoon';
        const sessionLabel = resolvedSession === 'morning' ? 'Morning' : 'Afternoon';
        const penalties = calculatePenalties(timeInDate, now, resolvedSession, user.role, userWorkHours);
        const displayOvertime = round2(penalties.overtimePenalty);
        // Add overtime to whatever late penalty was stored at time-in
        const existingDbPenalty = Number(recordToUpdate.penalty_amount) || 0;
        const displayTotal = round2(existingDbPenalty + displayOvertime);
        
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: phNow.toISOString(),
            status: false,
            late_minutes: penalties.lateMinutes,
            overtime_minutes: penalties.overtimeMinutes,
            penalty_amount: displayTotal,
            att_date: today, // ensure record is attributed to today's PH date
            notes: `${sessionLabel} session - Status: ${penalties.lateMinutes > 0 ? `Late by ${penalties.lateMinutes} min` : 'On time'}${penalties.overtimeMinutes > 0 ? `; Overtime: ${penalties.overtimeMinutes} min` : ''}; Total Penalty: ₱${displayTotal}${penalties.notes.length ? `; ${penalties.notes.join('; ')}` : ''}`
          })
          .eq("id", recordToUpdate.id);

        if (updateError) throw updateError;
        
        const penaltyMessage = `${sessionLabel} Time Out! Your departure has been recorded.`;
        
        showModernAlert('success', 'Time Out Successful', penaltyMessage, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_out');
        logTapToHistory(user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_out', activeSession, 'success');
        playSound('success');
        speakAttendance('time_out', user.name ?? String(user.id), now);
      }
    } catch (err: any) {
      console.error(err);
      showModernAlert('error', 'System Error', 'Unable to record attendance. Please try again.', '', '', '', 'error');
      playSound('error');
    } finally {
      setLoading(false);
      setScannedCard(""); // clear input for next scan
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 relative overflow-hidden">
      
      {/* Background Carousel */}
      <div className="absolute inset-0 overflow-hidden">
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-30' : 'opacity-0'
            }`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-red-900/60 to-slate-900/80"></div>
      </div>
      
      {/* Back to Home Button - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <Link
          to="/"
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {/* Scanner Interface - Centered Overlay */}
      <div 
        className="absolute inset-0 z-20 flex items-center justify-center gap-6 p-4"
        onClick={() => {
          // Refocus hidden input when clicking anywhere on scanner
          if (!loading && hiddenInputRef.current) {
            hiddenInputRef.current.focus();
          }
        }}
      >
        {/* Main Scanner Container */}
        <div 
          className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border-2 border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Animated Border Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse rounded-2xl"></div>
          
          {/* Content Container */}
          <div className="relative z-10 p-4">
            
            {/* Scanner Header with Icon */}
            <div className="text-center mb-4">
              <div className="relative inline-block mb-3">
                {/* Outer Rotating Ring */}
                <div className="absolute inset-0 w-14 h-14 border-2 border-red-500/30 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
                
                {/* Inner Icon Container */}
                <div className="relative w-14 h-14 bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-500/50">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 mb-1 tracking-tight">
                RFID SCANNER
              </h2>
              <p className="text-xs text-white/80 font-medium">Attendance Management System</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">System Online</span>
              </div>
            </div>

            {/* Scanner Status - Compact Visual Area */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-red-500/20 rounded-xl p-3 mb-3 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"></div>
              </div>
              
              <div className="relative z-10 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    {/* Compact Spinner */}
                    <div className="relative">
                      <div className="w-12 h-12 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Processing...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {/* Compact Scanning Animation */}
                    <div className="relative w-16 h-16">
                      {/* Outer Pulse Rings */}
                      <div className="absolute inset-0 border-2 border-red-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                      
                      {/* Center Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/50">
                          <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-white font-bold text-sm animate-pulse">READY TO SCAN</p>
                      <p className="text-white/70 text-xs">Tap card or enter ID</p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-[10px] font-semibold uppercase tracking-wider">RFID Active</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Selection Buttons */}
            <div className="mb-3">
              <label className="block text-white font-bold text-xs mb-1.5 text-center">Select Session</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedSession('morning');
                    speak('Morning session selected');
                    // Refocus hidden input after button click
                    setTimeout(() => hiddenInputRef.current?.focus(), 50);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                    selectedSession === 'morning'
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg scale-105'
                      : 'bg-slate-700/50 text-white/70 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Morning</span>
                  <span className="text-[10px]">(8AM-12NN)</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedSession('afternoon');
                    speak('Afternoon session selected');
                    // Refocus hidden input after button click
                    setTimeout(() => hiddenInputRef.current?.focus(), 50);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                    selectedSession === 'afternoon'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-105'
                      : 'bg-slate-700/50 text-white/70 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Afternoon</span>
                  <span className="text-[10px]">(1PM-5:30PM)</span>
                </button>
              </div>
            </div>

            {/* Action Selection Buttons */}
            <div className="mb-3">
              <label className="block text-white font-bold text-xs mb-1.5 text-center">Select Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedAction('time_in');
                    speak('Time in selected');
                    // Refocus hidden input after button click
                    setTimeout(() => hiddenInputRef.current?.focus(), 50);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    selectedAction === 'time_in'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-slate-700/50 text-white/70 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Time In
                </button>
                <button
                  onClick={() => {
                    setSelectedAction('time_out');
                    speak('Time out selected');
                    // Refocus hidden input after button click
                    setTimeout(() => hiddenInputRef.current?.focus(), 50);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    selectedAction === 'time_out'
                      ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg scale-105'
                      : 'bg-slate-700/50 text-white/70 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Time Out
                </button>
              </div>
            </div>

            {/* Hidden Input for RFID Scanner */}
            <input
              ref={hiddenInputRef}
              autoFocus
              type="text"
              value={scannedCard}
              onChange={(e) => setScannedCard(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && scannedCard.trim() !== "") {
                  handleScan(scannedCard.trim());
                }
              }}
              className="opacity-0 absolute -left-96"
              placeholder="RFID will be scanned here"
            />

            {/* Manual Input Section - Compact */}
            <div className="space-y-2">
              <div className="flex flex-col">
                <label className="mb-1.5 text-white font-bold text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Manual Entry
                </label>
                <input
                  type="text"
                  value={scannedCard}
                  onChange={(e) => setScannedCard(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && scannedCard.trim() !== "") {
                      handleScan(scannedCard.trim());
                    }
                  }}
                  onBlur={() => {
                    // Refocus hidden input when manual input loses focus
                    setTimeout(() => {
                      hiddenInputRef.current?.focus();
                    }, 100);
                  }}
                  className="w-full h-10 px-3 bg-slate-800/50 backdrop-blur-md border-2 border-red-500/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300 shadow-lg"
                  placeholder="Enter card ID"
                  disabled={loading}
                />
              </div>
              
              <button
                onClick={() => {
                  if (scannedCard.trim() !== "") {
                    handleScan(scannedCard.trim());
                  }
                }}
                disabled={loading || !scannedCard.trim()}
                className="w-full h-10 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Attendance
                  </>
                )}
              </button>
            </div>

            {/* Status Message - Compact */}
            {message && (
              <div className="mt-4 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md border-2 border-red-500/30 rounded-lg shadow-lg">
                <p className="text-white text-center font-semibold text-sm">{message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tap History Container */}
        <div 
          className="hidden xl:block max-w-md w-full max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <TapHistory />
        </div>
      </div>

      {/* Modern Tapping System Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAlert(false)}
          />
          
          {/* Modern Tapping Modal */}
          <div className={`relative transform transition-all duration-700 ease-out ${
            showAlert ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
          }`}>
            
            {/* Main Modal Container */}
            <div className={`relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden max-w-lg w-full mx-4 ${
              alertData.type === 'success' 
                ? 'ring-4 ring-green-400/30' 
                : (alertData.type === 'error' && alertData.action === 'time_out')
                  ? 'ring-4 ring-orange-400/30'
                  : alertData.type === 'error' 
                    ? 'ring-4 ring-red-400/30'
                    : alertData.type === 'info'
                      ? 'ring-4 ring-blue-400/30'
                      : 'ring-4 ring-blue-400/30'
            }`}>
              
              {/* Animated Status Bar */}
              <div className={`h-2 w-full ${
                alertData.type === 'success' 
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                  : (alertData.type === 'error' && alertData.action === 'time_out')
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                    : alertData.type === 'error' 
                      ? 'bg-gradient-to-r from-red-400 to-rose-500'
                      : alertData.type === 'info'
                        ? 'bg-gradient-to-r from-blue-400 to-sky-500'
                        : 'bg-gradient-to-r from-blue-400 to-sky-500'
              } animate-pulse`} />

              {/* Close Button */}
              <button
                onClick={() => setShowAlert(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/10 z-10"
              >
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content Container */}
              <div className="px-8 py-6">
                
                {/* Large Profile Picture Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    {/* Outer Glow Ring */}
                    <div className={`absolute inset-0 rounded-full blur-xl ${
                      alertData.type === 'success' 
                        ? 'bg-green-400/40' 
                        : (alertData.type === 'error' && alertData.action === 'time_out')
                          ? 'bg-orange-400/40'
                          : alertData.type === 'error' 
                            ? 'bg-red-400/40'
                            : alertData.type === 'info'
                              ? 'bg-blue-400/40'
                              : 'bg-blue-400/40'
                    } animate-pulse`} />
                    
                    {/* Profile Picture Container */}
                    <div className="relative">
                      {alertData.profilePicture ? (
                        <img
                          src={alertData.profilePicture}
                          alt={alertData.userName}
                          className={`w-48 h-48 rounded-full object-cover border-4 shadow-2xl transition-all duration-500 ${
                            alertData.type === 'success' 
                              ? 'border-green-400' 
                              : (alertData.type === 'error' && alertData.action === 'time_out')
                                ? 'border-orange-400'
                                : alertData.type === 'error' 
                                  ? 'border-red-400'
                                  : alertData.type === 'info'
                                    ? 'border-blue-400'
                                    : 'border-blue-400'
                          }`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback Large Avatar */}
                      <div 
                        className={`w-48 h-48 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                          !alertData.profilePicture ? 'flex' : 'hidden'
                        } ${
                          alertData.type === 'success' 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400' 
                            : (alertData.type === 'error' && alertData.action === 'time_out')
                              ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400'
                              : alertData.type === 'error' 
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400'
                                : alertData.type === 'info'
                                  ? 'bg-gradient-to-br from-blue-500 to-sky-600 border-blue-400'
                                  : 'bg-gradient-to-br from-blue-500 to-sky-600 border-blue-400'
                        }`}
                      >
                        {alertData.userName ? (
                          <span className="text-6xl font-bold text-white">
                            {alertData.userName.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Large Status Badge */}
                    <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl ${
                      alertData.type === 'success' 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                        : (alertData.type === 'error' && alertData.action === 'time_out')
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                          : alertData.type === 'error' 
                            ? 'bg-gradient-to-br from-red-500 to-rose-600'
                            : alertData.type === 'info'
                              ? 'bg-gradient-to-br from-blue-500 to-sky-600'
                              : 'bg-gradient-to-br from-blue-500 to-sky-600'
                    } animate-bounce`}>
                      {alertData.type === 'success' ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      ) : (alertData.type === 'error' && alertData.action === 'time_out') ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      ) : alertData.type === 'error' ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : alertData.type === 'info' ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Information */}
                {alertData.userName && (
                  <div className="text-center mb-4">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {alertData.userName}
                    </h2>
                    {alertData.userRole && (
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wider ${
                        alertData.type === 'success' 
                          ? 'bg-green-400/20 text-green-300 border border-green-400/30' 
                          : (alertData.type === 'error' && alertData.action === 'time_out')
                            ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30'
                            : alertData.type === 'error' 
                              ? 'bg-red-400/20 text-red-300 border border-red-400/30'
                              : alertData.type === 'info'
                                ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                                : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                      }`}>
                        {alertData.userRole}
                      </div>
                    )}
                  </div>
                )}

                {/* Status Message */}
                <div className="text-center mb-4">
                  <h3 className={`text-2xl font-bold mb-3 ${
                    alertData.type === 'success' 
                      ? 'text-green-400' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'text-orange-400'
                        : alertData.type === 'error' 
                          ? 'text-red-400'
                          : alertData.type === 'info'
                            ? 'text-blue-400'
                            : 'text-blue-400'
                  }`}>
                    {alertData.title}
                  </h3>
                  
                  <p className="text-white/80 text-lg leading-relaxed">
                    {alertData.message}
                  </p>
                </div>

                {/* Time and Date Display */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-center gap-3 text-white/70">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono text-lg font-semibold">{alertData.time}</span>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-white/50 text-sm">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAlert(false)}
                    className={`px-8 py-4 rounded-2xl font-semibold text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg ${
                      alertData.type === 'success' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                        : (alertData.type === 'error' && alertData.action === 'time_out')
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                          : alertData.type === 'error' 
                            ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                            : alertData.type === 'info'
                              ? 'bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'
                              : 'bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
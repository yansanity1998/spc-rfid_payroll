import { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import { titlelogo, spc1, spc2, spc3, spc4 } from "../../utils";
import { Link } from "react-router-dom";

const Scanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
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

  // Determine which session (morning or afternoon) based on current time
  const getCurrentSession = (currentTime: Date) => {
    const phTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const timePH = phTime.format(currentTime);
    const [hour, minute] = timePH.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;

    // Morning session: 7:00 AM - 12:00 PM
    if (timeMinutes >= 7 * 60 && timeMinutes < 12 * 60) {
      return 'morning';
    }
    // Afternoon session: 1:00 PM - 7:00 PM
    if (timeMinutes >= 13 * 60 && timeMinutes < 19 * 60) {
      return 'afternoon';
    }
    // Default to morning if before 7 AM, afternoon if after 7 PM
    return timeMinutes < 12 * 60 ? 'morning' : 'afternoon';
  };

  // Calculate penalties with 15-minute grace period
  const calculatePenalties = (timeIn: Date, timeOut: Date | null, session: 'morning' | 'afternoon') => {
    const penalties = {
      lateMinutes: 0,
      overtimeMinutes: 0,
      latePenalty: 0,
      overtimePenalty: 0,
      totalPenalty: 0,
      notes: [] as string[]
    };

    // Philippine timezone
    const phTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const timeInPH = phTime.format(timeIn);
    const [timeInHour, timeInMinute] = timeInPH.split(':').map(Number);
    const timeInMinutes = timeInHour * 60 + timeInMinute;

    // Schedule times with 15-minute grace period
    const morningStartMinutes = 7 * 60; // 7:00 AM
    const morningGraceMinutes = morningStartMinutes + 15; // 7:15 AM (grace period)
    const afternoonStartMinutes = 13 * 60; // 1:00 PM
    const afternoonGraceMinutes = afternoonStartMinutes + 15; // 1:15 PM (grace period)
    const afternoonEndMinutes = 19 * 60; // 7:00 PM

    // Calculate late minutes for morning session
    if (session === 'morning') {
      if (timeInMinutes > morningGraceMinutes) {
        penalties.lateMinutes = timeInMinutes - morningGraceMinutes;
        penalties.latePenalty = penalties.lateMinutes * 1; // ₱1 per minute late after grace period
        penalties.notes.push(`Late for morning session by ${penalties.lateMinutes} minutes (after 15-min grace period)`);
      }
    }
    
    // Calculate late minutes for afternoon session
    if (session === 'afternoon') {
      if (timeInMinutes > afternoonGraceMinutes) {
        penalties.lateMinutes = timeInMinutes - afternoonGraceMinutes;
        penalties.latePenalty = penalties.lateMinutes * 1; // ₱1 per minute late after grace period
        penalties.notes.push(`Late for afternoon session by ${penalties.lateMinutes} minutes (after 15-min grace period)`);
      }
    }

    // Check overtime if time out is provided
    if (timeOut) {
      const timeOutPH = phTime.format(timeOut);
      const [timeOutHour, timeOutMinute] = timeOutPH.split(':').map(Number);
      const timeOutMinutes = timeOutHour * 60 + timeOutMinute;

      // Check overtime past 7:00 PM
      if (timeOutMinutes > afternoonEndMinutes) {
        penalties.overtimeMinutes = timeOutMinutes - afternoonEndMinutes;
        penalties.overtimePenalty = penalties.overtimeMinutes * 0.5; // ₱0.50 per minute overtime
        penalties.notes.push(`Overtime by ${penalties.overtimeMinutes} minutes past 7:00 PM`);
      }
    }

    penalties.totalPenalty = penalties.latePenalty + penalties.overtimePenalty;
    return penalties;
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setMessage("");

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const now = new Date();
      const currentSession = getCurrentSession(now);

      // 🔍 Step 1: Find user with this cardId in users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, role, profile_picture") // fetch profile picture and role
        .eq("id", cardId)   // if RFID = users.id
        .maybeSingle();

      if (userError) throw userError;
      if (!user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', 'error');
        return;
      }

      // Check if user has a valid role for default scheduling
      const validRoles = ['Faculty', 'SA', 'Accounting', 'Staff'];
      if (!validRoles.includes(user.role)) {
        showModernAlert('error', 'Invalid Role', `Role ${user.role} is not configured for attendance tracking.`, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'error');
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
        return;
      }

      // 🔍 Step 2: Check existing attendance records for today (both morning and afternoon)
      const { data: existingRecords, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("att_date", today)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // Separate morning and afternoon records
      const morningRecord = existingRecords?.find(record => {
        if (!record.time_in) return false;
        const timeIn = new Date(record.time_in);
        const session = getCurrentSession(timeIn);
        return session === 'morning';
      });

      const afternoonRecord = existingRecords?.find(record => {
        if (!record.time_in) return false;
        const timeIn = new Date(record.time_in);
        const session = getCurrentSession(timeIn);
        return session === 'afternoon';
      });

      console.log(`[Scanner] Current session: ${currentSession}`);
      console.log(`[Scanner] Morning record:`, morningRecord ? 'exists' : 'none');
      console.log(`[Scanner] Afternoon record:`, afternoonRecord ? 'exists' : 'none');

      // 🚫 Check if user has completed both sessions (prevent multiple entries)
      const morningCompleted = morningRecord && morningRecord.time_in && morningRecord.time_out;
      const afternoonCompleted = afternoonRecord && afternoonRecord.time_in && afternoonRecord.time_out;
      
      if (morningCompleted && afternoonCompleted) {
        console.log(`[Scanner] User ${user.name} has completed both morning and afternoon sessions - blocking further taps`);
        showModernAlert(
          'info', 
          'All Sessions Completed', 
          'You have already completed both morning and afternoon sessions for today. No additional attendance recording is needed.', 
          user.name ?? user.id, 
          user.role ?? '', 
          user.profile_picture ?? '', 
          'completed'
        );
        return;
      }

      // Determine current session record
      const currentRecord = currentSession === 'morning' ? morningRecord : afternoonRecord;

      if (!currentRecord) {
        // ✅ First scan for this session → Time In
        const penalties = calculatePenalties(now, null, currentSession);
        
        const { error: insertError } = await supabase.from("attendance").insert([
          {
            user_id: user.id,
            att_date: today,
            time_in: now.toISOString(),
            status: true,
            late_minutes: penalties.lateMinutes,
            penalty_amount: penalties.latePenalty,
            notes: `${currentSession.charAt(0).toUpperCase() + currentSession.slice(1)} session - ${penalties.notes.join('; ') || 'On time'}`
          },
        ]);

        if (insertError) throw insertError;
        
        const sessionName = currentSession === 'morning' ? 'Morning' : 'Afternoon';
        const penaltyMessage = penalties.latePenalty > 0 
          ? `${sessionName} Time In! Penalty: ₱${penalties.latePenalty} for being ${penalties.lateMinutes} minutes late (after 15-min grace period).`
          : `${sessionName} Time In! Welcome! Your attendance has been recorded.`;
          
        showModernAlert('success', 'Time In Successful', penaltyMessage, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in');
      } else if (!currentRecord.time_out) {
        // ✅ Currently timed in for this session → Time Out
        const timeInDate = new Date(currentRecord.time_in);
        const penalties = calculatePenalties(timeInDate, now, currentSession);
        
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: now.toISOString(),
            status: false,
            overtime_minutes: penalties.overtimeMinutes,
            penalty_amount: penalties.totalPenalty,
            notes: `${currentSession.charAt(0).toUpperCase() + currentSession.slice(1)} session - ${penalties.notes.join('; ') || currentRecord.notes || 'Completed'}`
          })
          .eq("id", currentRecord.id);

        if (updateError) throw updateError;
        
        const sessionName = currentSession === 'morning' ? 'Morning' : 'Afternoon';
        const penaltyMessage = penalties.overtimePenalty > 0 
          ? `${sessionName} Time Out! Overtime penalty: ₱${penalties.overtimePenalty} for ${penalties.overtimeMinutes} minutes past 7:00 PM.`
          : `${sessionName} Time Out! Your departure has been recorded.`;
          
        showModernAlert('error', 'Time Out Successful', penaltyMessage, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_out');
      } else {
        // ✅ Already completed this session → Time In again for same session
        const penalties = calculatePenalties(now, null, currentSession);
        
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_in: now.toISOString(),
            time_out: null, // Clear previous time_out
            status: true,
            late_minutes: penalties.lateMinutes,
            overtime_minutes: 0, // Reset overtime since this is a new time in
            penalty_amount: penalties.latePenalty, // Only late penalty for new time in
            notes: `${currentSession.charAt(0).toUpperCase() + currentSession.slice(1)} session (return) - ${penalties.notes.join('; ') || 'On time'}`
          })
          .eq("id", currentRecord.id);

        if (updateError) throw updateError;
        
        const sessionName = currentSession === 'morning' ? 'Morning' : 'Afternoon';
        const penaltyMessage = penalties.latePenalty > 0 
          ? `${sessionName} Return! Penalty: ₱${penalties.latePenalty} for being ${penalties.lateMinutes} minutes late (after 15-min grace period).`
          : `${sessionName} Return! Welcome back! Your return has been recorded.`;
          
        showModernAlert('success', 'Time In Successful', penaltyMessage, user.name ?? user.id, user.role ?? '', user.profile_picture ?? '', 'time_in');
      }
    } catch (err: any) {
      console.error(err);
      showModernAlert('error', 'System Error', 'Unable to record attendance. Please try again.', '', '', '', 'error');
    } finally {
      setLoading(false);
      setScannedCard(""); // clear input for next scan
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      
      {/* Header - Absolute positioned over carousel */}
      <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-6 lg:p-8">
        {/* Logo and System Text - Upper Left */}
        <div className="flex items-center gap-4">
          <img 
            src={titlelogo} 
            alt="SPC Logo" 
            className="h-12 lg:h-16 w-auto drop-shadow-2xl"
          />
          <div className="text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
              SPC RFID & PAYROLL
            </h1>
            <p className="text-sm lg:text-base text-white/90 font-medium drop-shadow-md">
              Attendance Scanner
            </p>
          </div>
        </div>

        {/* Back Button - Upper Right */}
        <Link
          to="/"
          className="group relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:bg-white/20 hover:scale-105 shadow-lg"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </span>
          <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Link>
      </header>

      {/* Full Screen Carousel Background */}
      <div className="relative z-10 flex flex-col h-screen">
        <div className="relative w-full h-full">
          <div className="relative w-full h-full overflow-hidden">
            {/* Carousel Images */}
            <div className="relative w-full h-full">
              {carouselImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentSlide 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover object-center select-none"
                    style={{
                      imageRendering: 'auto',
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Interface - Centered Overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border-2 border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)] max-w-md w-full mx-4 overflow-hidden">
          
          {/* Animated Border Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse rounded-2xl"></div>
          
          {/* Content Container */}
          <div className="relative z-10 p-6">
            
            {/* Scanner Header with Icon */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                {/* Outer Rotating Ring */}
                <div className="absolute inset-0 w-20 h-20 border-3 border-red-500/30 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
                
                {/* Inner Icon Container */}
                <div className="relative w-20 h-20 bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-500/50">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 mb-2 tracking-tight">
                RFID SCANNER
              </h2>
              <p className="text-sm text-white/80 font-medium">Attendance Management System</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">System Online</span>
              </div>
            </div>

            {/* Scanner Status - Compact Visual Area */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-red-500/20 rounded-xl p-6 mb-6 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"></div>
              </div>
              
              <div className="relative z-10 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    {/* Compact Spinner */}
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg mb-1">Processing Scan...</p>
                      <p className="text-white/60 text-sm">Please wait</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {/* Compact Scanning Animation */}
                    <div className="relative w-24 h-24">
                      {/* Outer Pulse Rings */}
                      <div className="absolute inset-0 border-3 border-red-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                      <div className="absolute inset-2 border-3 border-orange-500/30 rounded-full animate-ping" style={{ animationDuration: '2.5s' }}></div>
                      
                      {/* Center Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50">
                          <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-white font-bold text-xl mb-1 animate-pulse">READY TO SCAN</p>
                      <p className="text-white/70 text-sm">Tap your RFID card</p>
                      <p className="text-white/50 text-xs mt-1">or enter ID manually</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden Input for RFID Scanner */}
            <input
              autoFocus
              type="text"
              value={scannedCard}
              onChange={(e) => setScannedCard(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && scannedCard.trim() !== "") {
                  handleScan(scannedCard.trim());
                }
              }}
              className="opacity-0 absolute -left-96 pointer-events-none"
              placeholder="RFID will be scanned here"
            />

            {/* Manual Input Section - Compact */}
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="mb-2 text-white font-bold text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full h-12 px-4 bg-slate-800/50 backdrop-blur-md border-2 border-red-500/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300 shadow-lg"
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
                className="w-full h-12 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white font-bold rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

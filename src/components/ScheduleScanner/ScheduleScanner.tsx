import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase';
import { Toaster } from 'react-hot-toast';

interface Schedule {
  id: number;
  user_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject?: string;
  room?: string;
  notes?: string;
}

const ScheduleScanner: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scannedCard, setScannedCard] = useState('');
  const [scannerLoading, setScannerLoading] = useState(false);
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success',
    title: '',
    message: '',
    userName: '',
    userRole: '',
    profilePicture: '',
    subject: '',
    room: '',
    status: '',
    time: '',
    action: ''
  });

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
        console.error('[ScheduleScanner] Error checking exemptions:', error);
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
      console.error('[ScheduleScanner] Error checking schedule exemption:', error);
      return { isExempted: false, reason: null };
    }
  };

  // Helper function to format time in Philippine timezone with AM/PM
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return "N/A";
    
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    return timeString;
  };

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  // Keep scanner input focused for continuous scanning
  useEffect(() => {
    const focusInterval = setInterval(() => {
      const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
      if (hiddenInput && document.activeElement !== hiddenInput) {
        hiddenInput.focus();
      }
    }, 1000);

    return () => clearInterval(focusInterval);
  }, []);

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
    subject: string = '', 
    room: string = '', 
    status: string = '', 
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
      subject,
      room,
      status,
      time: currentTime,
      action
    });
    setShowAlert(true);
  };

  // Fetch all schedules
  const fetchAllSchedules = async () => {
    try {
      console.log('Fetching all schedules for scanner...');
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all schedules:', error);
        return;
      }
      
      console.log('All schedules loaded:', data?.length || 0);
      setSchedules(data || []);
      
    } catch (error: any) {
      console.error('Error in fetchAllSchedules:', error);
    }
  };

  // RFID Scanner Functions
  const getCurrentDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const getAttendanceStatus = (currentTime: string, startTime: string, endTime: string) => {
    const current = new Date(`2000-01-01 ${currentTime}`);
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const lateThreshold = new Date(start.getTime() + 15 * 60 * 1000);
    
    if (current < start) {
      return { status: 'Early', canTap: false };
    } else if (current >= start && current <= lateThreshold) {
      return { status: 'Present', canTap: true };
    } else if (current > lateThreshold && current <= end) {
      return { status: 'Late', canTap: true };
    } else {
      return { status: 'Absent', canTap: false };
    }
  };

  const findActiveSchedules = (userId: number) => {
    const currentDay = getCurrentDayOfWeek();
    const currentTime = getCurrentTime();
    
    const userSchedules = schedules.filter(s => 
      s.user_id === userId &&
      s.day_of_week === currentDay
    );
    
    if (userSchedules.length === 0) return [];
    
    return userSchedules.map(schedule => {
      const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
      return {
        ...schedule,
        attendanceStatus: attendanceStatus.status,
        canTap: attendanceStatus.canTap
      };
    });
  };

  // Function to create absent record
  const createAbsentRecord = async (user: any, schedule: any, date: string) => {
    try {
      const { error } = await supabase
        .from('class_attendance')
        .insert([
          {
            user_id: user.id,
            schedule_id: schedule.id,
            att_date: date,
            time_in: null,
            time_out: null,
            attendance: 'Absent',
            status: false,
            notes: 'Automatically marked absent - no tap after class ended'
          }
        ]);
      
      if (error) {
        console.error('Error creating absent record:', error);
      }
    } catch (error) {
      console.error('Error in createAbsentRecord:', error);
    }
  };

  const handleRFIDScan = async (cardId: string) => {
    setScannerLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 Starting RFID scan for card:', cardId, 'Date:', today);
      
      // Find user with this cardId
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, role, profile_picture')
        .eq('id', cardId)
        .maybeSingle();
        
      if (userError) {
        console.error('❌ User lookup error:', userError);
        throw userError;
      }
      if (!user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', '', '', '', 'error');
        return;
      }
      
      console.log('✅ User found:', user);
      
      // Check if today is a holiday (active holidays only) - HIGHEST PRIORITY
      const { data: holidayCheck, error: holidayError } = await supabase
        .from("holidays")
        .select("id, title, is_active")
        .eq("date", today)
        .eq("is_active", true)
        .maybeSingle();

      if (holidayError) {
        console.error("[ScheduleScanner] Error checking holiday:", holidayError);
      }

      if (holidayCheck) {
        console.log(`[ScheduleScanner] Today (${today}) is a holiday: "${holidayCheck.title}". Exempting class attendance.`);
        showModernAlert(
          'info', 
          'Holiday - Classes Exempted', 
          `Today is ${holidayCheck.title}. All class schedules are exempted. No attendance will be recorded.`, 
          user.name, 
          user.role || '', 
          user.profile_picture || '', 
          'All Classes', 
          'Holiday', 
          `Current time: ${formatPhilippineTime(getCurrentTime())}`, 
          'exempted'
        );
        return; // Exit early - no attendance recording on holidays
      }
      
      // Check for schedule exemptions (leave/gate pass)
      const exemptionCheck = await checkScheduleExemption(user.id, new Date());
      console.log(`[ScheduleScanner] Exemption check for user ${user.id}:`, exemptionCheck);
      
      if (exemptionCheck.isExempted) {
        let exemptionMessage = '';
        let exemptionTitle = 'Class Schedule Exempted';
        
        if (exemptionCheck.type === 'full_day') {
          exemptionMessage = `Your class schedule is exempted for the entire day due to approved ${exemptionCheck.reason}. No class attendance will be recorded today.`;
        } else {
          exemptionMessage = `Your class schedule is exempted from ${exemptionCheck.startTime} to ${exemptionCheck.endTime} due to approved ${exemptionCheck.reason}. Class attendance during this period will not be recorded.`;
        }
        
        showModernAlert(
          'info', 
          exemptionTitle, 
          exemptionMessage, 
          user.name, 
          user.role || '', 
          user.profile_picture || '', 
          'All Classes', 
          'Exempted', 
          `Current time: ${formatPhilippineTime(getCurrentTime())}`, 
          'exempted'
        );
        return;
      }
      
      // Check if user has schedules today
      const userSchedules = findActiveSchedules(user.id);
      
      if (userSchedules.length === 0) {
        const currentDay = getCurrentDayOfWeek();
        const currentTime = getCurrentTime();
        showModernAlert('error', 'No Schedule Found', `No class schedule for ${currentDay}`, user.name, user.role || '', user.profile_picture || '', '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        return;
      }
      
      // Find all schedules that can be tapped for
      const activeSchedules = userSchedules.filter(s => s.canTap);
      
      if (activeSchedules.length === 0) {
        const earlySchedules = userSchedules.filter(s => s.attendanceStatus === 'Early');
        const lateSchedules = userSchedules.filter(s => s.attendanceStatus === 'Absent');
        
        const currentTime = getCurrentTime();
        
        if (earlySchedules.length > 0) {
          const nextSchedule = earlySchedules[0];
          showModernAlert('error', 'Too Early!', `Class starts at ${formatPhilippineTime(nextSchedule.start_time)}`, user.name, user.role || '', user.profile_picture || '', nextSchedule.subject || 'N/A', nextSchedule.room || 'N/A', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        } else if (lateSchedules.length > 0) {
          for (const schedule of lateSchedules) {
            const { data: existingRecord } = await supabase
              .from('class_attendance')
              .select('*')
              .eq('user_id', user.id)
              .eq('schedule_id', schedule.id)
              .eq('att_date', today)
              .maybeSingle();
              
            if (!existingRecord) {
              await createAbsentRecord(user, schedule, today);
            }
          }
          showModernAlert('error', 'Classes Ended!', 'Marked as ABSENT for missed classes', user.name, user.role || '', user.profile_picture || '', '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        }
        return;
      }
      
      console.log('✅ Active schedules found:', activeSchedules.length);
      
      // Process each active schedule
      let recordedCount = 0;
      
      for (const scheduleInfo of activeSchedules) {
        const { data: existingAttendance, error: fetchError } = await supabase
          .from('class_attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('schedule_id', scheduleInfo.id)
          .eq('att_date', today)
          .maybeSingle();
          
        if (fetchError) {
          console.error('❌ Class attendance fetch error:', fetchError);
          continue;
        }
        
        const currentDateTime = new Date().toISOString();
        
        if (!existingAttendance) {
          // First tap - Create new attendance record (Time In)
          const attendanceData = {
            user_id: user.id,
            schedule_id: scheduleInfo.id,
            att_date: today,
            time_in: currentDateTime,
            time_out: null,
            attendance: scheduleInfo.attendanceStatus,
            status: true,
            notes: `Time In via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
          };
          
          const { error: insertError } = await supabase
            .from('class_attendance')
            .insert([attendanceData])
            .select();
            
          if (insertError) {
            console.error('❌ Insert error for schedule:', scheduleInfo.id, insertError);
            continue;
          }
          
          recordedCount++;
          
        } else if (!existingAttendance.time_out) {
          // Second tap - Record Time Out
          const { error: updateError } = await supabase
            .from('class_attendance')
            .update({
              time_out: currentDateTime,
              status: false,
              notes: `${existingAttendance.notes || ''} | Time Out via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
            })
            .eq('id', existingAttendance.id);
            
          if (updateError) {
            console.error('❌ Update error for time out:', scheduleInfo.id, updateError);
            continue;
          }
          
          recordedCount++;
          
        } else {
          // Third tap - Time In again
          const { error: updateError } = await supabase
            .from('class_attendance')
            .update({
              time_in: currentDateTime,
              time_out: null,
              status: true,
              notes: `${existingAttendance.notes || ''} | Time In again via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
            })
            .eq('id', existingAttendance.id);
            
          if (updateError) {
            console.error('❌ Update error for time in again:', scheduleInfo.id, updateError);
            continue;
          }
          
          recordedCount++;
        }
      }
      
      // Show appropriate success message
      if (recordedCount > 0) {
        if (recordedCount === 1) {
          const schedule = activeSchedules[0];
          
          const { data: currentRecord } = await supabase
            .from('class_attendance')
            .select('time_out, status, attendance')
            .eq('user_id', user.id)
            .eq('schedule_id', schedule.id)
            .eq('att_date', today)
            .single();
            
          
          if (currentRecord?.time_out && !currentRecord?.status) {
            showModernAlert('error', 'Time Out Successful', 'Your departure has been recorded.', user.name, user.role || '', user.profile_picture || '', schedule.subject || 'N/A', schedule.room || 'N/A', 'Checked Out', 'time_out');
          } else if (currentRecord?.status) {
            const action = currentRecord?.time_out ? 'Time In Again' : 'Time In';
            const statusText = currentRecord?.attendance === 'Late' ? 'Late' : currentRecord?.attendance === 'Present' ? 'Present' : 'Checked In';
            showModernAlert('success', `${action} Successful`, 'Your attendance has been recorded.', user.name, user.role || '', user.profile_picture || '', schedule.subject || 'N/A', schedule.room || 'N/A', statusText, 'time_in');
          }
        } else {
          showModernAlert('success', 'Multiple Classes Updated', `${recordedCount} attendance actions recorded successfully!`, user.name, user.role || '', user.profile_picture || '', 'Multiple Subjects', '', 'Updated', 'time_in');
        }
      }
      
    } catch (error: any) {
      console.error('❌ RFID Scan Error:', error);
      
      let errorMessage = 'Error recording class attendance';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      showModernAlert('error', 'System Error', errorMessage, '', '', '', '', '', '', 'error');
    } finally {
      setScannerLoading(false);
      setScannedCard('');
      
      setTimeout(() => {
        const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
        if (hiddenInput) {
          hiddenInput.focus();
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-red-900/60 to-slate-900/80"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"></div>
        </div>
      </div>
      
      {/* Back to Home Button - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <button
          onClick={() => navigate('/')}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      {/* Scanner Interface - Centered Overlay */}
      <div 
        className="absolute inset-0 z-20 flex items-center justify-center gap-6 p-4"
        onClick={() => {
          // Refocus hidden input when clicking anywhere on scanner
          const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
          if (!scannerLoading && hiddenInput) {
            hiddenInput.focus();
          }
        }}
      >
        {/* Main Scanner Container */}
        <div 
          className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border-2 border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)] max-w-2xl w-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ height: 'calc(80vh)' }}
        >
          
          {/* Animated Border Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse rounded-2xl"></div>
          
          {/* Content Container */}
          <div className="relative z-10 p-4">
            
            {/* Scanner Header with Icon */}
            <div className="text-center mb-3">
              <div className="relative inline-block mb-2">
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
              
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 mb-1 tracking-tight">
                CLASS ATTENDANCE SCANNER
              </h2>
              <p className="text-[10px] text-white/80 font-medium">Schedule-Based Attendance System</p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-[10px] font-semibold uppercase tracking-wider">System Online</span>
              </div>
            </div>

            {/* Scanner Status - Compact Visual Area */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-red-500/20 rounded-xl p-2.5 mb-2.5 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"></div>
              </div>
              
              <div className="relative z-10 text-center">
                {scannerLoading ? (
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Compact Spinner */}
                    <div className="relative">
                      <div className="w-10 h-10 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-red-500/20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs">Processing...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Compact Scanning Animation */}
                    <div className="relative w-14 h-14">
                      {/* Outer Pulse Rings */}
                      <div className="absolute inset-0 border-2 border-red-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                      
                      {/* Center Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/50">
                          <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-white font-bold text-xs animate-pulse">READY TO SCAN</p>
                      <p className="text-white/70 text-[10px]">Tap card or enter ID</p>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-[9px] font-semibold uppercase tracking-wider">RFID Active</span>
                      </div>
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
                if (e.key === 'Enter' && scannedCard.trim() !== '') {
                  const cardId = scannedCard.trim();
                  setScannedCard('');
                  handleRFIDScan(cardId);
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
                    if (e.key === 'Enter' && scannedCard.trim() !== '') {
                      const cardId = scannedCard.trim();
                      setScannedCard('');
                      handleRFIDScan(cardId);
                    }
                  }}
                  className="w-full h-10 px-3 bg-slate-800/50 backdrop-blur-md border-2 border-red-500/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300 shadow-lg"
                  placeholder="Enter card ID"
                  disabled={scannerLoading}
                />
              </div>
              
              <button
                onClick={() => {
                  if (scannedCard.trim() !== '') {
                    const cardId = scannedCard.trim();
                    setScannedCard('');
                    handleRFIDScan(cardId);
                  }
                }}
                disabled={scannerLoading || !scannedCard.trim()}
                className="w-full h-10 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2 group"
              >
                {scannerLoading ? (
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
          </div>
        </div>

        {/* Today's Schedule History - Right Side */}
        <div 
          className="hidden xl:block max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
          style={{ height: 'calc(80vh)' }}
        >
          <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border-2 border-red-500/30 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)] flex flex-col overflow-hidden relative h-full">
            
            {/* Animated Border Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse rounded-2xl pointer-events-none"></div>
            
            {/* Header */}
            <div className="relative z-10 bg-gradient-to-r from-red-600/50 to-orange-600/50 backdrop-blur-md px-4 py-3 border-b border-red-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                  </svg>
                  <h3 className="text-white font-bold text-sm">Today's Schedule</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white/80 text-xs font-semibold">{getCurrentDayOfWeek()}</span>
                </div>
              </div>
            </div>

            {/* Schedule List */}
            <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {schedules.length > 0 ? (
                schedules
                  .filter(schedule => schedule.day_of_week === getCurrentDayOfWeek())
                  .sort((a, b) => {
                    const timeA = a.start_time.split(':').map(Number);
                    const timeB = b.start_time.split(':').map(Number);
                    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                  })
                  .map(schedule => {
                    const currentTime = getCurrentTime();
                    const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
                    
                    return (
                      <div 
                        key={schedule.id} 
                        className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-3 transition-all duration-300 hover:bg-slate-800/70 ${
                          attendanceStatus.canTap 
                            ? 'border-green-500/30 shadow-lg shadow-green-500/10' 
                            : 'border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {formatPhilippineTime(schedule.start_time).split(':')[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {schedule.subject && (
                                <p className="text-white font-semibold text-sm truncate">{schedule.subject}</p>
                              )}
                              {schedule.room && (
                                <p className="text-white/60 text-xs truncate">{schedule.room}</p>
                              )}
                            </div>
                          </div>
                          {attendanceStatus.canTap ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0 ${
                              attendanceStatus.status === 'Present' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              {attendanceStatus.status === 'Present' ? 'ACTIVE' : 'LATE'}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0 ${
                              attendanceStatus.status === 'Early' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {attendanceStatus.status === 'Early' ? 'SOON' : 'ENDED'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                  </div>
                  <p className="text-white/60 font-semibold text-sm mb-1">No Classes Today</p>
                  <p className="text-white/40 text-xs">No schedules for {getCurrentDayOfWeek()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Modern Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAlert(false)}
          />
          
          <div className={`relative transform transition-all duration-700 ease-out ${
            showAlert ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
          }`}>
            
            <div className={`relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden max-w-lg w-full mx-4 ${
              alertData.type === 'success' 
                ? 'ring-4 ring-green-400/30' 
                : (alertData.type === 'error' && alertData.action === 'time_out')
                  ? 'ring-4 ring-orange-400/30'
                  : alertData.type === 'error' 
                    ? 'ring-4 ring-red-400/30'
                    : 'ring-4 ring-blue-400/30'
            }`}>
              
              {/* Status Bar */}
              <div className={`h-2 w-full ${
                alertData.type === 'success' 
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                  : (alertData.type === 'error' && alertData.action === 'time_out')
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                    : alertData.type === 'error' 
                      ? 'bg-gradient-to-r from-red-400 to-rose-500'
                      : 'bg-gradient-to-r from-blue-400 to-cyan-500'
              }`}>
                <div className="h-full bg-white/30 animate-pulse"></div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    alertData.type === 'success' 
                      ? 'bg-green-500/20 ring-4 ring-green-400/30' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'bg-orange-500/20 ring-4 ring-orange-400/30'
                        : alertData.type === 'error' 
                          ? 'bg-red-500/20 ring-4 ring-red-400/30'
                          : 'bg-blue-500/20 ring-4 ring-blue-400/30'
                  }`}>
                    {alertData.type === 'success' ? (
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : alertData.action === 'time_out' ? (
                      <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    ) : alertData.type === 'error' ? (
                      <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  {alertData.title}
                </h2>

                {/* Message */}
                <p className="text-white/70 text-center mb-6 text-lg">
                  {alertData.message}
                </p>

                {/* User Info */}
                {alertData.userName && (
                  <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                      {alertData.profilePicture ? (
                        <img 
                          src={alertData.profilePicture} 
                          alt={alertData.userName}
                          className="w-16 h-16 rounded-full object-cover ring-4 ring-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-white/20">
                          {alertData.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{alertData.userName}</h3>
                        {alertData.userRole && (
                          <p className="text-white/60 text-sm">{alertData.userRole}</p>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {alertData.subject && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Subject</p>
                          <p className="text-white font-medium">{alertData.subject}</p>
                        </div>
                      )}
                      {alertData.room && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Room</p>
                          <p className="text-white font-medium">{alertData.room}</p>
                        </div>
                      )}
                      {alertData.status && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Status</p>
                          <p className={`font-bold ${
                            alertData.status.includes('Late') ? 'text-yellow-400' :
                            alertData.status.includes('Present') ? 'text-green-400' :
                            alertData.status.includes('Out') ? 'text-orange-400' :
                            'text-white'
                          }`}>{alertData.status}</p>
                        </div>
                      )}
                      {alertData.time && (
                        <div>
                          <p className="text-white/50 text-xs mb-1">Time</p>
                          <p className="text-white font-medium">{alertData.time}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowAlert(false)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 border border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleScanner;

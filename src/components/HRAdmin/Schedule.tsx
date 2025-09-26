import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';
import { Toaster } from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Schedule {
  id: number;
  user_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject?: string;
  room?: string;
  notes?: string;
  created_at: string;
  user?: User;
}

const Schedule: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // RFID Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCard, setScannedCard] = useState('');
  const [scannerLoading, setScannerLoading] = useState(false);
  
  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success', // 'success', 'error', 'info'
    title: '',
    message: '',
    userName: '',
    subject: '',
    room: '',
    status: '',
    time: '',
    action: '' // 'time_in', 'time_out', 'error'
  });

  const [formData, setFormData] = useState({
    user_id: 0,
    day_of_week: 'Monday',
    start_time: '',
    end_time: '',
    subject: '',
    room: '',
    notes: ''
  });

  // Show notification and auto-hide after 5 seconds
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Check for time overlaps (only for the same user, same day)
  const checkTimeOverlap = (newSchedule: typeof formData, excludeId?: number) => {
    return schedules.some(schedule => {
      // Skip if this is the schedule being edited
      if (excludeId && schedule.id === excludeId) return false;
      
      // Skip if different day
      if (schedule.day_of_week !== newSchedule.day_of_week) return false;
      
      // Skip if different user (users can have overlapping schedules with each other)
      if (schedule.user_id !== newSchedule.user_id) return false;
      
      const newStart = new Date(`2000-01-01 ${newSchedule.start_time}`);
      const newEnd = new Date(`2000-01-01 ${newSchedule.end_time}`);
      const existingStart = new Date(`2000-01-01 ${schedule.start_time}`);
      const existingEnd = new Date(`2000-01-01 ${schedule.end_time}`);
      
      // Check for actual time overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  useEffect(() => {
    fetchUsers();
    fetchAllSchedules(); // Load all schedules for scanner functionality
    checkCurrentUser();
  }, []);

  // Keep scanner input focused for continuous scanning
  useEffect(() => {
    if (showScanner) {
      const focusInterval = setInterval(() => {
        const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
        if (hiddenInput && document.activeElement !== hiddenInput) {
          hiddenInput.focus();
        }
      }, 500); // Check every 500ms

      return () => clearInterval(focusInterval);
    }
  }, [showScanner]);

  // Real-time clock updater
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(clockInterval);
  }, []);

  // Separate useEffect for absent checking to ensure schedules are loaded
  useEffect(() => {
    if (schedules.length > 0) {
      // Start automatic absent marking interval only when schedules are loaded
      const absentCheckInterval = setInterval(() => {
        checkAndMarkAbsentSchedules();
      }, 60000); // Check every minute
      
      // Also run an initial check
      checkAndMarkAbsentSchedules();
      
      return () => clearInterval(absentCheckInterval);
    }
  }, [schedules]);

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
      subject,
      room,
      status,
      time: currentTime,
      action
    });
    setShowAlert(true);
  };

  // Real-time helper functions with seconds
  const getRealTimeWithSeconds = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getRealTimeDayOfWeek = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'Asia/Manila'
    });
  };

  const getRealTimeFullDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Debug function to check current user's role and permissions
  const checkCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Current authenticated user:', user.id);
        
        // Check user in database
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user from database:', error);
        } else {
          console.log('Current user in database:', dbUser);
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchSchedules();
    }
  }, [selectedUser]);

  // Fetch all schedules for scanner functionality
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users first
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      console.log('All users from database:', allUsers);
      console.log('Total users found:', allUsers?.length || 0);

      // Filter for Faculty and SA users (case-insensitive)
      const filteredUsers = allUsers?.filter(user => {
        if (!user.role) return false;
        const role = user.role.toString().trim().toLowerCase();
        const isMatch = role === 'faculty' || role === 'sa';
        console.log(`User ${user.first_name} ${user.last_name} has role: "${user.role}" (${role}) - Match: ${isMatch}`);
        return isMatch;
      }) || [];

      console.log('Filtered Faculty/SA users:', filteredUsers);
      console.log('Filtered users count:', filteredUsers.length);

      // Sort by first name
      filteredUsers.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

      setUsers(filteredUsers);
      
      if (filteredUsers.length === 0) {
        showNotification('error', 'No Faculty or SA users found in the database. Please ensure users have the correct roles assigned.');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showNotification('error', `Failed to load users: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (forceUserId?: number) => {
    try {
      setLoading(true);
      const userId = forceUserId || parseInt(selectedUser);
      console.log('Fetching schedules for user ID:', userId);
      
      if (isNaN(userId)) {
        console.log('Invalid user ID, skipping fetch');
        setSchedules([]);
        return;
      }
      
      // First, let's try a simple query to see if schedules table is accessible
      const { data: testData, error: testError } = await supabase
        .from('schedules')
        .select('*')
        .limit(1);
        
      console.log('Test query result:', testData, testError);
      
      // Now fetch schedules for the specific user
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Schedules fetched from database:', data);
      console.log('Number of schedules found:', data?.length || 0);
      
      // Also fetch user info separately if needed
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role')
          .in('id', userIds);
          
        // Attach user data to schedules
        const schedulesWithUsers = data.map(schedule => ({
          ...schedule,
          user: userData?.find(u => u.id === schedule.user_id)
        }));
        
        setSchedules(schedulesWithUsers);
      } else {
        setSchedules(data || []);
      }
      
      // Removed schedule count notification as requested
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      showNotification('error', `Failed to load schedules: ${error?.message || 'Unknown error'}`);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.user_id || formData.user_id === 0) {
      showNotification('error', 'Please select a user');
      return;
    }
    
    if (!formData.start_time || !formData.end_time) {
      showNotification('error', 'Please provide both start and end times');
      return;
    }
    
    // Validate time order
    if (formData.start_time >= formData.end_time) {
      showNotification('error', 'End time must be after start time');
      return;
    }
    
    // Check for overlaps
    console.log('🔍 Checking overlap for create:', {
      formData,
      allSchedules: schedules.length,
      sameUserSchedules: schedules.filter(s => s.user_id === formData.user_id),
      sameDaySchedules: schedules.filter(s => s.day_of_week === formData.day_of_week && s.user_id === formData.user_id)
    });
    
    const hasOverlap = checkTimeOverlap(formData);
    console.log('🔍 Overlap check result:', hasOverlap);
    
    if (hasOverlap) {
      const conflictingSchedules = schedules.filter(schedule => {
        if (schedule.day_of_week !== formData.day_of_week) return false;
        if (schedule.user_id !== formData.user_id) return false;
        
        const newStart = new Date(`2000-01-01 ${formData.start_time}`);
        const newEnd = new Date(`2000-01-01 ${formData.end_time}`);
        const existingStart = new Date(`2000-01-01 ${schedule.start_time}`);
        const existingEnd = new Date(`2000-01-01 ${schedule.end_time}`);
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      console.log('❌ Conflicting schedules:', conflictingSchedules);
      showNotification('error', `This schedule overlaps with an existing schedule: ${conflictingSchedules.map(s => `${s.subject || 'Class'} (${formatPhilippineTime(s.start_time)}-${formatPhilippineTime(s.end_time)})`).join(', ')}`);
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare the data to insert
      const scheduleData = {
        user_id: formData.user_id,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        subject: formData.subject || null,
        room: formData.room || null,
        notes: formData.notes || null
      };
      
      console.log('Inserting schedule data:', scheduleData);
      
      const { data, error } = await supabase
        .from('schedules')
        .insert([scheduleData])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Schedule created successfully:', data);
      showNotification('success', 'Schedule created successfully!');
      setShowCreateForm(false);
      setFormData({
        user_id: 0,
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        subject: '',
        room: '',
        notes: ''
      });
      // Force refresh schedules for the current user
      await fetchSchedules(formData.user_id);
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      console.error('Form data:', formData);
      
      let errorMessage = 'Unknown error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        errorMessage = 'Permission denied. Please check if you have the required role to create schedules.';
      } else if (errorMessage.includes('foreign key')) {
        errorMessage = 'Invalid user selected. Please refresh the page and try again.';
      } else if (errorMessage.includes('check constraint')) {
        errorMessage = 'Invalid data provided. Please check your input values.';
      }
      
      showNotification('error', `Failed to create schedule: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    
    // Validate time order
    if (formData.start_time >= formData.end_time) {
      showNotification('error', 'End time must be after start time');
      return;
    }
    
    // Check for overlaps (excluding current schedule)
    console.log('🔍 Checking overlap for update:', {
      formData,
      editingScheduleId: editingSchedule.id,
      allSchedules: schedules.length,
      sameUserSchedules: schedules.filter(s => s.user_id === formData.user_id),
      sameDaySchedules: schedules.filter(s => s.day_of_week === formData.day_of_week && s.user_id === formData.user_id)
    });
    
    const hasOverlap = checkTimeOverlap(formData, editingSchedule.id);
    console.log('🔍 Overlap check result:', hasOverlap);
    
    if (hasOverlap) {
      const conflictingSchedules = schedules.filter(schedule => {
        if (schedule.id === editingSchedule.id) return false;
        if (schedule.day_of_week !== formData.day_of_week) return false;
        if (schedule.user_id !== formData.user_id) return false;
        
        const newStart = new Date(`2000-01-01 ${formData.start_time}`);
        const newEnd = new Date(`2000-01-01 ${formData.end_time}`);
        const existingStart = new Date(`2000-01-01 ${schedule.start_time}`);
        const existingEnd = new Date(`2000-01-01 ${schedule.end_time}`);
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      console.log('❌ Conflicting schedules:', conflictingSchedules);
      showNotification('error', `This schedule overlaps with an existing schedule: ${conflictingSchedules.map(s => `${s.subject || 'Class'} (${formatPhilippineTime(s.start_time)}-${formatPhilippineTime(s.end_time)})`).join(', ')}`);
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('schedules')
        .update({
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          subject: formData.subject,
          room: formData.room,
          notes: formData.notes
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      showNotification('success', 'Schedule updated successfully!');
      setEditingSchedule(null);
      setFormData({
        user_id: 0,
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        subject: '',
        room: '',
        notes: ''
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      showNotification('error', 'Failed to update schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      user_id: schedule.user_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      subject: schedule.subject || '',
      room: schedule.room || '',
      notes: schedule.notes || ''
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingSchedule(null);
    setFormData({
      user_id: 0,
      day_of_week: 'Monday',
      start_time: '',
      end_time: '',
      subject: '',
      room: '',
      notes: ''
    });
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      showNotification('success', 'Schedule deleted successfully!');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification('error', 'Failed to delete schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // RFID Scanner Functions
  const getCurrentDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  const isTimeInRange = (currentTime: string, startTime: string, endTime: string) => {
    const current = new Date(`2000-01-01 ${currentTime}`);
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    return current >= start && current <= end;
  };

  const getAttendanceStatus = (currentTime: string, startTime: string, endTime: string) => {
    const current = new Date(`2000-01-01 ${currentTime}`);
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const lateThreshold = new Date(start.getTime() + 15 * 60 * 1000); // 15 minutes after start
    
    if (current < start) {
      return { status: 'Early', canTap: false }; // Before class starts
    } else if (current >= start && current <= lateThreshold) {
      return { status: 'Present', canTap: true }; // On time
    } else if (current > lateThreshold && current <= end) {
      return { status: 'Late', canTap: true }; // Late but within class time
    } else {
      return { status: 'Absent', canTap: false }; // After class ends
    }
  };

  const findActiveSchedules = (userId: number) => {
    const currentDay = getCurrentDayOfWeek();
    const currentTime = getCurrentTime();
    
    console.log('Finding active schedules for:', { userId, currentDay, currentTime });
    
    // Find all schedules for current day and user
    const userSchedules = schedules.filter(s => 
      s.user_id === userId &&
      s.day_of_week === currentDay
    );
    
    if (userSchedules.length === 0) return [];
    
    // Check attendance status for each schedule
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
      } else {
        console.log('Absent record created for user:', user.name || user.id);
      }
    } catch (error) {
      console.error('Error in createAbsentRecord:', error);
    }
  };

  // Function to automatically check and mark absent schedules
  const checkAndMarkAbsentSchedules = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const currentDay = getCurrentDayOfWeek();
      const currentTime = getCurrentTime();
      
      console.log('🔍 Auto-checking for absent schedules...', { today, currentDay, currentTime });
      
      // Get all schedules for today
      const todaySchedules = schedules.filter(schedule => 
        schedule.day_of_week === currentDay
      );
      
      if (todaySchedules.length === 0) {
        console.log('📅 No schedules for today');
        return;
      }
      
      console.log(`📅 Found ${todaySchedules.length} schedules for ${currentDay}`);
      
      // Check each schedule to see if it has ended and user hasn't tapped
      for (const schedule of todaySchedules) {
        const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
        
        // Only mark as absent if class has ended (status is 'Absent')
        if (attendanceStatus.status === 'Absent') {
          console.log(`⏰ Checking schedule: ${schedule.subject || 'Class'} (${schedule.start_time}-${schedule.end_time}) for user ${schedule.user_id}`);
          
          // Check if attendance record already exists
          const { data: existingRecord, error: fetchError } = await supabase
            .from('class_attendance')
            .select('*')
            .eq('user_id', schedule.user_id)
            .eq('schedule_id', schedule.id)
            .eq('att_date', today)
            .maybeSingle();
            
          if (fetchError) {
            console.error('❌ Error checking existing attendance:', fetchError);
            continue;
          }
          
          if (!existingRecord) {
            // No attendance record exists, create absent record
            console.log(`❌ Creating absent record for user ${schedule.user_id}, schedule ${schedule.id}`);
            
            // Get user info for the absent record
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('id, name, role')
              .eq('id', schedule.user_id)
              .single();
              
            if (userError) {
              console.error('❌ Error fetching user for absent record:', userError);
              continue;
            }
            
            if (user) {
              await createAbsentRecord(user, schedule, today);
              console.log(`✅ Marked ${user.name || user.id} as absent for ${schedule.subject || 'class'} (${formatPhilippineTime(schedule.start_time)}-${formatPhilippineTime(schedule.end_time)})`);
            }
          } else {
            console.log(`📋 Attendance record already exists for user ${schedule.user_id}, schedule ${schedule.id}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in checkAndMarkAbsentSchedules:', error);
    }
  };

  const handleRFIDScan = async (cardId: string) => {
    setScannerLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      console.log('🔍 Starting RFID scan for card:', cardId, 'Date:', today);
      
      // Step 1: Find user with this cardId
      console.log('🔍 Step 1: Looking for user with card ID:', cardId);
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', cardId)
        .maybeSingle();
        
      if (userError) {
        console.error('❌ User lookup error:', userError);
        throw userError;
      }
      if (!user) {
        console.log('❌ No user found for card:', cardId);
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', '', 'error');
        return;
      }
      
      console.log('✅ User found:', user);
      
      // Step 2: Check if user has schedules today and determine attendance status
      console.log('🔍 Step 2: Checking for schedules and attendance status');
      console.log('📅 Current schedules available:', schedules.length);
      console.log('📅 Schedules for user:', schedules.filter(s => s.user_id === user.id));
      
      const userSchedules = findActiveSchedules(user.id);
      
      if (userSchedules.length === 0) {
        const currentDay = getCurrentDayOfWeek();
        const currentTime = getCurrentTime();
        console.log('❌ No schedule found for today');
        console.log('📅 Current day:', currentDay, 'Current time:', currentTime);
        console.log('📅 User schedules:', schedules.filter(s => s.user_id === user.id));
        showModernAlert('error', 'No Schedule Found', `No class schedule for ${currentDay}`, user.name, '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        return;
      }
      
      // Find all schedules that can be tapped for
      const activeSchedules = userSchedules.filter(s => s.canTap);
      
      if (activeSchedules.length === 0) {
        // No active schedules - check if any are early or late
        const earlySchedules = userSchedules.filter(s => s.attendanceStatus === 'Early');
        const lateSchedules = userSchedules.filter(s => s.attendanceStatus === 'Absent');
        
        const currentTime = getCurrentTime();
        
        if (earlySchedules.length > 0) {
          const nextSchedule = earlySchedules[0];
          showModernAlert('error', 'Too Early!', `Class starts at ${formatPhilippineTime(nextSchedule.start_time)}`, user.name, nextSchedule.subject || 'N/A', nextSchedule.room || 'N/A', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        } else if (lateSchedules.length > 0) {
          // Mark all ended schedules as absent if not already recorded
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
          showModernAlert('error', 'Classes Ended!', 'Marked as ABSENT for missed classes', user.name, '', '', `Current time: ${formatPhilippineTime(currentTime)}`, 'error');
        }
        return;
      }
      
      console.log('✅ Active schedules found:', activeSchedules.length);
      
      // Step 3: Process each active schedule - allow multiple attendance records for different subjects
      let recordedCount = 0;
      let alreadyRecordedCount = 0;
      
      for (const scheduleInfo of activeSchedules) {
        console.log(`🔍 Step 3.${activeSchedules.indexOf(scheduleInfo) + 1}: Checking attendance for ${scheduleInfo.subject || 'class'}`);
        
        const { data: existingAttendance, error: fetchError } = await supabase
          .from('class_attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('schedule_id', scheduleInfo.id)
          .eq('att_date', today)
          .maybeSingle();
          
        if (fetchError) {
          console.error('❌ Class attendance fetch error:', fetchError);
          continue; // Skip this schedule and continue with others
        }
        
        const currentDateTime = new Date().toISOString();
        
        if (!existingAttendance) {
          // First tap - Create new attendance record (Time In)
          console.log(`🔍 Step 4.${activeSchedules.indexOf(scheduleInfo) + 1}: Creating Time In record for ${scheduleInfo.subject || 'class'}`);
          
          const attendanceData = {
            user_id: user.id,
            schedule_id: scheduleInfo.id,
            att_date: today,
            time_in: currentDateTime,
            time_out: null,
            attendance: scheduleInfo.attendanceStatus, // 'Present', 'Late', or 'Absent'
            status: true,
            notes: `Time In via RFID scanner at ${formatPhilippineTime(getCurrentTime())}`
          };
          
          const { error: insertError } = await supabase
            .from('class_attendance')
            .insert([attendanceData])
            .select();
            
          if (insertError) {
            console.error('❌ Insert error for schedule:', scheduleInfo.id, insertError);
            continue; // Skip this schedule and continue with others
          }
          
          console.log('✅ Time In recorded for:', scheduleInfo.subject || 'class');
          recordedCount++;
          
        } else if (!existingAttendance.time_out) {
          // Second tap - Record Time Out
          console.log(`🔍 Step 4.${activeSchedules.indexOf(scheduleInfo) + 1}: Recording Time Out for ${scheduleInfo.subject || 'class'}`);
          
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
          
          console.log('✅ Time Out recorded for:', scheduleInfo.subject || 'class');
          recordedCount++;
          
        } else {
          // Third tap - Time In again (clear time_out)
          console.log(`🔍 Step 4.${activeSchedules.indexOf(scheduleInfo) + 1}: Recording Time In again for ${scheduleInfo.subject || 'class'}`);
          
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
          
          console.log('✅ Time In again recorded for:', scheduleInfo.subject || 'class');
          recordedCount++;
        }
      }
      
      // Show appropriate success message based on results
      if (recordedCount > 0) {
        if (recordedCount === 1) {
          const schedule = activeSchedules[0];
          
          // Check current status to determine what action was taken
          const { data: currentRecord } = await supabase
            .from('class_attendance')
            .select('time_out, status, attendance')
            .eq('user_id', user.id)
            .eq('schedule_id', schedule.id)
            .eq('att_date', today)
            .single();
            
          
          if (currentRecord?.time_out && !currentRecord?.status) {
            // Time Out recorded
            showModernAlert('error', 'Time Out Successful', 'Your departure has been recorded.', user.name, schedule.subject || 'N/A', schedule.room || 'N/A', 'Checked Out', 'time_out');
          } else if (currentRecord?.status) {
            // Time In recorded (first time or again)
            const action = currentRecord?.time_out ? 'Time In Again' : 'Time In';
            const statusText = currentRecord?.attendance === 'Late' ? 'Late' : currentRecord?.attendance === 'Present' ? 'Present' : 'Checked In';
            showModernAlert('success', `${action} Successful`, 'Your attendance has been recorded.', user.name, schedule.subject || 'N/A', schedule.room || 'N/A', statusText, 'time_in');
          }
        } else {
          showModernAlert('success', 'Multiple Classes Updated', `${recordedCount} attendance actions recorded successfully!`, user.name, 'Multiple Subjects', '', 'Updated', 'time_in');
        }
      } else if (alreadyRecordedCount > 0) {
        showModernAlert('info', 'No New Actions', `${alreadyRecordedCount} subject(s) already processed`, user.name, '', '', 'Already Processed', 'info');
      }
      
    } catch (error: any) {
      console.error('❌ RFID Scan Error:', error);
      
      let errorMessage = 'Error recording class attendance';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        errorMessage = 'Permission denied. Please check database permissions for class_attendance table.';
      } else if (errorMessage.includes('foreign key')) {
        errorMessage = 'Invalid user or schedule reference. Please refresh and try again.';
      } else if (errorMessage.includes('check constraint')) {
        errorMessage = 'Invalid data format. Please check the class_attendance table structure.';
      } else if (errorMessage.includes('duplicate key')) {
        errorMessage = 'Class attendance record already exists for this schedule today.';
      } else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        errorMessage = 'Class attendance table does not exist. Please run the SQL script to create it.';
      }
      
      showModernAlert('error', 'System Error', errorMessage, '', '', '', '', 'error');
    } finally {
      setScannerLoading(false);
      setScannedCard(''); // Clear input for next scan
      
      // Refocus the hidden input for continuous scanning
      setTimeout(() => {
        const hiddenInput = document.querySelector('input[placeholder="RFID will be scanned here"]') as HTMLInputElement;
        if (hiddenInput) {
          hiddenInput.focus();
        }
      }, 100);
    }
  };


  const selectedUserData = users.find(user => user.id.toString() === selectedUser);

  return (
    <div className="flex-1 p-6 lg:ml-70 bg-gray-50 min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-7xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-600 mt-1">Create and manage schedules for Faculty and SA users</p>
            </div>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:scale-105 ${
                showScanner 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {showScanner ? 'Close Scanner' : 'Open RFID Scanner'}
            </button>
          </div>
        </div>

        {/* RFID Scanner Interface */}
        {showScanner && (
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-xl border border-red-300 p-8 mb-6 text-white">
            <div className="max-w-2xl mx-auto">
              {/* Scanner Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-2">Class Attendance Scanner</h2>
                <p className="text-white/80 text-lg">Scan RFID cards to record attendance for scheduled classes</p>
              </div>

              {/* Scanner Status */}
              <div className="text-center mb-8">
                {scannerLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <p className="text-white font-medium text-lg">Processing scan...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-white/50 rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-8 h-8 bg-white/70 rounded-full"></div>
                    </div>
                    <p className="text-white font-medium text-lg">Ready to scan RFID card</p>
                    <p className="text-white/70 text-sm">Only active class schedules will be recorded</p>
                  </div>
                )}
              </div>

              {/* Current Time & Day Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 text-center">
                <p className="text-white/80 text-sm mb-3">Current Date & Time</p>
                <p className="text-white font-bold text-3xl">
                  {getRealTimeFullDate()} - {getRealTimeWithSeconds()}
                </p>
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
                    setScannedCard(''); // Clear immediately to prepare for next scan
                    handleRFIDScan(cardId);
                  }
                }}
                className="opacity-0 absolute -left-96 pointer-events-none"
                placeholder="RFID will be scanned here"
              />

              {/* Manual Input Option */}
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="mb-2 text-white font-medium">Manual Entry (Optional)</label>
                  <input
                    type="text"
                    value={scannedCard}
                    onChange={(e) => setScannedCard(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && scannedCard.trim() !== '') {
                        const cardId = scannedCard.trim();
                        setScannedCard(''); // Clear immediately to prepare for next scan
                        handleRFIDScan(cardId);
                      }
                    }}
                    className="w-full h-12 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                    placeholder="Enter card ID manually"
                    disabled={scannerLoading}
                  />
                </div>
                
                <button
                  onClick={() => {
                    if (scannedCard.trim() !== '') {
                      const cardId = scannedCard.trim();
                      setScannedCard(''); // Clear immediately to prepare for next scan
                      handleRFIDScan(cardId);
                    }
                  }}
                  disabled={scannerLoading || !scannedCard.trim()}
                  className="w-full h-12 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-md border border-white/20"
                >
                  {scannerLoading ? 'Processing...' : 'Record Class Attendance'}
                </button>
              </div>

              {/* Debug Section */}
              <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Debug Information
                </h3>
                <div className="space-y-2 text-sm text-white/80">
                  <div>📊 Total Schedules Loaded: {schedules.length}</div>
                  <div>📅 Current Date: {getRealTimeFullDate()}</div>
                  <div>🕐 Current Time: {getRealTimeWithSeconds()}</div>
                  <div>📋 Today's Schedules: {schedules.filter(s => s.day_of_week === getRealTimeDayOfWeek()).length}</div>
                  <div>🟢 Active Now: {schedules.filter(s => s.day_of_week === getRealTimeDayOfWeek() && isTimeInRange(getRealTimeWithSeconds(), s.start_time, s.end_time)).length}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      console.log('🔍 DEBUG: All schedules:', schedules);
                      console.log('🔍 DEBUG: All users:', users);
                      console.log('🔍 DEBUG: Current date:', getRealTimeFullDate());
                      console.log('🔍 DEBUG: Current time:', getRealTimeWithSeconds());
                      showModernAlert('info', 'Debug Info', 'Debug information logged to console', '', '', '', '', 'info');
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
                  >
                    Log Debug Info
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🔍 Manually checking for absent schedules...');
                      await checkAndMarkAbsentSchedules();
                      showModernAlert('info', 'Absent Check Complete', 'Checked all schedules and marked absent users', '', '', '', '', 'info');
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-white text-sm rounded-lg transition-colors"
                  >
                    Check Absent Now
                  </button>
                </div>
              </div>

              {/* Active Schedules Info */}
              {schedules.length > 0 && (
                <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                    Active Schedules for {getCurrentDayOfWeek()}
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {schedules
                      .filter(schedule => schedule.day_of_week === getCurrentDayOfWeek())
                      .map(schedule => {
                        const user = users.find(u => u.id === schedule.user_id);
                        const currentTime = getCurrentTime();
                        const attendanceStatus = getAttendanceStatus(currentTime, schedule.start_time, schedule.end_time);
                        
                        // Determine background color based on status
                        let bgColor = 'bg-white/5';
                        let borderColor = '';
                        
                        if (attendanceStatus.status === 'Present' && attendanceStatus.canTap) {
                          bgColor = 'bg-green-500/20';
                          borderColor = 'border border-green-400/30';
                        } else if (attendanceStatus.status === 'Late' && attendanceStatus.canTap) {
                          bgColor = 'bg-yellow-500/20';
                          borderColor = 'border border-yellow-400/30';
                        } else if (attendanceStatus.status === 'Absent') {
                          bgColor = 'bg-red-500/20';
                          borderColor = 'border border-red-400/30';
                        }
                        
                        return (
                          <div key={schedule.id} className={`text-sm p-2 rounded-lg ${bgColor} ${borderColor}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-white font-medium">
                                  {user?.name}
                                </span>
                                <span className="text-white/70 ml-2">
                                  {formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}
                                </span>
                                {schedule.subject && (
                                  <span className="text-white/60 ml-2">• {schedule.subject}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Status Badge */}
                                {attendanceStatus.canTap ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    attendanceStatus.status === 'Present' 
                                      ? 'bg-green-500 text-white' 
                                      : attendanceStatus.status === 'Late'
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-gray-500 text-white'
                                  }`}>
                                    {attendanceStatus.status === 'Present' ? '✅ PRESENT' : 
                                     attendanceStatus.status === 'Late' ? '⏰ LATE' : 
                                     attendanceStatus.status}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    attendanceStatus.status === 'Early' 
                                      ? 'bg-blue-500/80 text-white' 
                                      : 'bg-red-500 text-white'
                                  }`}>
                                    {attendanceStatus.status === 'Early' ? '🕐 EARLY' : '❌ ABSENT'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* User Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Faculty or SA User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
            </div>
            {selectedUserData && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">Selected User:</h3>
                <p className="text-blue-800">
                  {selectedUserData.name}
                </p>
                <p className="text-blue-600 text-sm">
                  {selectedUserData.role} • {selectedUserData.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Management */}
        {selectedUser && (
          <>
            {/* Create Schedule Button */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 transition-all duration-300 ${
              showScanner 
                ? 'border-red-300 bg-red-50/30' 
                : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Schedule for {selectedUserData?.name}
                  </h2>
                  {showScanner && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Scanner Active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setEditingSchedule(null);
                    setFormData({
                      user_id: parseInt(selectedUser),
                      day_of_week: 'Monday',
                      start_time: '',
                      end_time: '',
                      subject: '',
                      room: '',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Schedule
                </button>
              </div>
            </div>

        {/* Create/Edit Schedule Modal */}
        {(showCreateForm || editingSchedule) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                    {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
                  </h3>
                  <button
                    onClick={editingSchedule ? cancelEdit : () => setShowCreateForm(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <form onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                    <select
                      value={formData.day_of_week}
                      onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      {daysOfWeek.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject/Activity</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="e.g., Mathematics, Meeting, Event"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room/Location</label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="e.g., Room 101, Conference Hall"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={editingSchedule ? cancelEdit : () => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="schedule-form"
                  disabled={loading}
                  onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? (editingSchedule ? 'Updating...' : 'Creating...') : (editingSchedule ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        )}

            {/* Schedule List */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-300 ${
              showScanner 
                ? 'border-red-300 bg-red-50/30' 
                : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Current Schedules</h3>
                  {showScanner && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      📡 Scanning Mode
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fetchSchedules()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:bg-gray-400 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Refreshing...' : 'Refresh Schedules'}
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading schedules...</p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules yet</h3>
                  <p className="text-gray-500">Create your first schedule to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      {/* Day Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-900 text-white shadow-sm">
                          {schedule.day_of_week}
                        </span>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-6">
                        {/* Time Section */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}
                            </p>
                            <p className="text-sm text-gray-500">Duration</p>
                          </div>
                        </div>

                        {/* Subject */}
                        {schedule.subject && (
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Subject</span>
                            </div>
                            <p className="text-gray-900 font-medium">{schedule.subject}</p>
                          </div>
                        )}

                        {/* Room */}
                        {schedule.room && (
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Location</span>
                            </div>
                            <p className="text-gray-900 font-medium">{schedule.room}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {schedule.notes && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Notes</span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{schedule.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => startEditSchedule(schedule)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-900 rounded-lg hover:bg-red-100 transition-colors duration-200 text-sm font-medium"
                            title="Edit schedule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200 text-sm font-medium"
                            title="Delete schedule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modern Alert Modal */}
        {showAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAlert(false)}
            />
            
            {/* Alert Modal */}
            <div className={`relative bg-white/95 backdrop-blur-xl border-2 shadow-2xl rounded-3xl p-8 max-w-lg w-full mx-4 transform transition-all duration-500 ease-out ${
              showAlert ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            } ${
              alertData.type === 'success' 
                ? 'border-green-400 bg-gradient-to-br from-green-50/90 to-emerald-50/90' 
                : (alertData.type === 'error' && alertData.action === 'time_out')
                  ? 'border-red-400 bg-gradient-to-br from-red-50/90 to-rose-50/90'
                  : alertData.type === 'error' 
                    ? 'border-red-400 bg-gradient-to-br from-red-50/90 to-rose-50/90'
                    : 'border-blue-400 bg-gradient-to-br from-blue-50/90 to-sky-50/90'
            }`}>
              
              {/* Close Button */}
              <button
                onClick={() => setShowAlert(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/70 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Alert Icon */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  alertData.type === 'success' 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : (alertData.type === 'error' && alertData.action === 'time_out')
                      ? 'bg-gradient-to-br from-red-500 to-rose-600'
                      : alertData.type === 'error' 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600'
                        : 'bg-gradient-to-br from-blue-500 to-sky-600'
                } shadow-lg animate-pulse`}>
                  {alertData.type === 'success' ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  ) : (alertData.type === 'error' && alertData.action === 'time_out') ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  ) : alertData.type === 'error' ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                
                {/* Alert Title */}
                <h3 className={`text-2xl font-bold mb-2 ${
                  alertData.type === 'success' 
                    ? 'text-green-800' 
                    : (alertData.type === 'error' && alertData.action === 'time_out')
                      ? 'text-red-800'
                      : alertData.type === 'error' 
                        ? 'text-red-800'
                        : 'text-blue-800'
                }`}>
                  {alertData.title}
                </h3>
                
                {/* User Name */}
                {alertData.userName && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 mb-4 border border-white/40">
                    <p className="text-lg font-semibold text-gray-800">{alertData.userName}</p>
                  </div>
                )}
                
                {/* Subject and Room Info */}
                {(alertData.subject || alertData.room) && (
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/30 w-full">
                    {alertData.subject && (
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="font-medium text-gray-700">Subject:</span>
                        <span className="text-gray-800">{alertData.subject}</span>
                      </div>
                    )}
                    {alertData.room && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium text-gray-700">Room:</span>
                        <span className="text-gray-800">{alertData.room}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Status Badge */}
                {alertData.status && (
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                    alertData.status.includes('Present') || alertData.status.includes('Checked In') 
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : alertData.status.includes('Late')
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : alertData.status.includes('Checked Out')
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {alertData.status}
                  </div>
                )}
                
                {/* Alert Message */}
                <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                  {alertData.message}
                </p>
                
                {/* Time Display */}
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{alertData.time}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAlert(false)}
                  className={`px-8 py-3 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                    alertData.type === 'success' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                        : alertData.type === 'error' 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                          : 'bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
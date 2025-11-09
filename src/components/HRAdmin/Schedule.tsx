import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';
import { Toaster } from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_picture?: string;
  first_name?: string;
  last_name?: string;
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
  is_overtime?: boolean;
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
  
  // Enhanced user selection states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  

  const [formData, setFormData] = useState({
    user_id: 0,
    day_of_week: 'Monday',
    start_time: '',
    end_time: '',
    subject: '',
    room: '',
    notes: '',
    is_overtime: false
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

      // Filter for Faculty and Staff users (case-insensitive) and format the data
      const filteredUsers = allUsers?.filter(user => {
        if (!user.role) return false;
        const role = user.role.toString().trim().toLowerCase();
        const isMatch = role === 'faculty' || role === 'staff';
        console.log(`User ${user.first_name} ${user.last_name} has role: "${user.role}" (${role}) - Match: ${isMatch}`);
        return isMatch;
      }).map(user => ({
        ...user,
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
      })) || [];

      console.log('Filtered Faculty/Staff users:', filteredUsers);
      console.log('Filtered users count:', filteredUsers.length);

      // Sort by name
      filteredUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setUsers(filteredUsers);
      
      if (filteredUsers.length === 0) {
        showNotification('error', 'No Faculty or Staff users found in the database. Please ensure users have the correct roles assigned.');
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
        notes: formData.notes || null,
        is_overtime: formData.is_overtime || false
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
        notes: '',
        is_overtime: false
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
          notes: formData.notes,
          is_overtime: formData.is_overtime
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
        notes: '',
        is_overtime: false
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
      notes: schedule.notes || '',
      is_overtime: schedule.is_overtime || false
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
      notes: '',
      is_overtime: false
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



  const selectedUserData = users.find(user => user.id.toString() === selectedUser);

  // Enhanced user selection helper functions
  const filteredUsers = users.filter(user => {
    if (!userSearchTerm) return true;
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'faculty':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'sa':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'staff':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'administrator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hr personnel':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accounting':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'guard':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setShowUserDropdown(false);
    setUserSearchTerm('');
  };

  return (
    <div className="flex-1 p-3 sm:p-6 lg:ml-70 bg-red-200 min-h-screen">
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
        
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-600 text-sm">Create and manage schedules for Faculty and Staff users</p>
            </div>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm">Total Schedules</p>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm">Faculty</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.role?.toLowerCase() === 'faculty').length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
            
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs sm:text-sm">Staff</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.role?.toLowerCase() === 'staff').length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Enhanced User Selection */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select User</h2>
              <p className="text-sm text-gray-600">Choose a Faculty or Staff user to manage their schedule</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search and Select User
              </label>
              
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {userSearchTerm && (
                  <button
                    onClick={() => {
                      setUserSearchTerm('');
                      setShowUserDropdown(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showUserDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading users...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No users found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search terms</p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user.id.toString())}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 ${
                            selectedUser === user.id.toString() ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                          }`}
                        >
                          {/* User Avatar */}
                          <div className="flex-shrink-0">
                            {user.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                                {getUserInitials(user.name)}
                              </div>
                            )}
                          </div>
                          
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                          
                          {/* Selection Indicator */}
                          {selectedUser === user.id.toString() && (
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Click outside to close dropdown */}
              {showUserDropdown && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserDropdown(false)}
                />
              )}
            </div>

            {/* Selected User Display */}
            {selectedUserData ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-4 mb-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {selectedUserData.profile_picture ? (
                      <img
                        src={selectedUserData.profile_picture}
                        alt={selectedUserData.name}
                        className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {getUserInitials(selectedUserData.name)}
                      </div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {selectedUserData.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(selectedUserData.role)}`}>
                        {selectedUserData.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {selectedUserData.email}
                    </p>
                  </div>
                  
                  {/* Clear Selection Button */}
                  <button
                    onClick={() => {
                      setSelectedUser('');
                      setUserSearchTerm('');
                      setShowUserDropdown(false);
                    }}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors duration-200"
                    title="Clear selection"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Quick Stats */}
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ready to manage schedule</span>
                    <div className="flex items-center gap-1 text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Selected</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No User Selected</h3>
                <p className="text-xs text-gray-500">Search and select a Faculty, SA, or Staff user to manage their schedule</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Management */}
        {selectedUser && (
          <>
            {/* Create Schedule Button */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Schedule for {selectedUserData?.name}
                  </h2>
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
                      notes: '',
                      is_overtime: false
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
                  
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                    <input
                      type="checkbox"
                      id="is_overtime"
                      checked={formData.is_overtime}
                      onChange={(e) => setFormData({ ...formData, is_overtime: e.target.checked })}
                      className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    />
                    <label htmlFor="is_overtime" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">Overtime Schedule (7PM-9PM)</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-7">Adds ₱200 bonus to gross pay in payroll</p>
                    </label>
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
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Current Schedules</h3>
                </div>
                <button
                  onClick={() => fetchSchedules()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Refreshing...' : 'Refresh Schedules'}
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4 font-medium">Loading schedules...</p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No schedules yet</h3>
                  <p className="text-gray-500 mb-4">Create your first schedule to get started.</p>
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
                        notes: '',
                        is_overtime: false
                      });
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add First Schedule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-red-300 transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
                      {/* Day Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                          {schedule.day_of_week}
                        </span>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-6">
                        {/* Time Section */}
                        <div className="flex items-center gap-3 mb-4 bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base sm:text-lg font-bold text-gray-900">
                              {formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Time Schedule</p>
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

                        {/* Overtime Badge */}
                        {schedule.is_overtime && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg border-2 border-orange-300">
                              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-bold text-orange-900">Overtime Schedule</p>
                                <p className="text-xs text-orange-700">+₱200 bonus to gross pay</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
                          <button
                            onClick={() => startEditSchedule(schedule)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                            title="Edit schedule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-semibold"
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
      </div>
    </div>
  );
};

export default Schedule;
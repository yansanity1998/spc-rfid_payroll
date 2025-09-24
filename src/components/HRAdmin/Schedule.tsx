import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';

interface User {
  id: number;
  first_name: string;
  last_name: string;
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

  // Check for time overlaps
  const checkTimeOverlap = (newSchedule: typeof formData, excludeId?: number) => {
    return schedules.some(schedule => {
      if (excludeId && schedule.id === excludeId) return false;
      if (schedule.day_of_week !== newSchedule.day_of_week) return false;
      
      const newStart = new Date(`2000-01-01 ${newSchedule.start_time}`);
      const newEnd = new Date(`2000-01-01 ${newSchedule.end_time}`);
      const existingStart = new Date(`2000-01-01 ${schedule.start_time}`);
      const existingEnd = new Date(`2000-01-01 ${schedule.end_time}`);
      
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
      
      showNotification('success', `Found ${data?.length || 0} schedules`);
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
    if (checkTimeOverlap(formData)) {
      showNotification('error', 'This schedule overlaps with an existing schedule for the same day');
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
    if (checkTimeOverlap(formData, editingSchedule.id)) {
      showNotification('error', 'This schedule overlaps with an existing schedule for the same day');
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


  const selectedUserData = users.find(user => user.id.toString() === selectedUser);

  return (
    <div className="flex-1 p-6 lg:ml-70 bg-gray-50 min-h-screen">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-600 mt-1">Create and manage schedules for Faculty and SA users</p>
          </div>
        </div>


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
                    {user.first_name} {user.last_name} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
            </div>
            {selectedUserData && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">Selected User:</h3>
                <p className="text-blue-800">
                  {selectedUserData.first_name} {selectedUserData.last_name}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Schedule for {selectedUserData?.first_name} {selectedUserData?.last_name}
                </h2>
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

            {/* Create/Edit Schedule Form */}
            {(showCreateForm || editingSchedule) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                </h3>
                <form onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                      <select
                        value={formData.day_of_week}
                        onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {daysOfWeek.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject/Activity</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Mathematics, Meeting, Event"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room/Location</label>
                      <input
                        type="text"
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Room 101, Conference Hall"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      {loading ? (editingSchedule ? 'Updating...' : 'Creating...') : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
                    </button>
                    <button
                      type="button"
                      onClick={editingSchedule ? cancelEdit : () => setShowCreateForm(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Schedule List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Current Schedules</h3>
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
      </div>
    </div>
  );
};

export default Schedule;

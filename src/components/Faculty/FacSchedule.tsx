import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';
import { FacNav } from './FacNav';

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
}

const FacSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Convert time to Philippine format
  const formatPhilippineTime = (timeString: string) => {
    if (!timeString) return '';
    
    try {
      // Create a date object with the time
      const date = new Date(`2000-01-01T${timeString}`);
      if (isNaN(date.getTime())) {
        return timeString; // Return original if invalid
      }
      
      // Convert to Philippine time format
      return date.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return timeString; // Return original if error
    }
  };

  // Show notification and auto-hide after 5 seconds
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSchedules();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
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
          showNotification('error', 'Failed to load user information');
        } else {
          console.log('Current user in database:', dbUser);
          setCurrentUser(dbUser);
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error);
      showNotification('error', 'Failed to authenticate user');
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.id) {
        console.log('No current user ID available');
        return;
      }
      
      console.log('Fetching schedules for user ID:', currentUser.id);
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Schedules fetched from database:', data);
      console.log('Number of schedules found:', data?.length || 0);
      
      setSchedules(data || []);
      
      if (data && data.length > 0) {
        showNotification('success', `Found ${data.length} schedule${data.length > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      showNotification('error', `Failed to load schedules: ${error?.message || 'Unknown error'}`);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // Group schedules by day of week
  const groupSchedulesByDay = () => {
    const grouped: { [key: string]: Schedule[] } = {};
    
    daysOfWeek.forEach(day => {
      grouped[day] = schedules.filter(schedule => schedule.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    
    return grouped;
  };

  const groupedSchedules = groupSchedulesByDay();

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <FacNav />
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
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
                <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
                <p className="text-gray-600 mt-1">
                  View your weekly schedule
                  {currentUser && (
                    <span className="ml-2 text-sm">
                      • {currentUser.first_name} {currentUser.last_name}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={fetchSchedules}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:bg-gray-400 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh Schedule'}
              </button>
            </div>
          </div>

          {/* Schedule Content */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading your schedule...</p>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedule found</h3>
                <p className="text-gray-500">Your schedule will appear here once it's created by HR.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {daysOfWeek.map((day) => (
                <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white">{day}</h3>
                  </div>
                  
                  <div className="p-6">
                    {groupedSchedules[day].length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No schedule</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupedSchedules[day].map((schedule) => (
                          <div key={schedule.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            {/* Time */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {formatPhilippineTime(schedule.start_time)} - {formatPhilippineTime(schedule.end_time)}
                                </p>
                              </div>
                            </div>

                            {/* Subject */}
                            {schedule.subject && (
                              <div className="mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <span className="text-xs font-medium text-gray-600">Subject</span>
                                </div>
                                <p className="text-sm text-gray-900 font-medium">{schedule.subject}</p>
                              </div>
                            )}

                            {/* Room */}
                            {schedule.room && (
                              <div className="mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="text-xs font-medium text-gray-600">Location</span>
                                </div>
                                <p className="text-sm text-gray-900 font-medium">{schedule.room}</p>
                              </div>
                            )}

                            {/* Notes */}
                            {schedule.notes && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-xs font-medium text-gray-600">Notes</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{schedule.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>
    </div>
  );
};

export default FacSchedule;

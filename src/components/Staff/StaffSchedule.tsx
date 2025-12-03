import React, { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';

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

const StaffSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
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

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Current authenticated user:', user.id);
        
        // Check user in database in background
        supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single()
          .then(({ data: dbUser, error }) => {
            if (error) {
              console.error('Error fetching user from database:', error);
              showNotification('error', 'Failed to load user information');
            } else {
              console.log('Current user in database:', dbUser);
              setCurrentUser(dbUser);
              // Fetch schedules once user is loaded
              fetchSchedulesWithUser(dbUser);
            }
          });
      }
    } catch (error) {
      console.error('Error checking current user:', error);
      showNotification('error', 'Failed to authenticate user');
    }
  };

  const fetchSchedulesWithUser = async (user: any) => {
    try {
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }
      
      console.log('Fetching schedules for user ID:', user.id);
      
      // Fetch data in background without loading state
      supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Supabase error:', error);
            showNotification('error', `Failed to load schedules: ${error?.message || 'Unknown error'}`);
            setSchedules([]);
          } else {
            console.log('Schedules fetched from database:', data);
            console.log('Number of schedules found:', data?.length || 0);
            
            setSchedules(data || []);
            
            if (data && data.length > 0) {
              showNotification('success', `Found ${data.length} schedule${data.length > 1 ? 's' : ''}`);
            }
          }
        });
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      showNotification('error', `Failed to load schedules: ${error?.message || 'Unknown error'}`);
      setSchedules([]);
    }
  };

  const fetchSchedules = async () => {
    if (currentUser?.id) {
      fetchSchedulesWithUser(currentUser);
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
    <div className="flex-1 lg:ml-70 p-4 lg:p-8 bg-gray-50 min-h-screen">
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
              <p className="text-gray-600 mt-1">
                View your weekly schedule and default work hours
                {currentUser && (
                  <span className="ml-2 text-sm">
                    • {currentUser.name}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={fetchSchedules}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-700 hover:to-red-600 transition-all shadow-md hover:shadow-lg text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Schedule
            </button>
          </div>
        </div>

        {/* Working Hours Summary - based on HR schedules for this user */}
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-sm border-2 border-red-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Working Hours (from HR schedules)</h2>
              {schedules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Morning & Afternoon Sessions */}
                  <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">Morning &amp; Afternoon Sessions</h3>
                    </div>
                    {(() => {
                      const user = currentUser as any;
                      const morningStart = user?.work_am_start || null;
                      const morningEnd = user?.work_am_end || null;
                      const afternoonStart = user?.work_pm_start || null;
                      const afternoonEnd = user?.work_pm_end || null;

                      const hasAnyWorkHours = morningStart || morningEnd || afternoonStart || afternoonEnd;
                      if (!hasAnyWorkHours) {
                        return (
                          <p className="text-sm text-gray-600 mt-1">
                            Working hours have not been configured for you yet. Please contact HR.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Morning Session</p>
                            {morningStart && morningEnd ? (
                              <p className="text-lg font-semibold text-red-700">
                                {formatPhilippineTime(morningStart)} - {formatPhilippineTime(morningEnd)}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">No morning session configured.</p>
                            )}
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Afternoon Session</p>
                            {afternoonStart && afternoonEnd ? (
                              <p className="text-lg font-semibold text-red-700">
                                {formatPhilippineTime(afternoonStart)} - {formatPhilippineTime(afternoonEnd)}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">No afternoon session configured.</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Based on the working hours configured by HR for your account.
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Active Days */}
                  <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">Scheduled Days</h3>
                    </div>
                    {(() => {
                      const daysSet = new Set<string>();
                      schedules.forEach((schedule) => {
                        if (schedule.day_of_week) {
                          daysSet.add(schedule.day_of_week);
                        }
                      });
                      const daysList = Array.from(daysSet);

                      if (!daysList.length) {
                        return <p className="text-sm text-gray-600 mt-1">No specific days configured.</p>;
                      }

                      return (
                        <>
                          <p className="text-sm text-gray-900 font-medium">
                            {daysList.join(', ')}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">Days where HR has created at least one schedule for you.</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">No HR schedule yet</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Once HR creates a schedule for you, your working hours summary will appear here.
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Penalty Information:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Late arrival: ₱1 per minute (after grace-period rules defined by the system).</li>
                      <li>Overtime work: ₱0.50 per minute past the configured end of day (usually 7:00 PM).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        {schedules.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No additional schedules</h3>
              <p className="text-gray-500">You follow the default work hours shown above. Additional schedules will appear here if assigned by HR.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {daysOfWeek.map((day) => (
              <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
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
                      <p className="text-gray-500 text-sm">Default work hours apply</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedSchedules[day].map((schedule) => (
                        <div key={schedule.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          {/* Time */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>
    </div>
  );
};

export default StaffSchedule;

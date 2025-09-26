// Utility functions for automatic attendance management
import supabase from './supabase';

export interface Schedule {
  id: number;
  user_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject?: string;
  room?: string;
  notes?: string;
  users?: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Function to automatically mark absent students for ended classes
export const processAbsentStudents = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format
    
    console.log('🔍 Processing absent students for:', { today, currentDay, currentTime });
    
    // Get all schedules that have ended today
    const { data: endedSchedules, error: scheduleError } = await supabase
      .from('schedules')
      .select(`
        id,
        user_id,
        day_of_week,
        start_time,
        end_time,
        subject,
        room,
        users!inner (
          id,
          name,
          email,
          role
        )
      `)
      .eq('day_of_week', currentDay) as { data: Schedule[] | null, error: any };
    
    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return;
    }
    
    if (!endedSchedules || endedSchedules.length === 0) {
      console.log('No schedules found for today');
      return;
    }
    
    // Filter schedules that have ended (current time > end_time)
    const completedSchedules = endedSchedules.filter(schedule => {
      try {
        const endTime = new Date(`2000-01-01 ${schedule.end_time}`);
        const current = new Date(`2000-01-01 ${currentTime}`);
        return current > endTime;
      } catch (error) {
        console.error(`Error parsing time for schedule ${schedule.id}:`, error);
        return false;
      }
    });
    
    console.log(`Found ${completedSchedules.length} completed schedules`);
    
    for (const schedule of completedSchedules) {
      // Check if attendance record exists for this user/schedule/date
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('class_attendance')
        .select('id')
        .eq('user_id', schedule.user_id)
        .eq('schedule_id', schedule.id)
        .eq('att_date', today)
        .maybeSingle();
      
      if (attendanceError) {
        console.error('Error checking attendance:', attendanceError);
        continue;
      }
      
      // If no attendance record exists, create absent record
      if (!existingAttendance) {
        const { error: insertError } = await supabase
          .from('class_attendance')
          .insert([
            {
              user_id: schedule.user_id,
              schedule_id: schedule.id,
              att_date: today,
              time_in: null,
              time_out: null,
              attendance: 'Absent',
              status: false,
              notes: `Automatically marked absent - class ended at ${schedule.end_time} without attendance`
            }
          ]);
        
        if (insertError) {
          console.error('Error creating absent record:', insertError);
        } else {
          const userName = schedule.users?.name || `User ${schedule.user_id}`;
          console.log(`✅ Marked ${userName} as absent for ${schedule.subject || 'class'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in processAbsentStudents:', error);
  }
};

// Function to get attendance status based on current time and schedule
export const getAttendanceStatus = (currentTime: string, startTime: string, endTime: string): { status: string; canTap: boolean } => {
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

// Function to format time in Philippine timezone
export const formatPhilippineTime = (timeString: string): string => {
  if (!timeString) return "N/A";
  
  try {
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return timeString; // Return original if invalid
      }
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

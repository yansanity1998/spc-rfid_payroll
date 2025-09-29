// src/pages/Accounting/PayrollAcc.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const PayrollAcc = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [sortByEmployeeType, setSortByEmployeeType] = useState("");
  const [sortByPeriod, setSortByPeriod] = useState("");
  const [penalties, setPenalties] = useState<{[key: number]: number}>({});
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [penaltyData, setPenaltyData] = useState<any>({});

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

  const [formData, setFormData] = useState({
    user_id: "",
    period: "",
    gross: 0,
    deductions: 0,
    net: 0,
    status: "Pending",
  });

  // Calculate penalties for a user - aligned with HRAdmin Attendance.tsx (both regular and class schedule attendance)
  const calculatePenalties = async (userId: number, period?: string): Promise<{
    totalPenalty: number;
    breakdown: {
      lateMinutes: number;
      latePenalty?: number;
      absentCount: number;
      absentPenalty?: number;
      lateRecords?: any[];
      absentRecords?: any[];
      attendanceRecords?: any[];
      classScheduleRecords?: any[];
      dateRange?: { startDate: string; endDate: string };
    };
  }> => {
    try {
      console.log('🔍 [PayrollAcc] Calculating penalties for user:', userId, 'period:', period);
      console.log('📅 [PayrollAcc] Using BOTH regular attendance (dual session) AND class schedule attendance - aligned with HRAdmin Attendance.tsx');

      // Calculate date range for penalty calculation
      let startDate: string;
      let endDate: string;
      
      if (period) {
        // If period is specified, use it to calculate date range
        const periodDate = new Date(period);
        startDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).toISOString().split('T')[0];
      } else {
        // Default to last 15 days
        endDate = new Date().toISOString().split('T')[0];
        const start = new Date();
        start.setDate(start.getDate() - 15);
        startDate = start.toISOString().split('T')[0];
      }

      console.log('📅 [PayrollAcc] Date range:', startDate, 'to', endDate);

      // 🔥 PART 1: Fetch regular attendance records (dual session) with penalty data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          id,
          user_id,
          att_date,
          time_in,
          time_out,
          late_minutes,
          overtime_minutes,
          penalty_amount,
          notes,
          created_at,
          user:users (
            id,
            name,
            role
          )
        `)
        .eq('user_id', userId)
        .gte('att_date', startDate)
        .lte('att_date', endDate)
        .order("att_date", { ascending: false });

      if (attendanceError) {
        console.error('❌ [PayrollAcc] Error fetching regular attendance:', attendanceError);
      }

      // 🔥 PART 2: Fetch class schedule attendance data (same as HRAdmin Attendance.tsx)
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
        .eq('user_id', userId)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error('❌ [PayrollAcc] Error fetching schedules:', schedulesError);
      }

      // Fetch class attendance records
      const { data: classAttendanceData, error: classAttendanceError } = await supabase
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
        .eq('user_id', userId)
        .gte('att_date', startDate)
        .lte('att_date', endDate)
        .order("created_at", { ascending: false });

      if (classAttendanceError) {
        console.error('❌ [PayrollAcc] Error fetching class attendance:', classAttendanceError);
      }

      console.log('📊 [PayrollAcc] Fetched regular attendance records:', attendanceData?.length || 0);
      console.log('📊 [PayrollAcc] Fetched schedules:', schedulesData?.length || 0);
      console.log('📊 [PayrollAcc] Fetched class attendance records:', classAttendanceData?.length || 0);

      // 🔥 PART 3: Process regular attendance penalties (dual session)
      let totalPenalty = 0;
      let totalLateMinutes = 0;
      let totalLatePenalty = 0;
      let totalAbsentPenalty = 0;
      let absentCount = 0;
      
      const lateRecords: any[] = [];
      const absentRecords: any[] = [];

      // Process regular attendance records
      for (const record of attendanceData || []) {
        // Add penalty amount from database (dual session penalties)
        const recordPenalty = record.penalty_amount || 0;
        totalPenalty += recordPenalty;
        
        // Track late records (records with late_minutes > 0)
        if (record.late_minutes && record.late_minutes > 0) {
          totalLateMinutes += record.late_minutes;
          totalLatePenalty += record.late_minutes; // ₱1 per minute late
          lateRecords.push({
            ...record,
            status: 'Late',
            minutes_late: record.late_minutes,
            source: 'regular_attendance',
            session: record.notes?.includes('Morning') ? 'Morning' : record.notes?.includes('Afternoon') ? 'Afternoon' : 'Unknown'
          });
          console.log(`⏰ [PayrollAcc] Regular attendance late on ${record.att_date}: ${record.late_minutes} minutes = ₱${record.late_minutes}`);
        }
        
        // Track absent records (no time_in and time_out)
        if (!record.time_in && !record.time_out) {
          absentCount++;
          totalAbsentPenalty += 240; // ₱240 per absent day
          absentRecords.push({
            ...record,
            status: 'Absent',
            source: 'regular_attendance'
          });
          console.log(`❌ [PayrollAcc] Regular attendance absent on ${record.att_date}: ₱240 penalty`);
        }
      }

      // 🔥 PART 4: Process class schedule attendance (same logic as HRAdmin Attendance.tsx)
      const combinedScheduleData = (schedulesData || []).map(schedule => {
        // Find the most recent attendance record for this schedule
        const attendanceRecords = (classAttendanceData || []).filter(att => 
          att.schedule_id === schedule.id
        );
        
        // Sort by date descending to get the most recent record
        const mostRecentRecord = attendanceRecords.sort((a, b) => 
          new Date(b.att_date).getTime() - new Date(a.att_date).getTime()
        )[0];

        // If no attendance record exists, mark as absent (same as HRAdmin Attendance.tsx)
        let attendanceStatus = 'Absent';
        if (!mostRecentRecord) {
          attendanceStatus = 'Absent';
        }

        return {
          ...schedule,
          attendance_record: mostRecentRecord,
          att_date: mostRecentRecord?.att_date || new Date().toISOString().split('T')[0],
          time_in: mostRecentRecord?.time_in || null,
          time_out: mostRecentRecord?.time_out || null,
          attendance: mostRecentRecord?.attendance || attendanceStatus,
          status: mostRecentRecord?.status || false
        };
      });

      // Filter class schedule records within date range
      const filteredClassScheduleData = combinedScheduleData.filter(record => {
        const recordDate = record.att_date;
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Separate late and absent class schedule records
      const classLateRecords = filteredClassScheduleData.filter(record => record.attendance === 'Late') || [];
      const classAbsentRecords = filteredClassScheduleData.filter(record => record.attendance === 'Absent') || [];

      console.log('📊 [PayrollAcc] Class schedule - Late:', classLateRecords.length, 'Absent:', classAbsentRecords.length);

      // Calculate class schedule late penalties: ₱1 per minute late
      for (const record of classLateRecords) {
        if (record.time_in && record.start_time) {
          // Parse time_in (timestamp) and start_time (HH:MM:SS format)
          const timeIn = new Date(record.time_in);
          const [startHour, startMinute] = record.start_time.split(':').map(Number);
          
          // Create expected start time for the same date
          const expectedStart = new Date(record.att_date);
          expectedStart.setHours(startHour, startMinute, 0, 0);
          
          // Calculate minutes late
          const minutesLate = Math.max(0, Math.floor((timeIn.getTime() - expectedStart.getTime()) / (1000 * 60)));
          
          if (minutesLate > 0) {
            totalLateMinutes += minutesLate;
            totalLatePenalty += minutesLate; // ₱1 per minute late
            totalPenalty += minutesLate;
            lateRecords.push({
              ...record,
              status: 'Late',
              minutes_late: minutesLate,
              source: 'class_schedule'
            });
            console.log(`⏰ [PayrollAcc] Class schedule late - ${record.subject} on ${record.att_date}: ${minutesLate} minutes = ₱${minutesLate}`);
          }
        }
      }

      // Calculate class schedule absent penalties: ₱240 per absent class
      const classAbsentPenalty = classAbsentRecords.length * 240;
      totalAbsentPenalty += classAbsentPenalty;
      totalPenalty += classAbsentPenalty;
      absentCount += classAbsentRecords.length;

      // Add class absent records to tracking
      for (const record of classAbsentRecords) {
        absentRecords.push({
          ...record,
          status: 'Absent',
          source: 'class_schedule'
        });
        console.log(`❌ [PayrollAcc] Class schedule absent - ${record.subject} on ${record.att_date}: ₱240 penalty`);
      }

      console.log('💰 [PayrollAcc] TOTAL PENALTIES (Regular + Class Schedule):');
      console.log('💰 [PayrollAcc] - Total late minutes:', totalLateMinutes, '= ₱' + totalLatePenalty);
      console.log('💰 [PayrollAcc] - Total absent count:', absentCount, '= ₱' + totalAbsentPenalty);
      console.log('💰 [PayrollAcc] - GRAND TOTAL: ₱' + totalPenalty);

      return {
        totalPenalty,
        breakdown: {
          lateMinutes: totalLateMinutes,
          latePenalty: totalLatePenalty,
          absentCount: absentCount,
          absentPenalty: totalAbsentPenalty,
          lateRecords,
          absentRecords,
          attendanceRecords: attendanceData || [],
          classScheduleRecords: filteredClassScheduleData || [],
          dateRange: { startDate, endDate }
        }
      };
    } catch (error) {
      console.error('❌ [PayrollAcc] Error calculating penalties:', error);
      return { totalPenalty: 0, breakdown: { lateMinutes: 0, absentCount: 0 } };
    }
  };

  // Calculate penalties for all users
  const calculateAllPenalties = async (userData: any[] = users) => {
    const penaltyData: {[key: number]: number} = {};
    
    for (const user of userData) {
      const penaltyResult = await calculatePenalties(user.id);
      penaltyData[user.id] = penaltyResult.totalPenalty;
    }
    
    setPenalties(penaltyData);
  };

  const fetchUsersWithPayrolls = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select(`
      id,
      name,
      role,
      payrolls (
        id,
        period,
        gross,
        deductions,
        net,
        status
      )
    `);

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
      // Calculate penalties after fetching users
      if (data && data.length > 0) {
        await calculateAllPenalties(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsersWithPayrolls();
  }, []);

  // Input change with automatic net pay calculation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // If user changes, always calculate fresh penalty for accurate deductions
    if (name === 'user_id' && value) {
      const userId = parseInt(value);
      
      console.log(`🔄 [PayrollAcc] User selected: ${value}, calculating penalties...`);
      
      // Always calculate fresh penalty to ensure accuracy
      calculatePenalties(userId, formData.period).then((penaltyResult) => {
        console.log(`✅ [PayrollAcc] Penalty calculation for user ${value}: ₱${penaltyResult.totalPenalty}`);
        console.log(`📋 [PayrollAcc] Breakdown - Late: ${penaltyResult.breakdown.lateMinutes} minutes (₱${penaltyResult.breakdown.latePenalty || 0}), Absent: ${penaltyResult.breakdown.absentCount} classes (₱${penaltyResult.breakdown.absentPenalty || 0})`);
        
        // Update penalties state
        const newPenalties = { ...penalties };
        newPenalties[userId] = penaltyResult.totalPenalty;
        setPenalties(newPenalties);
        
        // Update form data with calculated penalties (late + absent)
        setFormData(prev => ({
          ...prev,
          user_id: value,
          deductions: penaltyResult.totalPenalty, // Auto-fill with calculated penalties
          net: (prev.gross || 0) - penaltyResult.totalPenalty
        }));
      }).catch((error) => {
        console.error('❌ [PayrollAcc] Error calculating penalties:', error);
        // Set form data without penalties on error
        setFormData(prev => ({
          ...prev,
          user_id: value,
          deductions: 0,
          net: prev.gross || 0
        }));
      });
      return; // Exit early since we're handling the async update above
    }
    
    // Handle other field changes
    const updatedFormData = { ...formData, [name]: value };
    
    // Auto-calculate net pay when gross or deductions change
    if (name === 'gross' || name === 'deductions') {
      const gross = parseFloat(name === 'gross' ? value : String(formData.gross)) || 0;
      const deductions = parseFloat(name === 'deductions' ? value : String(formData.deductions)) || 0;
      
      updatedFormData.net = gross - deductions;
    }
    
    setFormData(updatedFormData);
  };

  const addPayroll = async (userId: number, payrollData: any) => {
    const { error } = await supabase.from("payrolls").insert([
      {
        user_id: userId,
        ...payrollData,
      },
    ]);

    if (error) {
      console.error("Error adding payroll:", error.message);
    } else {
      fetchUsersWithPayrolls();
    }
  };

  const updatePayroll = async (id: number) => {
    // Find the current payroll record to get existing values
    const currentPayroll = payrolls.find(pr => pr.id === id);
    if (!currentPayroll) {
      alert("Payroll record not found");
      return;
    }

    // Use existing values if editData doesn't have them (for partial updates)
    const grossValue = editData.gross !== undefined ? editData.gross : currentPayroll.gross;
    const deductionsValue = editData.deductions !== undefined ? editData.deductions : currentPayroll.deductions;
    const netValue = grossValue - deductionsValue;

    const { error } = await supabase
      .from("payrolls")
      .update({
        gross: grossValue,
        deductions: deductionsValue,
        net: netValue,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      setEditing(null);
      setEditData({});
      fetchUsersWithPayrolls();
    }
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      alert("Please select an employee");
      return;
    }

    await addPayroll(Number(formData.user_id), {
      period: formData.period,
      gross: Number(formData.gross),
      deductions: Number(formData.deductions),
      net: Number(formData.net),
      status: formData.status,
    });

    setShowForm(false);
    setFormData({
      user_id: "",
      period: "",
      gross: 0,
      deductions: 0,
      net: 0,
      status: "Pending",
    });
  };

  const payrolls = users
    .map((user) =>
      user.payrolls?.length
        ? user.payrolls.map((pr: any) => ({
            ...pr,
            userId: user.id,
            name: user.name,
            role: user.role,
          }))
        : [
            {
              id: `no-payroll-${user.id}`,
              userId: user.id,
              name: user.name,
              role: user.role,
              period: "--",
              gross: 0,
              deductions: 0,
              net: 0,
              status: "No Payroll",
            },
          ]
    )
    .flat();

  const filteredPayrolls = payrolls
    .filter((pr) => {
      // Search filter
      const matchesSearch = 
        pr.name.toLowerCase().includes(search.toLowerCase()) ||
        pr.role.toLowerCase().includes(search.toLowerCase()) ||
        pr.period.toLowerCase().includes(search.toLowerCase());
      
      // Employee type filter
      const matchesEmployeeType = !sortByEmployeeType || pr.role === sortByEmployeeType;
      
      // Period filter
      const matchesPeriod = !sortByPeriod || pr.period === sortByPeriod;
      
      return matchesSearch && matchesEmployeeType && matchesPeriod;
    })
    .sort((a, b) => {
      // Sort by employee type first if selected
      if (sortByEmployeeType) {
        if (a.role !== b.role) {
          return a.role.localeCompare(b.role);
        }
      }
      
      // Sort by period second if selected
      if (sortByPeriod) {
        if (a.period !== b.period) {
          return a.period.localeCompare(b.period);
        }
      }
      
      // Default sort by name
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Accounting Payroll Management</h1>
            </div>
            <p className="text-gray-600">Manage and review employee payroll records</p>
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
                  placeholder="Search by name, role, or period..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Sorting Controls */}
              <div className="flex gap-2">
                {/* Employee Type Sort */}
                <div className="relative">
                  <select
                    value={sortByEmployeeType}
                    onChange={(e) => setSortByEmployeeType(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm text-sm"
                  >
                    <option value="">All Employee Types</option>
                    <option value="Administrator">Administrator</option>
                    <option value="HR Personnel">HR Personnel</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                    <option value="SA">SA</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Period Sort */}
                <div className="relative">
                  <select
                    value={sortByPeriod}
                    onChange={(e) => setSortByPeriod(e.target.value)}
                    className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm text-sm"
                  >
                    <option value="">All Periods</option>
                    {Array.from(new Set(payrolls.map(pr => pr.period).filter(period => period && period !== "--"))).sort().map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Payroll
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                onClick={fetchUsersWithPayrolls}
                className="group relative overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                onClick={() => calculateAllPenalties()}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Calculate Penalties
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </section>

        {/* Penalty System Information */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 shadow-lg rounded-2xl mt-6 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Penalty System (All Records)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/60 rounded-xl p-4 border border-orange-200">
              <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Late Penalty
              </h3>
              <p className="text-gray-700">₱1 per minute late from scheduled start time</p>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-red-200">
              <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Absent Penalty
              </h3>
              <p className="text-gray-700">₱240 per missed class/schedule</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4 text-center">
            * Penalties are calculated automatically from ALL class schedule attendance records in the system
          </p>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 text-center font-medium">
              🤖 Fully Automatic: System scans ALL class_attendance records and applies penalties when you select an employee
            </p>
          </div>
        </div>

        {/* Modern Payroll Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Payroll Records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee ID</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Name</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Period</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Gross Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Deductions</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Net Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading payroll records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayrolls.length > 0 ? (
                  filteredPayrolls.map((pr) => (
                    <tr key={pr.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{pr.userId}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm">{pr.name || 'No Name'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(pr.role).split(' ').slice(2).join(' ')}`}>
                          {pr.role || 'No Role Assigned'}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {pr.period}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {editing === pr.id ? (
                          <input
                            type="number"
                            className="border-2 border-gray-300 rounded-lg px-3 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={editData.gross !== undefined ? editData.gross : pr.gross}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                gross: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <span className="font-semibold text-gray-700 text-sm">
                            {pr.gross ? `₱${pr.gross.toLocaleString()}` : "--"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {editing === pr.id ? (
                          <input
                            type="number"
                            className="border-2 border-gray-300 rounded-lg px-3 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            value={editData.deductions !== undefined ? editData.deductions : pr.deductions}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                deductions: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <span className="font-semibold text-red-600 text-sm">
                            {pr.deductions ? `₱${pr.deductions.toLocaleString()}` : "--"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-bold text-green-600 text-sm">
                          {editing === pr.id
                            ? `₱${(
                                (editData.gross || pr.gross) -
                                (editData.deductions || pr.deductions)
                              ).toLocaleString()}`
                            : pr.status !== "No Payroll" && pr.gross > 0 && pr.deductions !== undefined
                            ? `₱${(pr.gross - pr.deductions).toLocaleString()}`
                            : pr.status !== "No Payroll" && pr.gross > 0
                            ? `₱${pr.gross.toLocaleString()}`
                            : "--"}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          pr.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : pr.status === "Finalized"
                            ? "bg-green-100 text-green-800"
                            : pr.status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex flex-wrap gap-1.5">
                          {editing !== pr.id && pr.status !== "No Payroll" && (
                            <button
                              onClick={() => {
                                setEditing(pr.id);
                                // Initialize editData with current values
                                setEditData({
                                  gross: pr.gross,
                                  deductions: pr.deductions
                                });
                              }}
                              className="px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}
                          {editing === pr.id && (
                            <button
                              onClick={() => updatePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </button>
                          )}
                          {pr.status !== "No Payroll" && (
                            <button
                              onClick={async () => {
                                setSelectedUser(pr);
                                const penalties = await calculatePenalties(pr.userId, pr.period);
                                setPenaltyData(penalties);
                                setShowPenaltyModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Penalties
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Payroll Records Found</h3>
                          <p className="text-gray-500">Check your search criteria or refresh the data.</p>
                          <button 
                            onClick={fetchUsersWithPayrolls}
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
        </div>

        {/* Modern Add Payroll Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Add Payroll Record</h2>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                  <input
                    type="text"
                    name="period"
                    placeholder="Period (e.g. Jan 2025)"
                    value={formData.period}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gross Pay</label>
                  <input
                    type="number"
                    name="gross"
                    placeholder="Gross Pay"
                    value={formData.gross}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deductions (inc. Penalties)</label>
                  <input
                    type="number"
                    name="deductions"
                    placeholder="Auto-filled with penalties"
                    value={formData.deductions}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.user_id && penalties[parseInt(formData.user_id)] > 0 
                      ? `Includes ₱${penalties[parseInt(formData.user_id)].toLocaleString()} penalties from last 15 days`
                      : "Select employee to auto-fill penalties"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Net Pay (Auto-calculated)</label>
                  <input
                    type="number"
                    name="net"
                    placeholder="Auto-calculated"
                    value={formData.net}
                    readOnly
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-700 cursor-not-allowed transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">This field is automatically calculated from Gross Pay - Deductions</p>
                </div>
                
                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Save Payroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Penalty Calculation Modal (Copied from HRAdmin) */}
        {showPenaltyModal && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Penalty Calculator</h2>
                      <p className="text-gray-600 text-sm">{selectedUser?.name} - {selectedUser?.period}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPenaltyModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Penalty Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Late Penalties */}
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold">Late</h3>
                    </div>
                    <p className="text-2xl font-bold">{penaltyData.breakdown?.lateRecords?.length || 0}</p>
                    <p className="text-yellow-100 text-sm">₱{penaltyData.breakdown?.latePenalty || 0} penalty</p>
                  </div>

                  {/* Absent Penalties */}
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold">Absent</h3>
                    </div>
                    <p className="text-2xl font-bold">{penaltyData.breakdown?.absentCount || 0}</p>
                    <p className="text-red-100 text-sm">₱{penaltyData.breakdown?.absentPenalty || 0} penalty</p>
                  </div>

                  {/* Total Penalties */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="font-semibold">Total</h3>
                    </div>
                    <p className="text-2xl font-bold">₱{penaltyData.totalPenalty || 0}</p>
                    <p className="text-purple-100 text-sm">Total deduction</p>
                  </div>
                </div>

                {/* Current Payroll Info */}
                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Current Payroll Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Gross Pay:</span>
                      <p className="font-semibold text-green-600">₱{selectedUser?.gross?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Deductions:</span>
                      <p className="font-semibold text-red-600">₱{selectedUser?.deductions?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Net:</span>
                      <p className="font-semibold text-blue-600">₱{selectedUser?.net?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Penalty Breakdown */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Penalty Breakdown</h3>
                  {penaltyData.error ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800">
                      <p className="font-semibold">Error calculating penalties:</p>
                      <p className="text-sm">{penaltyData.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span>Late Attendance ({penaltyData.breakdown?.lateMinutes || 0} minutes × ₱1)</span>
                          <span className="font-semibold">₱{penaltyData.breakdown?.latePenalty || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span>Absent ({penaltyData.breakdown?.absentCount || 0} classes × ₱240)</span>
                          <span className="font-semibold">₱{penaltyData.breakdown?.absentPenalty || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded font-semibold">
                          <span>Total Penalty</span>
                          <span>₱{penaltyData.totalPenalty || 0}</span>
                        </div>
                      </div>
                      
                      {/* Detailed Attendance Records */}
                      {(penaltyData.breakdown?.lateRecords?.length > 0 || penaltyData.breakdown?.absentRecords?.length > 0) && (
                        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm mb-4">
                          <p className="text-gray-800 font-medium mb-2">Attendance Details:</p>
                          
                          {penaltyData.breakdown?.lateRecords?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-yellow-700 font-medium text-xs mb-1">Late Classes:</p>
                              {penaltyData.breakdown.lateRecords.map((record: any, index: number) => {
                                const timeIn = new Date(record.time_in);
                                const [startHour, startMinute] = record.start_time?.split(':').map(Number) || [0, 0];
                                const expectedStart = new Date(record.att_date);
                                expectedStart.setHours(startHour, startMinute, 0, 0);
                                const minutesLate = Math.max(0, Math.floor((timeIn.getTime() - expectedStart.getTime()) / (1000 * 60)));
                                
                                return (
                                  <div key={index} className="text-xs text-yellow-600 ml-2">
                                    • {record.att_date} - {record.subject || 'Unknown Subject'} ({record.day_of_week}) - {minutesLate} min late
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {penaltyData.breakdown?.absentRecords?.length > 0 && (
                            <div>
                              <p className="text-red-700 font-medium text-xs mb-1">Absent Classes:</p>
                              {penaltyData.breakdown.absentRecords.map((record: any, index: number) => {
                                return (
                                  <div key={index} className="text-xs text-red-600 ml-2">
                                    • {record.att_date} - {record.subject || 'Unknown Subject'} ({record.day_of_week}) - ₱240 penalty
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Search Period Info */}
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                        <p className="text-blue-800 font-medium">Search Period:</p>
                        <p className="text-blue-700">Based on ALL attendance records in the system</p>
                        <p className="text-blue-600 text-xs mt-1">
                          Found {penaltyData.breakdown?.attendanceRecords?.length || 0} class attendance records
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPenaltyModal(false)}
                    className="px-6 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                  >
                    Close
                  </button>
                  {penaltyData.totalPenalty === 0 && (
                    <div className="px-6 py-2.5 bg-green-100 text-green-800 rounded-xl font-medium">
                      No penalties to apply
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

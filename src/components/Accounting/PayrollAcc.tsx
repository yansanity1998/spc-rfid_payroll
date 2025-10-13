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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [penaltyData, setPenaltyData] = useState<any>({});
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loans, setLoans] = useState<{[key: number]: any}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    loan_deduction: 0,
    net: 0,
    status: "Pending",
  });

  // Fetch approved loans for a user
  const fetchUserLoans = async (userId: number): Promise<{
    totalLoanDeduction: number;
    activeLoans: any[];
  }> => {
    try {
      console.log('💰 [PayrollAcc] Fetching approved loans for user:', userId);
      
      // Fetch approved loan requests for the user
      const { data: loanRequests, error: loanError } = await supabase
        .from('requests')
        .select(`
          id,
          user_id,
          amount,
          period_deduction,
          total_periods,
          repayment_terms,
          status,
          approved_date,
          created_at,
          reason
        `)
        .eq('request_type', 'Loan')
        .eq('user_id', userId)
        .eq('status', 'Approved')
        .order('created_at', { ascending: false });

      if (loanError) {
        console.error('❌ [PayrollAcc] Error fetching loans:', loanError);
        return { totalLoanDeduction: 0, activeLoans: [] };
      }

      if (!loanRequests || loanRequests.length === 0) {
        console.log('💰 [PayrollAcc] No approved loans found for user:', userId);
        return { totalLoanDeduction: 0, activeLoans: [] };
      }

      // Fetch all payroll records for this user to count periods paid
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payrolls')
        .select('id, period, loan_deduction, created_at')
        .eq('user_id', userId)
        .gt('loan_deduction', 0)
        .order('created_at', { ascending: true });

      if (payrollError) {
        console.error('❌ [PayrollAcc] Error fetching payroll records:', payrollError);
      }

      console.log('💰 [PayrollAcc] Found', payrollRecords?.length || 0, 'payroll records with loan deductions');

      // Calculate total per-period deduction from all active loans
      let totalLoanDeduction = 0;
      const activeLoans = [];

      for (const loan of loanRequests) {
        const periodPayment = loan.period_deduction || 0;
        const totalPeriods = loan.total_periods || 0;
        
        if (periodPayment <= 0 || totalPeriods <= 0) {
          console.log(`⚠️ [PayrollAcc] Skipping loan ${loan.id}: Invalid period payment or total periods`);
          continue;
        }

        // Count how many periods have been paid for this loan
        // We count payroll records created after the loan was approved
        const loanApprovedDate = new Date(loan.approved_date || loan.created_at);
        const periodsPaid = payrollRecords?.filter(pr => {
          const payrollDate = new Date(pr.created_at);
          return payrollDate >= loanApprovedDate && pr.loan_deduction > 0;
        }).length || 0;

        console.log(`💰 [PayrollAcc] Loan ${loan.id}: ${periodsPaid}/${totalPeriods} periods paid`);

        // Only include loan if not fully paid
        if (periodsPaid < totalPeriods) {
          totalLoanDeduction += periodPayment;
          activeLoans.push({
            ...loan,
            period_payment: periodPayment,
            periods_paid: periodsPaid,
            periods_remaining: totalPeriods - periodsPaid
          });
          console.log(`✅ [PayrollAcc] Active loan: ₱${loan.amount} (₱${periodPayment}/period, ${totalPeriods - periodsPaid} periods remaining)`);
        } else {
          console.log(`✅ [PayrollAcc] Loan ${loan.id} fully paid (${periodsPaid}/${totalPeriods} periods completed)`);
        }
      }

      console.log('💰 [PayrollAcc] Total loan deduction:', totalLoanDeduction);
      console.log('💰 [PayrollAcc] Active loans count:', activeLoans.length);
      return { totalLoanDeduction, activeLoans };
    } catch (error) {
      console.error('❌ [PayrollAcc] Error fetching loans:', error);
      return { totalLoanDeduction: 0, activeLoans: [] };
    }
  };

  // Function to check if user has schedule exemption for a specific date
  const checkUserExemption = async (userId: number, date: string) => {
    try {
      const { data, error } = await supabase
        .from("schedule_exemptions")
        .select("*")
        .eq("user_id", userId)
        .eq("exemption_date", date);

      if (error) {
        console.error('[PayrollAcc] Error checking exemptions:', error);
        return { isExempted: false, reason: null, type: null };
      }

      if (!data || data.length === 0) {
        return { isExempted: false, reason: null, type: null };
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
          type: 'full_day',
          requestType: fullDayExemption.request_type
        };
      }

      // Check for time-specific exemptions (gate pass requests)
      const timeExemption = data.find(exemption => {
        if (!exemption.start_time || !exemption.end_time) return false;
        return true; // Has time-specific exemption
      });

      if (timeExemption) {
        return { 
          isExempted: true, 
          reason: timeExemption.reason,
          type: 'time_specific',
          requestType: timeExemption.request_type,
          startTime: timeExemption.start_time,
          endTime: timeExemption.end_time
        };
      }

      return { isExempted: false, reason: null, type: null };
    } catch (error) {
      console.error('[PayrollAcc] Error checking schedule exemption:', error);
      return { isExempted: false, reason: null, type: null };
    }
  };

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

      // Process regular attendance records with exemption checking
      // Sum database-computed penalties, track late minutes, and detect full-day absences once per date
      const absentDatesRegular = new Set<string>();
      const recordsByDate: Record<string, any[]> = {};
      for (const rec of attendanceData || []) {
        if (!recordsByDate[rec.att_date]) recordsByDate[rec.att_date] = [];
        recordsByDate[rec.att_date].push(rec);
      }

      for (const record of attendanceData || []) {
        const exemptionCheck = await checkUserExemption(userId, record.att_date);
        if (exemptionCheck.isExempted) {
          console.log(`🛡️ [PayrollAcc] User ${userId} is exempted on ${record.att_date} (${exemptionCheck.requestType}: ${exemptionCheck.reason}) - SKIPPING PENALTIES`);
          continue;
        }

        // Add DB penalty directly (already includes late/absent for dual session)
        const recordPenalty = record.penalty_amount || 0;
        totalPenalty += recordPenalty;

        // Late tracking for reporting (₱1/min policy)
        if (record.late_minutes && record.late_minutes > 0) {
          totalLateMinutes += record.late_minutes;
          totalLatePenalty += record.late_minutes;
          lateRecords.push({
            ...record,
            status: 'Late',
            minutes_late: record.late_minutes,
            source: 'regular_attendance',
            session: record.notes?.includes('Morning') ? 'Morning' : record.notes?.includes('Afternoon') ? 'Afternoon' : 'Unknown'
          });
          console.log(`⏰ [PayrollAcc] Regular attendance late on ${record.att_date}: ${record.late_minutes} minutes = ₱${record.late_minutes}`);
        }
      }

      // Determine full-day absences ONCE per date (avoid double-charging per session)
      for (const [date, dayRecords] of Object.entries(recordsByDate)) {
        const exemptionCheck = await checkUserExemption(userId, date);
        if (exemptionCheck.isExempted) continue;

        const anyPresentTap = dayRecords.some(r => !!r.time_in || !!r.time_out);
        const hasAutoAbsent = dayRecords.some(r => (!r.time_in && !r.time_out) && (r.attendance === false || (r.notes && r.notes.toLowerCase().includes('automatic absent'))));

        if (!anyPresentTap && hasAutoAbsent) {
          // Count absent day once for reporting; penalty already included via record.penalty_amount
          if (!absentDatesRegular.has(date)) absentDatesRegular.add(date);
          const absentRecord = dayRecords.find(r => (!r.time_in && !r.time_out) && (r.attendance === false || (r.notes && r.notes.toLowerCase().includes('automatic absent'))));
          absentRecords.push({
            ...(absentRecord || { att_date: date }),
            status: 'Absent',
            source: 'regular_attendance'
          });
        }
      }

      // Update absent counters for reporting (do not add to totalPenalty again)
      absentCount += absentDatesRegular.size;
      // Keep absent penalty for regular attendance aligned with DB (use the penalty on auto-absent records if available)
      for (const date of absentDatesRegular) {
        const dayRecords = recordsByDate[date] || [];
        const autoAbsentRec = dayRecords.find(r => (!r.time_in && !r.time_out) && (r.attendance === false || (r.notes && r.notes.toLowerCase().includes('automatic absent'))));
        totalAbsentPenalty += autoAbsentRec?.penalty_amount || 240;
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

      // Calculate class schedule late penalties: ₱1 per minute late (with exemption checking)
      for (const record of classLateRecords) {
        // Check if user is exempted for this date
        const exemptionCheck = await checkUserExemption(userId, record.att_date);
        
        if (exemptionCheck.isExempted) {
          console.log(`🛡️ [PayrollAcc] User ${userId} is exempted on ${record.att_date} for class ${record.subject} (${exemptionCheck.requestType}: ${exemptionCheck.reason}) - SKIPPING LATE PENALTY`);
          continue; // Skip penalty calculation for exempted dates
        }

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

      // Calculate class schedule absent penalties: ₱240 per absent class (with exemption checking)
      let exemptedAbsentCount = 0;
      for (const record of classAbsentRecords) {
        // Check if user is exempted for this date
        const exemptionCheck = await checkUserExemption(userId, record.att_date);
        
        if (exemptionCheck.isExempted) {
          console.log(`🛡️ [PayrollAcc] User ${userId} is exempted on ${record.att_date} for class ${record.subject} (${exemptionCheck.requestType}: ${exemptionCheck.reason}) - SKIPPING ABSENT PENALTY`);
          exemptedAbsentCount++;
          continue; // Skip penalty calculation for exempted dates
        }

        // Apply penalty for non-exempted absent records
        totalAbsentPenalty += 240; // ₱240 per absent class
        totalPenalty += 240;
        absentCount++;
        
        absentRecords.push({
          ...record,
          status: 'Absent',
          source: 'class_schedule'
        });
        console.log(`❌ [PayrollAcc] Class schedule absent - ${record.subject} on ${record.att_date}: ₱240 penalty`);
      }
      
      console.log(`🛡️ [PayrollAcc] Exempted ${exemptedAbsentCount} absent class records from penalties`);
      console.log(`💰 [PayrollAcc] Applied penalties to ${absentCount} non-exempted absent records`);

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
        loan_deduction,
        net,
        status
      )
    `);

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
      // Data loaded successfully - penalties and loans will be calculated when user is selected
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsersWithPayrolls();
  }, []);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showForm || showHistoryModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, showHistoryModal]);

  // Get default gross pay based on user role
  const getDefaultGrossPay = (role: string): number => {
    switch (role) {
      case "Faculty":
        return 30000;
      case "SA":
        return 6000;
      case "Guard":
        return 10000;
      case "Staff":
        return 25000;
      case "HR Personnel":
        return 30000;
      case "Accounting":
        return 25000;
      default:
        return 0;
    }
  };

  // Input change with automatic net pay calculation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // If user changes, calculate penalties and fetch loans
    if (name === 'user_id' && value) {
      const userId = parseInt(value);
      
      // Find the selected user to get their role
      const selectedUser = users.find(u => u.id === userId);
      const defaultGross = selectedUser ? getDefaultGrossPay(selectedUser.role) : 0;
      
      console.log(`🔄 [PayrollAcc] User selected: ${value} (${selectedUser?.role}), default gross pay: ₱${defaultGross.toLocaleString()}`);
      console.log(`🔄 [PayrollAcc] Calculating penalties and fetching loans...`);
      
      // Calculate penalties and fetch loans in parallel
      Promise.all([
        calculatePenalties(userId, formData.period),
        fetchUserLoans(userId)
      ]).then(([penaltyResult, loanResult]) => {
        console.log(`✅ [PayrollAcc] Penalty calculation for user ${value}: ₱${penaltyResult.totalPenalty}`);
        console.log(`💰 [PayrollAcc] Loan deduction for user ${value}: ₱${loanResult.totalLoanDeduction}`);
        console.log(`📋 [PayrollAcc] Breakdown - Late: ${penaltyResult.breakdown.lateMinutes} minutes (₱${penaltyResult.breakdown.latePenalty || 0}), Absent: ${penaltyResult.breakdown.absentCount} classes (₱${penaltyResult.breakdown.absentPenalty || 0})`);
        
        // Update penalties and loans state
        const newPenalties = { ...penalties };
        newPenalties[userId] = penaltyResult.totalPenalty;
        setPenalties(newPenalties);
        
        const newLoans = { ...loans };
        newLoans[userId] = loanResult;
        setLoans(newLoans);
        
        // Update form data with default gross pay, calculated penalties and loans
        setFormData(prev => ({
          ...prev,
          user_id: value,
          gross: defaultGross, // Set default gross pay based on role
          deductions: penaltyResult.totalPenalty, // Only penalties in deductions
          loan_deduction: loanResult.totalLoanDeduction, // Loans separate
          net: defaultGross - penaltyResult.totalPenalty - loanResult.totalLoanDeduction // Net = Gross - Deductions - Loan Deductions
        }));
      }).catch((error) => {
        console.error('❌ [PayrollAcc] Error calculating penalties/loans:', error);
        // Set form data with default gross pay but without penalties/loans on error
        setFormData(prev => ({
          ...prev,
          user_id: value,
          gross: defaultGross, // Set default gross pay even on error
          deductions: 0,
          loan_deduction: 0,
          net: defaultGross // Net = Gross when no deductions
        }));
      });
      return; // Exit early since we're handling the async update above
    }
    
    // Handle other field changes
    const updatedFormData = { ...formData, [name]: value };
    
    // Auto-calculate net pay when gross, deductions, or loan_deduction change
    if (name === 'gross' || name === 'deductions' || name === 'loan_deduction') {
      const gross = parseFloat(name === 'gross' ? value : String(formData.gross)) || 0;
      const deductions = parseFloat(name === 'deductions' ? value : String(formData.deductions)) || 0;
      const loanDeduction = parseFloat(name === 'loan_deduction' ? value : String(formData.loan_deduction)) || 0;
      
      // Net pay = Gross - (Deductions + Loan Deduction)
      updatedFormData.net = gross - (deductions + loanDeduction);
      
      // If deductions changed, also update loan_deduction to maintain separation
      if (name === 'deductions') {
        // Keep loan_deduction separate from other deductions
        updatedFormData.loan_deduction = formData.loan_deduction;
      }
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
    const loanDeductionValue = editData.loan_deduction !== undefined ? editData.loan_deduction : (currentPayroll.loan_deduction || 0);
    const netValue = grossValue - deductionsValue - loanDeductionValue;

    const { error } = await supabase
      .from("payrolls")
      .update({
        gross: grossValue,
        deductions: deductionsValue,
        loan_deduction: loanDeductionValue,
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
      loan_deduction: Number(formData.loan_deduction),
      net: Number(formData.net),
      status: formData.status,
    });

    setShowForm(false);
    setFormData({
      user_id: "",
      period: "",
      gross: 0,
      deductions: 0,
      loan_deduction: 0,
      net: 0,
      status: "Pending",
    });
  };

  // Only show users who have actual payroll records
  const payrolls = users
    .filter((user) => user.payrolls?.length > 0) // Filter out users without payroll records
    .map((user) =>
      user.payrolls.map((pr: any) => ({
        ...pr,
        userId: user.id,
        name: user.name,
        role: user.role,
      }))
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
      // Primary sort: ALWAYS sort by latest payroll additions first (created_at desc)
      // This ensures the most recently added payrolls appear at the top
      if (a.created_at && b.created_at) {
        // Sort by created_at in descending order (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      // Records with payroll data always come before records without payroll
      if (a.created_at && !b.created_at) return -1;
      if (!a.created_at && b.created_at) return 1;
      
      // For records without payroll data, sort by name
      return a.name.localeCompare(b.name);
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortByEmployeeType, sortByPeriod]);

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
            </div>
          </div>
        </section>

        {/* Penalty & Loan System Information */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl mt-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-800">Penalty & Loan System</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-red-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Late:</span>
                <span className="text-gray-700">₱1/min</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-medium">Absent:</span>
                <span className="text-gray-700">₱240/day</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Loan:</span>
                <span className="text-gray-700">Per 15-day period</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Auto-calculated</span>
              </div>
            </div>
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
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Loan Deduction</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Net Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600 font-medium">Loading payroll records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPayrolls.length > 0 ? (
                  paginatedPayrolls.map((pr) => (
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
                        <span className="font-semibold text-blue-600 text-sm">
                          {pr.loan_deduction ? `₱${pr.loan_deduction.toLocaleString()}` : "--"}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-bold text-green-600 text-sm">
                          {editing === pr.id
                            ? `₱${(
                                (editData.gross || pr.gross) -
                                (editData.deductions || pr.deductions) -
                                (editData.loan_deduction || pr.loan_deduction || 0)
                              ).toLocaleString()}`
                            : pr.status !== "No Payroll" && pr.gross > 0 && (pr.deductions !== undefined || pr.loan_deduction > 0)
                            ? `₱${(pr.gross - (pr.deductions || 0) - (pr.loan_deduction || 0)).toLocaleString()}`
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
                                  deductions: pr.deductions,
                                  loan_deduction: pr.loan_deduction || 0
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
                                console.log('📋 [PayrollAcc] Opening history modal for user:', pr.userId, pr.name);
                                setSelectedUser(pr);
                                
                                // Fetch penalties, loans, and attendance history for the specific user
                                console.log('📋 [PayrollAcc] Fetching data for user ID:', pr.userId, 'period:', pr.period);
                                
                                // Calculate date range (last 15 days)
                                const endDate = new Date().toISOString().split('T')[0];
                                const startDate = new Date();
                                startDate.setDate(startDate.getDate() - 15);
                                const startDateStr = startDate.toISOString().split('T')[0];
                                
                                // Fetch all data in parallel
                                const [penaltyResult, loanResult, attendanceData] = await Promise.all([
                                  calculatePenalties(pr.userId, pr.period),
                                  fetchUserLoans(pr.userId),
                                  supabase
                                    .from("attendance")
                                    .select(`
                                      id,
                                      att_date,
                                      time_in,
                                      time_out,
                                      late_minutes,
                                      overtime_minutes,
                                      penalty_amount,
                                      notes
                                    `)
                                    .eq('user_id', pr.userId)
                                    .gte('att_date', startDateStr)
                                    .lte('att_date', endDate)
                                    .order("att_date", { ascending: false })
                                ]);
                                
                                console.log('📋 [PayrollAcc] Penalty data received:', penaltyResult);
                                console.log('📋 [PayrollAcc] Loan data received:', loanResult);
                                console.log('📋 [PayrollAcc] Attendance data received:', attendanceData.data?.length || 0, 'records');
                                
                                // Update state
                                const newLoans = { ...loans };
                                newLoans[pr.userId] = loanResult;
                                setLoans(newLoans);
                                
                                setPenaltyData(penaltyResult);
                                setAttendanceHistory(attendanceData.data || []);
                                setShowHistoryModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-md hover:from-purple-700 hover:to-purple-800 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View History
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
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
          
          {/* Pagination Controls */}
          {filteredPayrolls.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="relative flex items-center justify-center gap-4">
                {/* Page Info - Positioned on the left */}
                <div className="absolute left-0 text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-gray-800">{Math.min(endIndex, filteredPayrolls.length)}</span> of{" "}
                  <span className="font-semibold text-gray-800">{filteredPayrolls.length}</span> records
                </div>
                
                {/* Pagination Buttons - Centered */}
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1 ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                      
                      // Show ellipsis
                      const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2;
                      
                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span key={pageNum} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      
                      if (!showPage) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                            currentPage === pageNum
                              ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md"
                              : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1 ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-500 hover:text-red-600"
                    }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modern Add Payroll Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4 overflow-y-auto">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 my-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Add Payroll Record</h2>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period (15 days)</label>
                  <input
                    type="text"
                    name="period"
                    placeholder="Period (e.g. Jan 1-15, 2025 or Jan 16-31, 2025)"
                    value={formData.period}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
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
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
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
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.user_id && penalties[parseInt(formData.user_id)] > 0 
                      ? `₱${penalties[parseInt(formData.user_id)].toLocaleString()} penalties (attendance-based)`
                      : "Select employee to auto-fill penalties"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Deduction</label>
                  <input
                    type="number"
                    name="loan_deduction"
                    placeholder="Auto-filled with loan deductions"
                    value={formData.loan_deduction}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.user_id && loans[parseInt(formData.user_id)]?.totalLoanDeduction > 0 
                      ? `₱${loans[parseInt(formData.user_id)].totalLoanDeduction.toLocaleString()} from ${loans[parseInt(formData.user_id)].activeLoans.length} active loan(s)`
                      : "Select employee to auto-fill loan deductions"}
                  </p>
                  {formData.user_id && loans[parseInt(formData.user_id)]?.activeLoans?.length > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-blue-800 mb-2">Active Loans:</p>
                      {loans[parseInt(formData.user_id)].activeLoans.map((loan: any, index: number) => (
                        <div key={index} className="mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-b-0 border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-blue-800">
                              Loan #{index + 1}: ₱{loan.amount?.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-blue-900">
                              ₱{(loan.period_payment || loan.period_deduction)?.toLocaleString()}/period
                            </span>
                          </div>
                          <div className="text-xs text-blue-600">
                            {loan.periods_paid || 0}/{loan.total_periods || 0} periods paid • {loan.periods_remaining || 0} remaining
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Net Pay (Auto-calculated)</label>
                  <input
                    type="number"
                    name="net"
                    placeholder="Auto-calculated"
                    value={formData.net}
                    readOnly
                    className="w-full border-2 border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-gray-700 cursor-not-allowed transition-all duration-200 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">This field is automatically calculated from Gross Pay - (Deductions + Loan Deduction)</p>
                  {formData.gross > 0 && (formData.deductions > 0 || formData.loan_deduction > 0) && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs">
                      <p className="font-medium text-green-800">Calculation Breakdown:</p>
                      <p className="text-green-700">Gross: ₱{formData.gross.toLocaleString()}</p>
                      <p className="text-green-700">- Deductions: ₱{formData.deductions.toLocaleString()}</p>
                      <p className="text-green-700">- Loan Deduction: ₱{formData.loan_deduction.toLocaleString()}</p>
                      <hr className="my-1 border-green-200" />
                      <p className="font-medium text-green-800">Net Pay: ₱{formData.net.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center gap-3 mt-4">
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

        {/* Payroll History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Payroll History</h2>
                      <p className="text-gray-600 text-sm">Complete payroll breakdown and attendance records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Information Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl mb-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Employee Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Employee Name</p>
                      <p className="font-semibold text-gray-800">{selectedUser?.name}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                      <p className="font-semibold text-gray-800">#{selectedUser?.userId}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Role</p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getEmployeeTypeColor(selectedUser?.role).split(' ').slice(2).join(' ')}`}>
                        {selectedUser?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payroll Summary Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl mb-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Payroll Summary</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Period</p>
                      <p className="font-bold text-gray-800">{selectedUser?.period}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Gross Pay</p>
                      <p className="font-bold text-green-600 text-lg">₱{selectedUser?.gross?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Deductions (Penalties)</p>
                      <p className="font-bold text-red-600 text-lg">₱{selectedUser?.deductions?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Loan Deduction</p>
                      <p className="font-bold text-blue-600 text-lg">₱{selectedUser?.loan_deduction?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-lg shadow-md">
                      <p className="text-xs text-emerald-100 mb-1">Net Pay</p>
                      <p className="font-bold text-white text-lg">₱{selectedUser?.net?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        selectedUser?.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedUser?.status === "Finalized"
                          ? "bg-green-100 text-green-800"
                          : selectedUser?.status === "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {selectedUser?.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendance Schedule Section (Past 15 Days) */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-5 rounded-xl mb-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Attendance Schedule (Past 15 Days)</h3>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {attendanceHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Time In</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Time Out</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Late (min)</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Overtime (min)</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Penalty</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceHistory.map((record, index) => {
                              const formatTime = (timestamp: string | null) => {
                                if (!timestamp) return '--';
                                return new Date(timestamp).toLocaleTimeString('en-PH', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'Asia/Manila'
                                });
                              };
                              
                              const formatDate = (date: string) => {
                                return new Date(date).toLocaleDateString('en-PH', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  timeZone: 'Asia/Manila'
                                });
                              };
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                    {formatDate(record.att_date)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {formatTime(record.time_in)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {formatTime(record.time_out)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {record.late_minutes > 0 ? (
                                      <span className="text-yellow-600 font-semibold">{record.late_minutes}</span>
                                    ) : (
                                      <span className="text-gray-400">--</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {record.overtime_minutes > 0 ? (
                                      <span className="text-purple-600 font-semibold">{record.overtime_minutes}</span>
                                    ) : (
                                      <span className="text-gray-400">--</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {record.penalty_amount > 0 ? (
                                      <span className="text-red-600 font-bold">₱{record.penalty_amount}</span>
                                    ) : (
                                      <span className="text-green-600 font-semibold">₱0</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                    {record.notes || '--'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium">No attendance records found</p>
                        <p className="text-gray-500 text-sm">No attendance data available for the past 15 days</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions Breakdown Section */}
                <div className="bg-gradient-to-br from-red-50 to-orange-100 p-5 rounded-xl mb-6 border border-red-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Deductions Breakdown</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Late Penalties Card */}
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl text-white shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-semibold text-sm">Late Penalties</h4>
                      </div>
                      <p className="text-2xl font-bold mb-1">{penaltyData.breakdown?.lateMinutes || 0} min</p>
                      <p className="text-yellow-100 text-sm">₱{penaltyData.breakdown?.latePenalty || 0}</p>
                    </div>

                    {/* Absent Penalties Card */}
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-semibold text-sm">Absent Penalties</h4>
                      </div>
                      <p className="text-2xl font-bold mb-1">{penaltyData.breakdown?.absentCount || 0} days</p>
                      <p className="text-red-100 text-sm">₱{penaltyData.breakdown?.absentPenalty || 0}</p>
                    </div>

                    {/* Loan Deductions Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-semibold text-sm">Loan Deductions</h4>
                      </div>
                      <p className="text-2xl font-bold mb-1">{loans[selectedUser?.userId]?.activeLoans?.length || 0} loans</p>
                      <p className="text-blue-100 text-sm">₱{loans[selectedUser?.userId]?.totalLoanDeduction || 0}</p>
                    </div>

                    {/* Total Deductions Card */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h4 className="font-semibold text-sm">Total Deductions</h4>
                      </div>
                      <p className="text-2xl font-bold mb-1">₱{(penaltyData.totalPenalty || 0) + (loans[selectedUser?.userId]?.totalLoanDeduction || 0)}</p>
                      <p className="text-purple-100 text-sm">Penalties + Loans</p>
                    </div>
                  </div>

                  {/* Active Loans Details */}
                  {loans[selectedUser?.userId]?.activeLoans?.length > 0 && (
                    <div className="bg-white border border-blue-200 p-4 rounded-lg shadow-sm">
                      <p className="text-blue-800 font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Active Loan Details:
                      </p>
                      <div className="space-y-2">
                        {loans[selectedUser?.userId].activeLoans.map((loan: any, index: number) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-blue-800">
                                Loan #{index + 1}: ₱{loan.amount?.toLocaleString()}
                              </span>
                              <span className="text-sm font-bold text-blue-900">
                                ₱{(loan.period_payment || loan.period_deduction)?.toLocaleString()}/period
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-600">
                                Progress: {loan.periods_paid || 0}/{loan.total_periods || 0} periods paid
                              </span>
                              <span className="text-blue-700 font-medium">
                                {loan.periods_remaining || 0} periods remaining
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

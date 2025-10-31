// src/pages/Payroll.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Payroll = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [search, setSearch] = useState(""); // 🔍 search state
  const [sortByEmployeeType, setSortByEmployeeType] = useState("");
  const [sortByPeriod, setSortByPeriod] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [penaltyData, setPenaltyData] = useState<any>({});
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loans, setLoans] = useState<{[key: number]: any}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select(`
      id,
      name,
      role,
      profile_picture,
      payrolls (
        id,
        period,
        gross,
        deductions,
        loan_deduction,
        net,
        status,
        created_at
      )
    `).order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  // Fetch approved loans for a user with period tracking
  const fetchUserLoans = async (userId: number): Promise<{
    totalLoanDeduction: number;
    activeLoans: any[];
  }> => {
    try {
      console.log('💰 [HRPayroll] Fetching approved loans for user:', userId);
      
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
        console.error('❌ [HRPayroll] Error fetching loans:', loanError);
        return { totalLoanDeduction: 0, activeLoans: [] };
      }

      if (!loanRequests || loanRequests.length === 0) {
        console.log('💰 [HRPayroll] No approved loans found for user:', userId);
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
        console.error('❌ [HRPayroll] Error fetching payroll records:', payrollError);
      }

      console.log('💰 [HRPayroll] Found', payrollRecords?.length || 0, 'payroll records with loan deductions');

      // Calculate total per-period deduction from all active loans
      let totalLoanDeduction = 0;
      const activeLoans = [];

      for (const loan of loanRequests) {
        const periodPayment = loan.period_deduction || 0;
        const totalPeriods = loan.total_periods || 0;
        
        if (periodPayment <= 0 || totalPeriods <= 0) {
          console.log(`⚠️ [HRPayroll] Skipping loan ${loan.id}: Invalid period payment or total periods`);
          continue;
        }

        // Count how many periods have been paid for this loan
        const loanApprovedDate = new Date(loan.approved_date || loan.created_at);
        const periodsPaid = payrollRecords?.filter(pr => {
          const payrollDate = new Date(pr.created_at);
          return payrollDate >= loanApprovedDate && pr.loan_deduction > 0;
        }).length || 0;

        console.log(`💰 [HRPayroll] Loan ${loan.id}: ${periodsPaid}/${totalPeriods} periods paid`);

        // Only include loan if not fully paid
        if (periodsPaid < totalPeriods) {
          totalLoanDeduction += periodPayment;
          activeLoans.push({
            ...loan,
            period_payment: periodPayment,
            periods_paid: periodsPaid,
            periods_remaining: totalPeriods - periodsPaid
          });
          console.log(`✅ [HRPayroll] Active loan: ₱${loan.amount} (₱${periodPayment}/period, ${totalPeriods - periodsPaid} periods remaining)`);
        } else {
          console.log(`✅ [HRPayroll] Loan ${loan.id} fully paid (${periodsPaid}/${totalPeriods} periods completed)`);
        }
      }

      console.log('💰 [HRPayroll] Total loan deduction:', totalLoanDeduction);
      console.log('💰 [HRPayroll] Active loans count:', activeLoans.length);
      return { totalLoanDeduction, activeLoans };
    } catch (error) {
      console.error('❌ [HRPayroll] Error fetching loans:', error);
      return { totalLoanDeduction: 0, activeLoans: [] };
    }
  };

  // Function to calculate penalties - EXACT COPY from PayrollAcc.tsx (both regular and class schedule attendance)
  const calculatePenalties = async (userId: number, period: string) => {
    try {
      console.log('🔍 [HRPayroll] Calculating penalties for user:', userId, 'period:', period);
      console.log('📅 [HRPayroll] Using BOTH regular attendance (dual session) AND class schedule attendance - aligned with PayrollAcc.tsx');

      // Calculate date range for penalty calculation
      let startDate: string;
      let endDate: string;
      
      if (period && period !== '--') {
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

      console.log('📅 [HRPayroll] Date range:', startDate, 'to', endDate);

      // 🔥 PART 1: Fetch regular attendance records (dual session) with penalty data
      const { data: regularAttendanceData, error: regularAttendanceError } = await supabase
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
          created_at
        `)
        .eq('user_id', userId)
        .gte('att_date', startDate)
        .lte('att_date', endDate)
        .order("att_date", { ascending: false });

      if (regularAttendanceError) {
        console.error('❌ [HRPayroll] Error fetching regular attendance:', regularAttendanceError);
      }

      // 🔥 PART 2: Fetch class schedule attendance data
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
          created_at
        `)
        .eq('user_id', userId)
        .order("created_at", { ascending: false });

      if (schedulesError) {
        console.error('❌ [HRPayroll] Error fetching schedules:', schedulesError);
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
        console.error('❌ [HRPayroll] Error fetching class attendance:', classAttendanceError);
      }

      console.log('📊 [HRPayroll] Fetched regular attendance records:', regularAttendanceData?.length || 0);
      console.log('📊 [HRPayroll] Fetched schedules:', schedulesData?.length || 0);
      console.log('📊 [HRPayroll] Fetched class attendance records:', classAttendanceData?.length || 0);

      // 🔥 PART 3: Process regular attendance penalties (dual session)
      let totalPenalty = 0;
      let totalLateMinutes = 0;
      let totalLatePenalty = 0;
      let totalAbsentPenalty = 0;
      let absentCount = 0;
      
      const lateRecords: any[] = [];
      const absentRecords: any[] = [];

      // Process regular attendance records
      for (const record of regularAttendanceData || []) {
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
          console.log(`⏰ [HRPayroll] Regular attendance late on ${record.att_date}: ${record.late_minutes} minutes = ₱${record.late_minutes}`);
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
          console.log(`❌ [HRPayroll] Regular attendance absent on ${record.att_date}: ₱240 penalty`);
        }
      }

      // 🔥 PART 4: Process class schedule attendance
      const combinedScheduleData = (schedulesData || []).map(schedule => {
        // Find the most recent attendance record for this schedule
        const attendanceRecords = (classAttendanceData || []).filter(att => 
          att.schedule_id === schedule.id
        );
        
        // Sort by date descending to get the most recent record
        const mostRecentRecord = attendanceRecords.sort((a, b) => 
          new Date(b.att_date).getTime() - new Date(a.att_date).getTime()
        )[0];

        // If no attendance record exists, mark as absent
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

      console.log('📊 [HRPayroll] Class schedule - Late:', classLateRecords.length, 'Absent:', classAbsentRecords.length);

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
            console.log(`⏰ [HRPayroll] Class schedule late - ${record.subject} on ${record.att_date}: ${minutesLate} minutes = ₱${minutesLate}`);
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
        console.log(`❌ [HRPayroll] Class schedule absent - ${record.subject} on ${record.att_date}: ₱240 penalty`);
      }

      console.log('💰 [HRPayroll] TOTAL PENALTIES (Regular + Class Schedule):');
      console.log('💰 [HRPayroll] - Total late minutes:', totalLateMinutes, '= ₱' + totalLatePenalty);
      console.log('💰 [HRPayroll] - Total absent count:', absentCount, '= ₱' + totalAbsentPenalty);
      console.log('💰 [HRPayroll] - GRAND TOTAL: ₱' + totalPenalty);

      // Fetch loan deductions for complete penalty calculation
      const loanResult = await fetchUserLoans(userId);
      const totalPenaltyWithLoans = totalPenalty + loanResult.totalLoanDeduction;

      console.log('💰 [HRPayroll] Including loans in penalty calculation:');
      console.log('💰 [HRPayroll] - Attendance penalties: ₱' + totalPenalty);
      console.log('💰 [HRPayroll] - Loan deductions: ₱' + loanResult.totalLoanDeduction);
      console.log('💰 [HRPayroll] - Total with loans: ₱' + totalPenaltyWithLoans);

      return {
        lateCount: lateRecords.length,
        absentCount: absentCount,
        totalLatePenalty,
        totalAbsentPenalty,
        totalPenalty: totalPenaltyWithLoans, // Include loans in total
        attendancePenalty: totalPenalty, // Separate attendance penalty
        loanDeduction: loanResult.totalLoanDeduction,
        activeLoans: loanResult.activeLoans,
        totalLateMinutes,
        attendanceRecords: filteredClassScheduleData || [],
        lateRecords,
        absentRecords,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('❌ [HRPayroll] Error calculating penalties:', error);
      return { lateCount: 0, absentCount: 0, totalPenalty: 0, totalLatePenalty: 0, totalAbsentPenalty: 0, attendancePenalty: 0, loanDeduction: 0, activeLoans: [], totalLateMinutes: 0, attendanceRecords: [], lateRecords: [], absentRecords: [], error: 'Calculation failed' };
    }
  };




  useEffect(() => {
    fetchPayrolls();
  }, []);

  const finalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Finalized" })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchPayrolls();
  };

  const unfinalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Pending" })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchPayrolls();
  };

  const savePayroll = async (id: number) => {
    // Find the current payroll record to get existing values
    const currentPayroll = payrolls.find(pr => pr.id === id);
    if (!currentPayroll) {
      alert("Payroll record not found");
      return;
    }

    // Use existing values if editData doesn't have them (for partial updates)
    const grossValue = editData.gross !== undefined ? editData.gross : currentPayroll.gross;
    const deductionsValue = editData.deductions !== undefined ? editData.deductions : currentPayroll.deductions;
    const loanDeductionValue = currentPayroll.loan_deduction || 0;
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

    if (error) alert(error.message);
    else {
      setEditing(null);
      setEditData({});
      fetchPayrolls();
    }
  };

  // Open payslip modal for preview/printing
  const openPayslip = (pr: any) => {
    setPayslipData(pr);
    setShowPayslipModal(true);
  };

  // Print payslip by opening a new window with a clean layout and invoking print
  const printPayslip = (data: any) => {
    try {
      const gross = data.gross || 0;
      const deductions = data.deductions || 0;
      const loan = data.loan_deduction || 0;
      const net = data.net || (gross - deductions - loan);
      
      // Format current date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Payslip - ${data.name}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: 'Arial', sans-serif;
              background: white;
              padding: 0;
              font-size: 9pt;
              line-height: 1.3;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .payslip-container {
              max-width: 240mm;
              width: 90%;
              margin: 0 auto;
              background: white;
              border: 2px solid #000;
              padding: 0;
            }
            .header {
              text-align: center;
              padding: 15px 20px;
              border-bottom: 2px solid #000;
            }
            .header h1 {
              font-size: 13pt;
              font-weight: bold;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .header .subtitle {
              font-size: 8pt;
              margin-bottom: 6px;
            }
            .header .period {
              font-size: 9pt;
              font-weight: bold;
              margin-top: 6px;
            }
            .section {
              padding: 10px 15px;
              border-bottom: 2px solid #000;
            }
            .section:last-child {
              border-bottom: none;
            }
            .section-title {
              font-weight: bold;
              font-size: 9pt;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 120px 1fr;
              gap: 4px;
              font-size: 8pt;
            }
            .info-label {
              font-weight: normal;
            }
            .info-value {
              font-weight: normal;
            }
            .two-column {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .column-section {
              display: flex;
              flex-direction: column;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 8pt;
            }
            .amount-label {
              font-weight: normal;
            }
            .amount-value {
              font-weight: normal;
              text-align: right;
              min-width: 70px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              margin-top: 6px;
              border-top: 2px solid #000;
              font-weight: bold;
              font-size: 9pt;
            }
            .net-pay-section {
              background: #f5f5f5;
              padding: 10px 15px;
              text-align: center;
            }
            .net-pay-label {
              font-size: 9pt;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .net-pay-amount {
              font-size: 13pt;
              font-weight: bold;
            }
            .footer {
              padding: 10px 15px;
              font-size: 8pt;
              text-align: center;
              border-top: 2px solid #000;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding: 0 20px;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-bottom: 5px;
              padding-top: 40px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <!-- Header -->
            <div class="header">
              <h1>ST. PETERS COLLEGE-PAYSLIP</h1>
              <div class="subtitle">Period: AUGUST 11 - AUGUST 25,2025</div>
              <div class="period">${data.period || 'N/A'}</div>
            </div>

            <!-- Employee Information -->
            <div class="section">
              <div class="section-title">INCOME:</div>
              <div class="info-grid">
                <div class="info-label">Department:</div>
                <div class="info-value">${data.role || 'N/A'}</div>
                
                <div class="info-label">Employee Name:</div>
                <div class="info-value">${data.name || 'N/A'}</div>
                
                <div class="info-label">ID #:</div>
                <div class="info-value">${data.userId || 'N/A'}</div>
              </div>
            </div>

            <!-- Income and Deductions -->
            <div class="section">
              <div class="two-column">
                <!-- Income Column -->
                <div class="column-section">
                  <div class="amount-row">
                    <div class="amount-label">Basic Rate:</div>
                    <div class="amount-value">${gross.toFixed(2)}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">No. of Days/Hrs Worked:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Basic Pay:</div>
                    <div class="amount-value">${gross.toFixed(2)}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Accumulated Overtimes:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Extra Load Amount:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">13th Month:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Other Income:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="total-row">
                    <div>GROSS PAY:</div>
                    <div>${gross.toFixed(2)}</div>
                  </div>
                  <div class="total-row">
                    <div>ADD: OTHER BENEFITS:</div>
                    <div>--</div>
                  </div>
                  <div class="total-row">
                    <div>TOTAL PAY:</div>
                    <div>${gross.toFixed(2)}</div>
                  </div>
                </div>

                <!-- Deductions Column -->
                <div class="column-section">
                  <div class="section-title">DEDUCTIONS:</div>
                  <div class="amount-row">
                    <div class="amount-label">SSS Employee Share:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">PHILHEALTH Payable:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">HDMF/EE Payable:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Groceries/Canteen:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">HDMF Loan:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Booklet/Loan:</div>
                    <div class="amount-value">${loan.toFixed(2)}</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">SSS Loan:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">COOP:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Cash Advances:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Uniform/Misc:</div>
                    <div class="amount-value">--</div>
                  </div>
                  <div class="amount-row">
                    <div class="amount-label">Other Deductions:</div>
                    <div class="amount-value">${deductions.toFixed(2)}</div>
                  </div>
                  <div class="total-row">
                    <div>TOTAL DEDUCTIONS:</div>
                    <div>${(deductions + loan).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Net Pay -->
            <div class="net-pay-section">
              <div class="net-pay-label">PAYROLL NET PAY:</div>
              <div class="net-pay-amount">${net.toFixed(2)}</div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div>Date: ${currentDate}</div>
              <div style="margin-top: 10px;">Received by:</div>
              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div>Employee Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
      if (!w) {
        alert('Unable to open print window. Please allow popups.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      // Delay slightly to ensure styles load
      setTimeout(() => {
        w.focus();
        w.print();
        // Optionally close after printing
        // w.close();
      }, 300);
    } catch (err) {
      console.error('Error printing payslip', err);
      alert('Failed to print payslip');
    }
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
        profile_picture: user.profile_picture || null,
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
      
      // Primary sort: Recent payroll additions from accounting (created_at desc)
      // Prioritize records with actual payroll data (created_at exists)
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (a.created_at && !b.created_at) return -1; // Records with payroll first
      if (!a.created_at && b.created_at) return 1;  // Records without payroll last
      
      // Fallback sort by name for records without payroll
      return a.name.localeCompare(b.name);
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset pagination when filters change
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Payroll Management</h1>
            </div>
            <p className="text-gray-600">Manage employee salaries and payroll processing</p>
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

            {/* Refresh Button */}
            <button
              onClick={fetchPayrolls}
              className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </section>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Total Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Records</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.length}</p>
                <p className="text-blue-100 text-xs mt-1">Payroll entries</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Pending Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Pending</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.filter(p => p.status === "Pending").length}</p>
                <p className="text-yellow-100 text-xs mt-1">Awaiting processing</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Finalized Payrolls */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Finalized</h2>
                </div>
                <p className="text-2xl font-bold">{filteredPayrolls.filter(p => p.status === "Finalized").length}</p>
                <p className="text-green-100 text-xs mt-1">Completed payrolls</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Total Amount */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total Amount</h2>
                </div>
                <p className="text-2xl font-bold">₱{filteredPayrolls.reduce((sum, p) => sum + (p.net || 0), 0).toLocaleString()}</p>
                <p className="text-purple-100 text-xs mt-1">Net payroll total</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
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
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Employee Type</th>
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
                    <td colSpan={9} className="text-center py-8">
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
                        ) : pr.gross > 0 ? (
                          <span className="font-semibold text-gray-700 text-sm">₱{pr.gross.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-500 text-sm">--</span>
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
                        ) : pr.deductions > 0 ? (
                          <span className="font-semibold text-red-600 text-sm">₱{pr.deductions.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-500 text-sm">--</span>
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
                                (pr.loan_deduction || 0)
                              ).toLocaleString()}`
                            : pr.net > 0
                            ? `₱${pr.net.toLocaleString()}`
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
                        <div className="flex flex-nowrap gap-1">
                          {pr.status === "Pending" && editing !== pr.id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditing(pr.id);
                                  // Initialize editData with current values
                                  setEditData({
                                    gross: pr.gross,
                                    deductions: pr.deductions
                                  });
                                }}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium transition-all duration-200 hover:bg-blue-700 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  console.log('📋 [HRPayroll] Opening history modal for user:', pr.userId, pr.name);
                                  setSelectedUser(pr);
                                  
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
                                  
                                  console.log('📋 [HRPayroll] Penalty data received:', penaltyResult);
                                  console.log('📋 [HRPayroll] Loan data received:', loanResult);
                                  console.log('📋 [HRPayroll] Attendance data received:', attendanceData.data?.length || 0, 'records');
                                  
                                  // Update state
                                  const newLoans = { ...loans };
                                  newLoans[pr.userId] = loanResult;
                                  setLoans(newLoans);
                                  
                                  setPenaltyData(penaltyResult);
                                  setAttendanceHistory(attendanceData.data || []);
                                  setShowHistoryModal(true);
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded text-xs font-medium transition-all duration-200 hover:from-purple-700 hover:to-purple-800 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                History
                              </button>
                              <button
                                onClick={() => openPayslip(pr)}
                                className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium transition-all duration-200 hover:bg-indigo-700 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 4h6a2 2 0 002-2v-3H7v3a2 2 0 002 2z" />
                                </svg>
                                Pay Slip
                              </button>
                            </>
                          )}
                          {editing === pr.id && (
                            <button
                              onClick={() => savePayroll(pr.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium transition-all duration-200 hover:bg-green-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </button>
                          )}
                          {pr.status === "Pending" ? (
                            <button
                              onClick={() => finalizePayroll(pr.id)}
                              className="px-2 py-1 bg-green-700 text-white rounded text-xs font-medium transition-all duration-200 hover:bg-green-800 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Finalize
                            </button>
                          ) : pr.status === "Finalized" ? (
                            <button
                              onClick={() => unfinalizePayroll(pr.id)}
                              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-medium transition-all duration-200 hover:bg-yellow-700 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Unfinalize
                            </button>
                          ) : null}
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
                            onClick={fetchPayrolls}
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

        {/* Pagination Controls */}
        {filteredPayrolls.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPayrolls.length)} of {filteredPayrolls.length} records
            </div>
            
            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Items per page info */}
            <div className="text-sm text-gray-500">
              {itemsPerPage} per page
            </div>
          </div>
        )}

        {/* Payslip Preview Modal (minimal, modern, printable) */}
        {showPayslipModal && payslipData && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Payslip Preview</h2>
                    <p className="text-sm text-gray-500">A modern payslip aligned with the system style. Print a clean copy.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowPayslipModal(false); setPayslipData(null); }}
                      className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => printPayslip(payslipData)}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-medium shadow hover:from-red-700"
                    >
                      Print Payslip
                    </button>
                  </div>
                </div>

                <div className="p-4 border-2 border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        {payslipData?.profile_picture ? (
                          <img src={payslipData.profile_picture} alt={payslipData.name || 'Employee'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white">
                            <img src="/assets/images/spclogo.png" alt="SPC Logo" className="w-8 h-8 object-contain" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Employee</div>
                        <div className="font-semibold text-gray-800">{payslipData.name}</div>
                        <div className="text-xs text-gray-500">{payslipData.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Employee #</div>
                      <div className="font-semibold text-gray-800">#{payslipData.userId}</div>
                      <div className="text-xs text-gray-500">Period: {payslipData.period || '--'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200 text-center">
                      <div className="text-xs text-gray-500">Gross Pay</div>
                      <div className="font-bold text-green-600">₱{(payslipData.gross || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200 text-center">
                      <div className="text-xs text-gray-500">Deductions</div>
                      <div className="font-bold text-red-600">₱{(payslipData.deductions || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200 text-center">
                      <div className="text-xs text-gray-500">Loan Deduction</div>
                      <div className="font-bold text-blue-600">₱{(payslipData.loan_deduction || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-lg text-white text-center">
                      <div className="text-xs opacity-90">Net Pay</div>
                      <div className="font-bold text-xl">₱{(payslipData.net || ((payslipData.gross || 0) - (payslipData.deductions || 0) - (payslipData.loan_deduction || 0))).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payroll History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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
                      <p className="text-2xl font-bold mb-1">{penaltyData.totalLateMinutes || 0} min</p>
                      <p className="text-yellow-100 text-sm">₱{penaltyData.totalLatePenalty || 0}</p>
                    </div>

                    {/* Absent Penalties Card */}
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="font-semibold text-sm">Absent Penalties</h4>
                      </div>
                      <p className="text-2xl font-bold mb-1">{penaltyData.absentCount || 0} days</p>
                      <p className="text-red-100 text-sm">₱{penaltyData.totalAbsentPenalty || 0}</p>
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
                      <p className="text-2xl font-bold mb-1">₱{(penaltyData.attendancePenalty || 0) + (loans[selectedUser?.userId]?.totalLoanDeduction || 0)}</p>
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
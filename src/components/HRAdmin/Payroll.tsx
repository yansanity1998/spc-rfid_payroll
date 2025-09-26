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

  const fetchPayrolls = async () => {
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
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  // Function to calculate penalties based on class schedule attendance (ALIGNED with PayrollAcc.tsx)
  const calculatePenalties = async (userId: number, period: string) => {
    try {
      console.log('🔍 [HRAdmin] Calculating penalties for user:', userId, 'period:', period);
      console.log('📅 [HRAdmin] Using EXACT same logic as Dashboard.tsx and PayrollAcc.tsx');

      // Fetch attendance records (same as Dashboard.tsx and PayrollAcc.tsx)
      const { data: attendanceData, error: attendanceError } = await supabase
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
        .order("created_at", { ascending: false });

      if (attendanceError) {
        console.error('❌ [HRAdmin] Error fetching class attendance:', attendanceError);
        return { lateCount: 0, absentCount: 0, totalPenalty: 0, error: attendanceError.message };
      }

      // Fetch user's schedules (same as Dashboard.tsx and PayrollAcc.tsx)
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select(`
          id,
          user_id,
          day_of_week,
          start_time,
          end_time,
          subject,
          room
        `)
        .eq('user_id', userId);

      if (schedulesError) {
        console.error('❌ [HRAdmin] Error fetching schedules:', schedulesError);
        return { lateCount: 0, absentCount: 0, totalPenalty: 0, error: schedulesError.message };
      }

      console.log('📊 [HRAdmin] Fetched attendance records:', attendanceData?.length || 0);
      console.log('📊 [HRAdmin] Fetched user schedules:', schedulesData?.length || 0);

      // Combine schedules with their most recent attendance records (EXACT same logic as Dashboard.tsx)
      const combinedScheduleData = (schedulesData || []).map(schedule => {
        // Find the most recent attendance record for this schedule
        const attendanceRecords = (attendanceData || []).filter(att => 
          att.schedule_id === schedule.id
        );
        
        // Sort by date descending to get the most recent record
        const mostRecentRecord = attendanceRecords.sort((a, b) => 
          new Date(b.att_date).getTime() - new Date(a.att_date).getTime()
        )[0];

        // If no attendance record exists, mark as absent (same as Dashboard.tsx)
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

      console.log('📊 [HRAdmin] Combined schedule data:', combinedScheduleData?.length || 0);

      // Separate late and absent records from combined data (same as PayrollAcc.tsx)
      const lateRecords = combinedScheduleData?.filter(record => record.attendance === 'Late') || [];
      const absentRecords = combinedScheduleData?.filter(record => record.attendance === 'Absent') || [];
      
      const lateCount = lateRecords.length;
      const absentCount = absentRecords.length;

      console.log('📈 [HRAdmin] Dashboard-aligned penalty counts - Late:', lateCount, 'Absent:', absentCount);
      console.log('🔍 [HRAdmin] Late schedules:', lateRecords);
      console.log('🔍 [HRAdmin] Absent schedules:', absentRecords);

      // Calculate late penalties: ₱1 per minute late
      let totalLatePenalty = 0;
      let totalLateMinutes = 0;
      
      for (const record of lateRecords) {
        // Schedule data is directly in the record now (not nested)
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
            totalLatePenalty += minutesLate; // ₱1 per minute
            console.log(`⏰ [HRAdmin] ${record.subject} on ${record.att_date}: ${minutesLate} minutes late = ₱${minutesLate}`);
          }
        }
      }

      // Calculate absent penalties: ₱240 per absent
      const absentPenalty = 240; // ₱240 per absent
      const totalAbsentPenalty = absentCount * absentPenalty;
      
      const totalPenalty = totalLatePenalty + totalAbsentPenalty;

      console.log('💰 [HRAdmin] Calculated penalties - Late: ₱' + totalLatePenalty + ', Absent: ₱' + totalAbsentPenalty + ', Total: ₱' + totalPenalty);

      return {
        lateCount,
        absentCount,
        totalLatePenalty,
        totalAbsentPenalty,
        totalPenalty,
        totalLateMinutes,
        attendanceRecords: combinedScheduleData || [],
        lateRecords,
        absentRecords
      };
    } catch (error) {
      console.error('❌ Error calculating penalties:', error);
      return { lateCount: 0, absentCount: 0, totalPenalty: 0, error: 'Calculation failed' };
    }
  };

  // Function to open penalty calculation modal (VIEW-ONLY)
  const openPenaltyModal = async (payroll: any) => {
    setSelectedUser(payroll);
    const penalties = await calculatePenalties(payroll.userId, payroll.period);
    setPenaltyData(penalties);
    setShowPenaltyModal(true);
    
    // NO automatic application - modal is view-only now
  };


  // Function to apply penalties to payroll
  const applyPenalties = async () => {
    if (!selectedUser || !penaltyData) return;

    const currentDeductions = selectedUser.deductions || 0;
    const newDeductions = currentDeductions + penaltyData.totalPenalty;
    const newNet = selectedUser.gross - newDeductions;

    const { error } = await supabase
      .from('payrolls')
      .update({
        deductions: newDeductions,
        net: newNet
      })
      .eq('id', selectedUser.id);

    if (error) {
      console.error('Error applying penalties:', error);
    } else {
      console.log(`✅ Penalties applied successfully! ₱${penaltyData.totalPenalty} added to deductions.`);
      fetchPayrolls();
      // Modal stays open - user can manually close it
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
    const netValue = grossValue - deductionsValue;

    const { error } = await supabase
      .from("payrolls")
      .update({
        gross: grossValue,
        deductions: deductionsValue,
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

  // Flatten payrolls
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
              status: "No Record",
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
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Period</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Gross Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Deductions</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Net Pay</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Action</th>
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
                            value={editData.gross || pr.gross}
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
                            value={editData.deductions || pr.deductions}
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
                        <span className="font-bold text-green-600 text-sm">
                          {editing === pr.id
                            ? `₱${(
                                (editData.gross || pr.gross) -
                                (editData.deductions || pr.deductions)
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
                        <div className="flex flex-wrap gap-1.5">
                          {pr.status === "Pending" && editing !== pr.id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditing(pr.id);
                                  // Initialize editData with current values to prevent undefined issues
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
                              <button
                                onClick={() => openPenaltyModal(pr)}
                                className="px-2.5 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Penalties
                              </button>
                            </>
                          )}
                          {editing === pr.id && (
                            <button
                              onClick={() => savePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
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
                              className="px-2.5 py-1.5 bg-green-700 text-white rounded-md hover:bg-green-800 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Finalize
                            </button>
                          ) : pr.status === "Finalized" ? (
                            <button
                              onClick={() => unfinalizePayroll(pr.id)}
                              className="px-2.5 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
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

        {/* Penalty Calculation Modal */}
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
                    <p className="text-2xl font-bold">{penaltyData.lateCount || 0}</p>
                    <p className="text-yellow-100 text-sm">₱{penaltyData.totalLatePenalty || 0} penalty</p>
                  </div>

                  {/* Absent Penalties */}
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold">Absent</h3>
                    </div>
                    <p className="text-2xl font-bold">{penaltyData.absentCount || 0}</p>
                    <p className="text-red-100 text-sm">₱{penaltyData.totalAbsentPenalty || 0} penalty</p>
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
                          <span>Late Attendance ({penaltyData.totalLateMinutes || 0} minutes × ₱1)</span>
                          <span className="font-semibold">₱{penaltyData.totalLatePenalty || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span>Absent ({penaltyData.absentCount || 0} classes × ₱240)</span>
                          <span className="font-semibold">₱{penaltyData.totalAbsentPenalty || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded font-semibold">
                          <span>Total Penalty</span>
                          <span>₱{penaltyData.totalPenalty || 0}</span>
                        </div>
                      </div>
                      
                      {/* Detailed Attendance Records */}
                      {(penaltyData.lateRecords?.length > 0 || penaltyData.absentRecords?.length > 0) && (
                        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm mb-4">
                          <p className="text-gray-800 font-medium mb-2">Attendance Details:</p>
                          
                          {penaltyData.lateRecords?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-yellow-700 font-medium text-xs mb-1">Late Classes:</p>
                              {penaltyData.lateRecords.map((record: any, index: number) => {
                                const schedule = record.schedules?.[0];
                                const timeIn = new Date(record.time_in);
                                const [startHour, startMinute] = schedule?.start_time?.split(':').map(Number) || [0, 0];
                                const expectedStart = new Date(record.att_date);
                                expectedStart.setHours(startHour, startMinute, 0, 0);
                                const minutesLate = Math.max(0, Math.floor((timeIn.getTime() - expectedStart.getTime()) / (1000 * 60)));
                                
                                return (
                                  <div key={index} className="text-xs text-yellow-600 ml-2">
                                    • {record.att_date} - {schedule?.subject || 'Unknown Subject'} ({schedule?.day_of_week}) - {minutesLate} min late
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {penaltyData.absentRecords?.length > 0 && (
                            <div>
                              <p className="text-red-700 font-medium text-xs mb-1">Absent Classes:</p>
                              {penaltyData.absentRecords.map((record: any, index: number) => {
                                const schedule = record.schedules?.[0];
                                return (
                                  <div key={index} className="text-xs text-red-600 ml-2">
                                    • {record.att_date} - {schedule?.subject || 'Unknown Subject'} ({schedule?.day_of_week}) - ₱240 penalty
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Date Range Info */}
                      {penaltyData.dateRange && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                          <p className="text-blue-800 font-medium">Search Period:</p>
                          <p className="text-blue-700">{penaltyData.dateRange.startDate} to {penaltyData.dateRange.endDate}</p>
                          <p className="text-blue-600 text-xs mt-1">
                            Found {penaltyData.attendanceRecords?.length || 0} class attendance records
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPenaltyModal(false)}
                    className="px-6 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {penaltyData.totalPenalty > 0 && (
                    <button
                      onClick={applyPenalties}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      Manually Apply Penalties (₱{penaltyData.totalPenalty})
                    </button>
                  )}
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

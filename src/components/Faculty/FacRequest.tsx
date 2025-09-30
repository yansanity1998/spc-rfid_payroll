import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';

export const FacRequest = () => {
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<'gatepass' | 'loan' | 'leave' | null>(null);
  const [userName, setUserName] = useState('');
  
  // Form states
  const [gatePassForm, setGatePassForm] = useState({
    purpose: "",
    destination: "",
    time_out: "",
    time_in: ""
  });
  
  const [loanForm, setLoanForm] = useState({
    amount: "",
    reason: "",
    date_needed: "",
    repayment_terms: "",
    period_deduction: "",
    total_periods: ""
  });

  // Auto-calculate period deduction when amount or total periods change
  const handleLoanFormChange = (field: string, value: string) => {
    const updatedForm = { ...loanForm, [field]: value };
    
    // Auto-calculate period_deduction if both amount and total_periods are provided
    if (field === 'amount' || field === 'total_periods') {
      const amount = parseFloat(field === 'amount' ? value : loanForm.amount);
      const periods = parseInt(field === 'total_periods' ? value : loanForm.total_periods);
      
      if (!isNaN(amount) && !isNaN(periods) && amount > 0 && periods > 0) {
        const periodDeduction = (amount / periods).toFixed(2);
        updatedForm.period_deduction = periodDeduction;
      }
    }
    
    setLoanForm(updatedForm);
  };
  
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    substitute_teacher: "",
    contact_number: ""
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user data first
      const { data: userData } = await supabase
        .from("users")
        .select("id, name")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        setUserName(userData.name || '');
        
        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false });

        if (!error) {
          setAllRequests(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitGatePassRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id, positions, role")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        // Check if user needs dean approval
        const needsDeanApproval = userData.role === 'Faculty' && 
          ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions);

        const requestData = {
          user_id: userData.id,
          request_type: "Gate Pass",
          name: userName,
          time_out: gatePassForm.time_out ? new Date(gatePassForm.time_out).toISOString() : null,
          time_in: gatePassForm.time_in ? new Date(gatePassForm.time_in).toISOString() : null,
          purpose: gatePassForm.purpose,
          destination: gatePassForm.destination,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions,
          approved_by: needsDeanApproval ? null : "ROY AURELIO BACOMO"
        };

        console.log('[FacRequest] Submitting Gate Pass request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          if (needsDeanApproval) {
            toast.success("Gate Pass request submitted for Dean approval!");
          } else {
            toast.success("Gate Pass request submitted successfully!");
          }
          setActiveForm(null);
          setGatePassForm({ purpose: "", destination: "", time_out: "", time_in: "" });
          fetchRequests();
        } else {
          console.error('[FacRequest] Error submitting request:', error);
          toast.error("Error submitting request: " + error.message);
        }
      }
    } catch (error) {
      console.error("Error submitting gate pass request:", error);
      toast.error("Error submitting request");
    }
  };

  const submitLoanRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id, positions, role")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        // Check if user needs dean approval
        const needsDeanApproval = userData.role === 'Faculty' && 
          ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions);

        const requestData = {
          user_id: userData.id,
          request_type: "Loan",
          name: userName,
          amount: parseFloat(loanForm.amount),
          reason: loanForm.reason,
          date_needed: loanForm.date_needed,
          repayment_terms: loanForm.repayment_terms,
          period_deduction: loanForm.period_deduction ? parseFloat(loanForm.period_deduction) : null,
          total_periods: loanForm.total_periods ? parseInt(loanForm.total_periods) : null,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions,
          approved_by: needsDeanApproval ? null : "ROY AURELIO BACOMO"
        };

        console.log('[FacRequest] Submitting Loan request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          if (needsDeanApproval) {
            toast.success("Loan request submitted for Dean approval!");
          } else {
            toast.success("Loan request submitted successfully!");
          }
          setActiveForm(null);
          setLoanForm({ amount: "", reason: "", date_needed: "", repayment_terms: "", period_deduction: "", total_periods: "" });
          fetchRequests();
        } else {
          console.error('[FacRequest] Error submitting loan request:', error);
          toast.error("Error submitting request: " + error.message);
        }
      }
    } catch (error) {
      console.error("Error submitting loan request:", error);
      toast.error("Error submitting request");
    }
  };

  const submitLeaveRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id, positions, role")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        // Check if user needs dean approval
        const needsDeanApproval = userData.role === 'Faculty' && 
          ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions);

        const startDate = new Date(leaveForm.start_date);
        const endDate = new Date(leaveForm.end_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const requestData = {
          user_id: userData.id,
          request_type: "Leave",
          name: userName,
          leave_type: leaveForm.leave_type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          total_days: totalDays,
          reason: leaveForm.reason,
          substitute_teacher: leaveForm.substitute_teacher,
          contact_number: leaveForm.contact_number,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions,
          approved_by: needsDeanApproval ? null : "ROY AURELIO BACOMO"
        };

        console.log('[FacRequest] Submitting Leave request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          if (needsDeanApproval) {
            toast.success("Leave request submitted for Dean approval!");
          } else {
            toast.success("Leave request submitted successfully!");
          }
          setActiveForm(null);
          setLeaveForm({ leave_type: "", start_date: "", end_date: "", reason: "", substitute_teacher: "", contact_number: "" });
          fetchRequests();
        } else {
          console.error('[FacRequest] Error submitting leave request:', error);
          toast.error("Error submitting request: " + error.message);
        }
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Error submitting request");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = allRequests.filter((r: any) => r.status === "Pending").length;
  const approvedRequests = allRequests.filter((r: any) => r.status === "Approved").length;
  const rejectedRequests = allRequests.filter((r: any) => r.status === "Rejected").length;

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium text-lg">Loading requests...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Faculty Requests</h1>
                  <p className="text-gray-600">Submit gate pass, loan, and leave requests</p>
                </div>
              </div>
            </div>
          </div>

          {/* Request Type Cards */}
          {!activeForm && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Gate Pass Card */}
              <div 
                onClick={() => setActiveForm('gatepass')}
                className="group cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Gate Pass</h3>
                  <p className="text-blue-100 text-sm">Request permission to leave campus</p>
                </div>
              </div>

              {/* Loan Card */}
              <div 
                onClick={() => setActiveForm('loan')}
                className="group cursor-pointer bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Loan Request</h3>
                  <p className="text-green-100 text-sm">Apply for financial assistance</p>
                </div>
              </div>

              {/* Leave Card */}
              <div 
                onClick={() => setActiveForm('leave')}
                className="group cursor-pointer bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 2m8-2l2 2m-2-2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V9m8 0V9a2 2 0 00-2-2H10a2 2 0 00-2 2v0" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Leave Request</h3>
                  <p className="text-purple-100 text-sm">Apply for time off</p>
                </div>
              </div>
            </div>
          )}

          {/* Gate Pass Form */}
          {activeForm === 'gatepass' && (
            <div className="bg-white border-2 border-blue-200 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Gate Pass Request</h2>
                <button
                  onClick={() => setActiveForm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={userName}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Out</label>
                    <input
                      type="datetime-local"
                      value={gatePassForm.time_out}
                      onChange={(e) => setGatePassForm({...gatePassForm, time_out: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time In</label>
                    <input
                      type="datetime-local"
                      value={gatePassForm.time_in}
                      onChange={(e) => setGatePassForm({...gatePassForm, time_in: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={gatePassForm.destination}
                    onChange={(e) => setGatePassForm({...gatePassForm, destination: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Where are you going?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                  <textarea
                    value={gatePassForm.purpose}
                    onChange={(e) => setGatePassForm({...gatePassForm, purpose: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain the purpose of your visit"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitGatePassRequest}
                    disabled={!gatePassForm.purpose || !gatePassForm.destination}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Gate Pass
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loan Form */}
          {activeForm === 'loan' && (
            <div className="bg-white border-2 border-green-200 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Loan Request</h2>
                <button
                  onClick={() => setActiveForm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount (₱)</label>
                  <input
                    type="number"
                    value={loanForm.amount}
                    onChange={(e) => handleLoanFormChange('amount', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter loan amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Needed</label>
                  <input
                    type="date"
                    value={loanForm.date_needed}
                    onChange={(e) => setLoanForm({...loanForm, date_needed: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea
                    value={loanForm.reason}
                    onChange={(e) => setLoanForm({...loanForm, reason: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Explain why you need this loan"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Per Period Deduction (₱)</label>
                    <input
                      type="number"
                      value={loanForm.period_deduction}
                      onChange={(e) => handleLoanFormChange('period_deduction', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">Automatically calculated: Loan Amount ÷ Total Periods</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Periods (15 days each)</label>
                    <input
                      type="number"
                      value={loanForm.total_periods}
                      onChange={(e) => handleLoanFormChange('total_periods', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Number of 15-day periods"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Terms</label>
                  <textarea
                    value={loanForm.repayment_terms}
                    onChange={(e) => setLoanForm({...loanForm, repayment_terms: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Additional repayment terms or conditions"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLoanRequest}
                    disabled={!loanForm.amount || !loanForm.reason || !loanForm.date_needed}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Loan Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leave Form */}
          {activeForm === 'leave' && (
            <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Leave Request</h2>
                <button
                  onClick={() => setActiveForm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select leave type</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Vacation Leave">Vacation Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
                    <option value="Bereavement Leave">Bereavement Leave</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Explain the reason for your leave"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Substitute Teacher</label>
                  <input
                    type="text"
                    value={leaveForm.substitute_teacher}
                    onChange={(e) => setLeaveForm({...leaveForm, substitute_teacher: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Name of substitute teacher"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={leaveForm.contact_number}
                    onChange={(e) => setLeaveForm({...leaveForm, contact_number: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Your contact number during leave"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLeaveRequest}
                    disabled={!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {!activeForm && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Pending</h2>
                  </div>
                  <p className="text-3xl font-bold">{pendingRequests}</p>
                  <p className="text-yellow-100 text-sm mt-1">Awaiting approval</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Approved</h2>
                  </div>
                  <p className="text-3xl font-bold">{approvedRequests}</p>
                  <p className="text-green-100 text-sm mt-1">Successfully approved</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold">Rejected</h2>
                  </div>
                  <p className="text-3xl font-bold">{rejectedRequests}</p>
                  <p className="text-red-100 text-sm mt-1">Not approved</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Requests Table */}
          {!activeForm && (
            <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Request History</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Type</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Details</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRequests.length > 0 ? (
                      allRequests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-white/80 transition-all duration-200">
                          <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                            <span className="font-semibold text-gray-800">{request.request_type}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                            {request.request_type === 'Gate Pass' && (
                              <div>
                                <div>Destination: {request.destination || 'N/A'}</div>
                                <div>Purpose: {request.purpose || 'N/A'}</div>
                              </div>
                            )}
                            {request.request_type === 'Loan' && (
                              <div>
                                <div>Amount: ₱{request.amount ? request.amount.toLocaleString() : 'N/A'}</div>
                                <div>Reason: {request.reason || 'N/A'}</div>
                              </div>
                            )}
                            {request.request_type === 'Leave' && (
                              <div>
                                <div>Type: {request.leave_type || 'N/A'}</div>
                                <div>Duration: {request.start_date} to {request.end_date}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <h3 className="text-lg font-semibold text-gray-800 mb-1">No Requests Found</h3>
                              <p className="text-gray-500">You haven't submitted any requests yet.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

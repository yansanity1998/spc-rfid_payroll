import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

export const SARequest = () => {
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<'gatepass' | 'loan' | 'leave' | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exemptedSchedules, setExemptedSchedules] = useState<any[]>([]);
  
  // Form states
  const [gatePassForm, setGatePassForm] = useState({
    purpose: "",
    destination: "",
    time_out: "",
    time_in: "",
    attachment: null as File | null
  });
  
  const [loanForm, setLoanForm] = useState({
    amount: "",
    reason: "",
    date_needed: "",
    repayment_terms: "",
    period_deduction: "",
    total_periods: "",
    attachment: null as File | null
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
    contact_number: "",
    attachment: null as File | null
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

  const fetchExemptedSchedules = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("exempted_schedules_view")
        .select("*")
        .eq("user_id", userId)
        .gte("exemption_date", new Date().toISOString().split('T')[0]) // Only future/current exemptions
        .order("exemption_date", { ascending: true });

      if (!error) {
        setExemptedSchedules(data || []);
        console.log('[SARequest] Exempted schedules:', data);
      }
    } catch (error) {
      console.error("Error fetching exempted schedules:", error);
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

        // Fetch exempted schedules
        await fetchExemptedSchedules(userData.id);
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
        // SA users need dean approval (same as Faculty)
        const needsDeanApproval = userData.role === 'SA';

        // Handle attachment upload if file is provided
        let attachmentUrl = null;
        if (gatePassForm.attachment) {
          try {
            const fileExt = gatePassForm.attachment.name.split('.').pop();
            const fileName = `${userData.id}_gatepass_${Date.now()}.${fileExt}`;
            const filePath = `request_attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, gatePassForm.attachment);

            if (uploadError) {
              console.error('[SARequest] Gate Pass attachment upload error:', uploadError);
              throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath);

            attachmentUrl = publicUrl;
            console.log('[SARequest] Gate Pass attachment uploaded successfully:', attachmentUrl);
          } catch (error: any) {
            console.error('[SARequest] Error uploading gate pass attachment:', error);
            await Swal.fire({
              title: 'Upload Error!',
              text: `Failed to upload attachment: ${error.message}`,
              icon: 'error',
              confirmButtonColor: '#ca8a04',
              confirmButtonText: 'OK'
            });
            return;
          }
        }

        const requestData = {
          user_id: userData.id,
          request_type: "Gate Pass",
          name: userName,
          time_out: gatePassForm.time_out ? new Date(gatePassForm.time_out).toISOString() : null,
          time_in: gatePassForm.time_in ? new Date(gatePassForm.time_in).toISOString() : null,
          purpose: gatePassForm.purpose,
          destination: gatePassForm.destination,
          attachment: attachmentUrl,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions
        };

        console.log('[SARequest] Submitting Gate Pass request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          setActiveForm(null);
          setGatePassForm({ purpose: "", destination: "", time_out: "", time_in: "", attachment: null });
          fetchRequests();
          
          await Swal.fire({
            title: 'Success!',
            text: needsDeanApproval 
              ? 'Gate Pass request submitted for Dean approval!' 
              : 'Gate Pass request submitted successfully!',
            icon: 'success',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
        } else {
          console.error('[SARequest] Error submitting request:', error);
          await Swal.fire({
            title: 'Error!',
            text: `Failed to submit request: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
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
        // SA users need dean approval (same as Faculty)
        const needsDeanApproval = userData.role === 'SA';

        // Handle attachment upload if file is provided
        let attachmentUrl = null;
        if (loanForm.attachment) {
          try {
            const fileExt = loanForm.attachment.name.split('.').pop();
            const fileName = `${userData.id}_loan_${Date.now()}.${fileExt}`;
            const filePath = `request_attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, loanForm.attachment);

            if (uploadError) {
              console.error('[SARequest] Loan attachment upload error:', uploadError);
              throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath);

            attachmentUrl = publicUrl;
            console.log('[SARequest] Loan attachment uploaded successfully:', attachmentUrl);
          } catch (error: any) {
            console.error('[SARequest] Error uploading loan attachment:', error);
            await Swal.fire({
              title: 'Upload Error!',
              text: `Failed to upload attachment: ${error.message}`,
              icon: 'error',
              confirmButtonColor: '#ca8a04',
              confirmButtonText: 'OK'
            });
            return;
          }
        }

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
          attachment: attachmentUrl,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions
        };

        console.log('[SARequest] Submitting Loan request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          setActiveForm(null);
          setLoanForm({ amount: "", reason: "", date_needed: "", repayment_terms: "", period_deduction: "", total_periods: "", attachment: null });
          fetchRequests();
          
          await Swal.fire({
            title: 'Success!',
            text: needsDeanApproval 
              ? 'Loan request submitted for Dean approval!' 
              : 'Loan request submitted successfully!',
            icon: 'success',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
        } else {
          console.error('[SARequest] Error submitting loan request:', error);
          await Swal.fire({
            title: 'Error!',
            text: `Failed to submit request: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
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
        // SA users need dean approval (same as Faculty)
        const needsDeanApproval = userData.role === 'SA';

        const startDate = new Date(leaveForm.start_date);
        const endDate = new Date(leaveForm.end_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Handle attachment upload if file is provided
        let attachmentUrl = null;
        if (leaveForm.attachment) {
          try {
            const fileExt = leaveForm.attachment.name.split('.').pop();
            const fileName = `${userData.id}_substitution_form_${Date.now()}.${fileExt}`;
            const filePath = `request_attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, leaveForm.attachment);

            if (uploadError) {
              console.error('[SARequest] Attachment upload error:', uploadError);
              throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(filePath);

            attachmentUrl = publicUrl;
            console.log('[SARequest] Attachment uploaded successfully:', attachmentUrl);
          } catch (error: any) {
            console.error('[SARequest] Error uploading attachment:', error);
            await Swal.fire({
              title: 'Upload Error!',
              text: `Failed to upload attachment: ${error.message}`,
              icon: 'error',
              confirmButtonColor: '#ca8a04',
              confirmButtonText: 'OK'
            });
            return;
          }
        }

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
          attachment: attachmentUrl,
          status: needsDeanApproval ? "Pending Dean Approval" : "Pending",
          dean_approval_required: needsDeanApproval,
          requester_position: userData.positions
        };

        console.log('[SARequest] Submitting Leave request:', requestData);

        const { error } = await supabase
          .from("requests")
          .insert([requestData]);

        if (!error) {
          setActiveForm(null);
          setLeaveForm({ leave_type: "", start_date: "", end_date: "", reason: "", substitute_teacher: "", contact_number: "", attachment: null });
          fetchRequests();
          
          await Swal.fire({
            title: 'Success!',
            text: needsDeanApproval 
              ? 'Leave request submitted for Dean approval!' 
              : 'Leave request submitted successfully!',
            icon: 'success',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
        } else {
          console.error('[SARequest] Error submitting leave request:', error);
          await Swal.fire({
            title: 'Error!',
            text: `Failed to submit request: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
        }
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Error submitting request");
    }
  };

  const deleteRequest = async (requestId: number, requestType: string) => {
    const result = await Swal.fire({
      title: 'Delete Request?',
      html: `Are you sure you want to delete this <strong>${requestType}</strong> request?<br/><br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ca8a04',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("requests")
          .delete()
          .eq("id", requestId);

        if (error) {
          console.error('[SARequest] Error deleting request:', error);
          await Swal.fire({
            title: 'Error!',
            text: `Failed to delete request: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
        } else {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Request has been deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#ca8a04',
            confirmButtonText: 'OK'
          });
          fetchRequests();
        }
      } catch (error) {
        console.error('[SARequest] Error deleting request:', error);
        await Swal.fire({
          title: 'Error!',
          text: 'An error occurred while deleting the request.',
          icon: 'error',
          confirmButtonColor: '#ca8a04',
          confirmButtonText: 'OK'
        });
      }
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
              <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">SA Requests</h1>
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
                className="group cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">Gate Pass</h3>
                  <p className="text-blue-100 text-sm">Request permission to leave campus</p>
                </div>
              </div>

              {/* Loan Card */}
              <div 
                onClick={() => setActiveForm('loan')}
                className="group cursor-pointer bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">Cash Advance Request</h3>
                  <p className="text-green-100 text-sm">Apply for financial assistance</p>
                </div>
              </div>

              {/* Leave Card */}
              <div 
                onClick={() => setActiveForm('leave')}
                className="group cursor-pointer bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 transform"
              >
                <div className="text-white text-center">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 2m8-2l2 2m-2-2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V9m8 0V9a2 2 0 00-2-2H10a2 2 0 00-2 2v0" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-1.5">Leave Request</h3>
                  <p className="text-purple-100 text-sm">Apply for time off</p>
                </div>
              </div>
            </div>
          )}

          {/* Gate Pass Modal */}
          {activeForm === 'gatepass' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white">Gate Pass Request</h2>
                    </div>
                    <button
                      onClick={() => setActiveForm(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={userName}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Time Out</label>
                      <input
                        type="datetime-local"
                        value={gatePassForm.time_out}
                        onChange={(e) => setGatePassForm({...gatePassForm, time_out: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Time In</label>
                      <input
                        type="datetime-local"
                        value={gatePassForm.time_in}
                        onChange={(e) => setGatePassForm({...gatePassForm, time_in: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination</label>
                    <input
                      type="text"
                      value={gatePassForm.destination}
                      onChange={(e) => setGatePassForm({...gatePassForm, destination: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Where are you going?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Purpose</label>
                    <textarea
                      value={gatePassForm.purpose}
                      onChange={(e) => setGatePassForm({...gatePassForm, purpose: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Explain the purpose of your visit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Supporting Document (Attachment)</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File size must be less than 10MB');
                              return;
                            }
                            setGatePassForm({...gatePassForm, attachment: file});
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {gatePassForm.attachment && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-blue-800 font-medium flex-1">{gatePassForm.attachment.name}</span>
                          <button
                            onClick={() => setGatePassForm({...gatePassForm, attachment: null})}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Upload supporting document (PDF, DOC, DOCX, JPG, PNG - Max 10MB)</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitGatePassRequest}
                    disabled={!gatePassForm.purpose || !gatePassForm.destination}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loan Modal */}
          {activeForm === 'loan' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white">Cash Advance Request</h2>
                    </div>
                    <button
                      onClick={() => setActiveForm(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cash Advance Amount (₱)</label>
                    <input
                      type="number"
                      value={loanForm.amount}
                      onChange={(e) => handleLoanFormChange('amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Enter cash advance amount"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Needed</label>
                    <input
                      type="date"
                      value={loanForm.date_needed}
                      onChange={(e) => setLoanForm({...loanForm, date_needed: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                    <textarea
                      value={loanForm.reason}
                      onChange={(e) => setLoanForm({...loanForm, reason: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Explain why you need this cash advance"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Per Period Deduction (₱)</label>
                      <input
                        type="number"
                        value={loanForm.period_deduction}
                        onChange={(e) => handleLoanFormChange('period_deduction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 text-sm"
                        placeholder="Auto-calculated"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto: Amount ÷ Periods</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Periods (15 days each)</label>
                      <input
                        type="number"
                        value={loanForm.total_periods}
                        onChange={(e) => handleLoanFormChange('total_periods', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        placeholder="Number of periods"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Repayment Terms</label>
                    <textarea
                      value={loanForm.repayment_terms}
                      onChange={(e) => setLoanForm({...loanForm, repayment_terms: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Additional repayment terms or conditions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Supporting Document (Attachment)</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File size must be less than 10MB');
                              return;
                            }
                            setLoanForm({...loanForm, attachment: file});
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      {loanForm.attachment && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-green-800 font-medium flex-1">{loanForm.attachment.name}</span>
                          <button
                            onClick={() => setLoanForm({...loanForm, attachment: null})}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Upload supporting document (PDF, DOC, DOCX, JPG, PNG - Max 10MB)</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLoanRequest}
                    disabled={!loanForm.amount || !loanForm.reason || !loanForm.date_needed}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leave Modal */}
          {activeForm === 'leave' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 2m8-2l2 2m-2-2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V9m8 0V9a2 2 0 00-2-2H10a2 2 0 00-2 2v0" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white">Leave Request</h2>
                    </div>
                    <button
                      onClick={() => setActiveForm(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
                    <select
                      value={leaveForm.leave_type}
                      onChange={(e) => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    >
                      <option value="">Select leave type</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Vacation Leave">Vacation Leave</option>
                      <option value="Emergency Leave">Emergency Leave</option>
                      <option value="Maternity Leave">Maternity Leave</option>
                      <option value="Paternity Leave">Paternity Leave</option>
                      <option value="Bereavement Leave">Bereavement Leave</option>
                      <option value="Incentive Leave">Incentive Leave</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={leaveForm.start_date}
                        onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={leaveForm.end_date}
                        onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                    <textarea
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      placeholder="Explain the reason for your leave"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Substitute Teacher</label>
                    <input
                      type="text"
                      value={leaveForm.substitute_teacher}
                      onChange={(e) => setLeaveForm({...leaveForm, substitute_teacher: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      placeholder="Name of substitute teacher"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                    <input
                      type="tel"
                      value={leaveForm.contact_number}
                      onChange={(e) => setLeaveForm({...leaveForm, contact_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      placeholder="Your contact number during leave"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Substitution Form (Attachment)</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File size must be less than 10MB');
                              return;
                            }
                            setLeaveForm({...leaveForm, attachment: file});
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                      {leaveForm.attachment && (
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-purple-800 font-medium flex-1">{leaveForm.attachment.name}</span>
                          <button
                            onClick={() => setLeaveForm({...leaveForm, attachment: null})}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Upload substitution form (PDF, DOC, DOCX, JPG, PNG - Max 10MB)</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
                  <button
                    onClick={() => setActiveForm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLeaveRequest}
                    disabled={!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {!activeForm && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pending Card */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-white">
                      <h2 className="text-base font-semibold">Pending</h2>
                      <p className="text-yellow-100 text-xs">Awaiting approval</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{pendingRequests}</p>
                </div>
              </div>

              {/* Approved Card */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-white">
                      <h2 className="text-base font-semibold">Approved</h2>
                      <p className="text-green-100 text-xs">Successfully approved</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{approvedRequests}</p>
                </div>
              </div>

              {/* Rejected Card */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="text-white">
                      <h2 className="text-base font-semibold">Rejected</h2>
                      <p className="text-red-100 text-xs">Not approved</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{rejectedRequests}</p>
                </div>
              </div>
            </div>
          )}

          {/* Exempted Schedules Section */}
          {!activeForm && exemptedSchedules.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Schedule Exemptions</h2>
                    <p className="text-gray-600 text-sm">Your approved requests have exempted these schedules</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exemptedSchedules.map((exemption: any) => (
                    <div key={exemption.id} className="bg-white rounded-xl p-4 shadow-md border border-blue-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          exemption.request_type === 'Gate Pass' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {exemption.request_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(exemption.exemption_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {exemption.subject && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Subject:</span>
                            <span className="text-sm text-gray-600 ml-2">{exemption.subject}</span>
                          </div>
                        )}
                        
                        {exemption.room && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Room:</span>
                            <span className="text-sm text-gray-600 ml-2">{exemption.room}</span>
                          </div>
                        )}
                        
                        {exemption.start_time && exemption.end_time ? (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Time:</span>
                            <span className="text-sm text-gray-600 ml-2">
                              {exemption.start_time} - {exemption.end_time}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Duration:</span>
                            <span className="text-sm text-gray-600 ml-2">Full Day</span>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-sm font-medium text-gray-700">Reason:</span>
                          <span className="text-sm text-gray-600 ml-2">{exemption.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Requests Table */}
          {!activeForm && (
            <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Request History</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-yellow-600 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Type</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Details</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Submitted</th>
                      <th className="px-3 sm:px-4 py-3 text-center border-b font-medium">Actions</th>
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
                          <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailsModal(true);
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                              >
                                View
                              </button>
                              <button
                                onClick={() => deleteRequest(request.id, request.request_type)}
                                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
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

        {/* Modern Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className={`sticky top-0 z-10 px-8 py-6 border-b border-gray-200 ${
                selectedRequest.request_type === 'Gate Pass' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                selectedRequest.request_type === 'Loan' ? 'bg-gradient-to-r from-green-600 to-green-700' :
                'bg-gradient-to-r from-purple-600 to-purple-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                      {selectedRequest.request_type === 'Gate Pass' && (
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                      {selectedRequest.request_type === 'Loan' && (
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      )}
                      {selectedRequest.request_type === 'Leave' && (
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 2m8-2l2 2m-2-2v12a2 2 0 01-2 2H10a2 2 0 01-2-2V9m8 0V9a2 2 0 00-2-2H10a2 2 0 00-2 2v0" />
                        </svg>
                      )}
                    </div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold">{selectedRequest.request_type} Request</h2>
                      <p className="text-white/90 text-sm mt-1">Request ID: #{selectedRequest.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedRequest(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Status</p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Submitted On</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(selectedRequest.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedRequest.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                {/* Requester Information */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Requester Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Name</p>
                      <p className="text-base font-semibold text-gray-800">{selectedRequest.name || 'N/A'}</p>
                    </div>
                    {selectedRequest.requester_position && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Position</p>
                        <p className="text-base font-semibold text-gray-800">{selectedRequest.requester_position}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.attachment && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-300 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828M6.343 17.657a4 4 0 005.657 0L20 9.657a4 4 0 00-5.657-5.657L7.05 11.293" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Attachment</p>
                        <p className="text-xs text-gray-500">Click the button to view the uploaded document.</p>
                      </div>
                    </div>
                    <a
                      href={selectedRequest.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-md transition-all duration-200"
                    >
                      View attachment
                    </a>
                  </div>
                )}

                {/* Gate Pass Details */}
                {selectedRequest.request_type === 'Gate Pass' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Gate Pass Details
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Destination</p>
                          <p className="text-base font-semibold text-gray-800">{selectedRequest.destination || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Purpose</p>
                          <p className="text-base text-gray-800">{selectedRequest.purpose || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Time Out</p>
                            <p className="text-base font-semibold text-gray-800">
                              {selectedRequest.time_out ? new Date(selectedRequest.time_out).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Time In</p>
                            <p className="text-base font-semibold text-gray-800">
                              {selectedRequest.time_in ? new Date(selectedRequest.time_in).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Details */}
                {selectedRequest.request_type === 'Loan' && (
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Loan Details
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Loan Amount</p>
                            <p className="text-2xl font-bold text-green-600">
                              ₱{selectedRequest.amount ? selectedRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Date Needed</p>
                            <p className="text-base font-semibold text-gray-800">
                              {selectedRequest.date_needed ? new Date(selectedRequest.date_needed).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Reason</p>
                          <p className="text-base text-gray-800">{selectedRequest.reason || 'N/A'}</p>
                        </div>
                        {(selectedRequest.period_deduction || selectedRequest.total_periods) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-green-200">
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 mb-1">Per Period Deduction</p>
                              <p className="text-lg font-semibold text-gray-800">
                                ₱{selectedRequest.period_deduction ? selectedRequest.period_deduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                              </p>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 mb-1">Total Periods</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {selectedRequest.total_periods || 'N/A'} periods (15 days each)
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedRequest.repayment_terms && (
                          <div className="pt-2">
                            <p className="text-sm text-gray-600 mb-1">Repayment Terms</p>
                            <p className="text-base text-gray-800">{selectedRequest.repayment_terms}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave Details */}
                {selectedRequest.request_type === 'Leave' && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Leave Details
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Leave Type</p>
                            <p className="text-base font-semibold text-purple-600">{selectedRequest.leave_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Days</p>
                            <p className="text-2xl font-bold text-purple-600">{selectedRequest.total_days || 0} days</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Start Date</p>
                            <p className="text-base font-semibold text-gray-800">
                              {selectedRequest.start_date ? new Date(selectedRequest.start_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">End Date</p>
                            <p className="text-base font-semibold text-gray-800">
                              {selectedRequest.end_date ? new Date(selectedRequest.end_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Reason</p>
                          <p className="text-base text-gray-800">{selectedRequest.reason || 'N/A'}</p>
                        </div>
                        {selectedRequest.substitute_teacher && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Substitute Teacher</p>
                            <p className="text-base font-semibold text-gray-800">{selectedRequest.substitute_teacher}</p>
                          </div>
                        )}
                        {selectedRequest.contact_number && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Contact Number</p>
                            <p className="text-base font-semibold text-gray-800">{selectedRequest.contact_number}</p>
                          </div>
                        )}
                        {selectedRequest.attachment && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Substitution Form</p>
                            <a
                              href={selectedRequest.attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-sm font-medium">View Attachment</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval Information */}
                {(selectedRequest.approved_by || selectedRequest.dean_approval_required || selectedRequest.dean_approved_by || selectedRequest.rejection_reason) && (
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approval Information
                    </h3>
                    <div className="space-y-4">
                      {selectedRequest.dean_approval_required && (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg">
                            Dean Approval Required
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedRequest.approved_by && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Approved By</p>
                            <p className="text-base font-semibold text-gray-800">{selectedRequest.approved_by}</p>
                          </div>
                        )}
                        {selectedRequest.dean_approved_by && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Dean Approved By</p>
                            <p className="text-base font-semibold text-gray-800">{selectedRequest.dean_approved_by}</p>
                          </div>
                        )}
                      </div>
                      {selectedRequest.rejection_reason && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Rejection Reason</p>
                          <p className="text-base text-red-600 font-medium">{selectedRequest.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 px-8 py-6 border-t border-gray-200 rounded-b-3xl">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SARequest;

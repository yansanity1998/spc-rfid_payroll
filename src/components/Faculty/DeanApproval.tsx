import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';

interface DeanApprovalRequest {
  approval_id: number;
  request_id: number;
  requester_name: string;
  requester_position: string;
  requester_email: string;
  requester_profile_picture?: string;
  request_type: string;
  leave_type?: string;
  purpose: string;
  destination: string;
  time_out: string;
  time_in: string;
  reason: string;
  date_needed: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  amount?: number;
  repayment_terms?: string;
  monthly_deduction?: number;
  total_months?: number;
  status: string;
  created_at: string;
}

export const DeanApproval = () => {
  const [pendingRequests, setPendingRequests] = useState<DeanApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DeanApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deanNotes, setDeanNotes] = useState('');
  const [actionType, setActionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkDeanAuthorization();
    fetchPendingRequests();
  }, []);

  const checkDeanAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login first');
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("id, name, positions, role")
        .eq("auth_id", user.id)
        .single();

      if (error || !userData) {
        toast.error('User not found');
        return;
      }

      if (userData.role !== 'Faculty' || userData.positions !== 'Dean') {
        toast.error('Access denied. Only Faculty with Dean position can access this page.');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      console.error('Authorization error:', error);
      toast.error('Authorization failed');
    }
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      console.log('[DeanApproval] Starting to fetch pending requests...');
      
      // Step 1: Get all Gate Pass, Leave, and Loan requests
      const { data: allRequests, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .in('request_type', ['Gate Pass', 'Leave', 'Loan']);

      console.log('[DeanApproval] All Gate Pass, Leave, and Loan requests:', { allRequests, requestError });

      if (requestError) {
        console.error('[DeanApproval] Error fetching requests:', requestError);
        toast.error('Failed to fetch requests: ' + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        console.log('[DeanApproval] No Gate Pass, Leave, or Loan requests found at all');
        setPendingRequests([]);
        return;
      }

      // Step 2: Get user details for each request
      const requestsWithUsers = [];
      for (const request of allRequests) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
          .eq('id', request.user_id)
          .single();

        if (!userError && userData) {
          console.log(`[DeanApproval] User data for request ${request.id}:`, userData);
          
          // Check if this is a faculty member who needs dean approval
          if (userData.role === 'Faculty' && 
              ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions)) {
            
            // Check if request is pending
            if (request.status === 'Pending' || request.status === 'Pending Dean Approval') {
              requestsWithUsers.push({
                approval_id: request.id,
                request_id: request.id,
                requester_name: userData.name,
                requester_position: userData.positions,
                requester_email: userData.email,
                requester_profile_picture: userData.profile_picture,
                request_type: request.request_type || 'Unknown',
                leave_type: request.leave_type || '',
                purpose: request.purpose || '',
                destination: request.destination || '',
                time_out: request.time_out || '',
                time_in: request.time_in || '',
                reason: request.reason || '',
                date_needed: request.date_needed || '',
                start_date: request.start_date || '',
                end_date: request.end_date || '',
                duration: request.duration || '',
                amount: request.amount || 0,
                repayment_terms: request.repayment_terms || '',
                monthly_deduction: request.monthly_deduction || 0,
                total_months: request.total_months || 0,
                status: 'Pending',
                created_at: request.created_at
              });
            } else {
              console.log(`[DeanApproval] Request ${request.id} status is '${request.status}', not pending`);
            }
          } else {
            console.log(`[DeanApproval] User ${userData.name} (${userData.role}, ${userData.positions}) does not need dean approval`);
          }
        } else {
          console.error(`[DeanApproval] Error fetching user for request ${request.id}:`, userError);
        }
      }

      console.log('[DeanApproval] Final pending requests for dean approval:', requestsWithUsers);
      setPendingRequests(requestsWithUsers);

      // Also try to fetch from dean_approvals table if it exists
      try {
        const { data: approvals, error: approvalError } = await supabase
          .from('dean_approvals')
          .select('*')
          .eq('status', 'Pending')
          .order('created_at', { ascending: true });

        if (!approvalError && approvals && approvals.length > 0) {
          console.log('[DeanApproval] Found dean_approvals records, using those instead:', approvals);
          setPendingRequests(approvals);
        }
      } catch (approvalErr) {
        console.log('[DeanApproval] dean_approvals table does not exist yet, using requests table data');
      }

    } catch (error) {
      console.error('[DeanApproval] Error fetching pending requests:', error);
      toast.error('Failed to fetch pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (request: DeanApprovalRequest, action: 'Approved' | 'Rejected') => {
    setSelectedRequest(request);
    setActionType(action);
    setDeanNotes('');
    setShowModal(true);
  };

  const processApproval = async () => {
    if (!selectedRequest || !currentUser) return;

    setProcessingId(selectedRequest.approval_id);
    try {
      // Try using the stored procedure first
      const { error: procError } = await supabase
        .rpc('process_dean_approval', {
          approval_id: selectedRequest.approval_id,
          dean_user_id: currentUser.id,
          approval_status: actionType,
          dean_notes_text: deanNotes || null
        });

      if (procError) {
        console.error('Stored procedure error:', procError);
        
        // Fallback: Direct table updates
        // Update dean_approvals table if it exists
        await supabase
          .from('dean_approvals')
          .update({
            status: actionType,
            approved_by: currentUser.id,
            approved_date: new Date().toISOString(),
            dean_notes: deanNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequest.approval_id);

        // Update original requests table
        const { error: requestError } = await supabase
          .from('requests')
          .update({
            status: actionType,
            approved_by: currentUser.id,
            approved_date: new Date().toISOString(),
            admin_notes: deanNotes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequest.request_id);

        if (requestError) {
          throw requestError;
        }
      }

      toast.success(`Request ${actionType.toLowerCase()} successfully!`);
      setShowModal(false);
      setSelectedRequest(null);
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(`Failed to ${actionType.toLowerCase()} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (!currentUser) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Access Denied</div>
          <div className="text-gray-600">Only Faculty with Dean position can access this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dean Approval Center</h1>
                  <p className="text-gray-600">Review and approve gate pass, leave, and loan requests from faculty members</p>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Stats Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Pending Approvals</h2>
                    <p className="text-red-100 text-sm">Gate pass, leave, and loan requests awaiting your approval</p>
                  </div>
                </div>
                <p className="text-3xl font-bold">{pendingRequests.length}</p>
              </div>
              <button
                onClick={fetchPendingRequests}
                disabled={loading}
                className="group relative overflow-hidden bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute -top-2 -left-2 w-16 h-16 bg-white/5 rounded-full"></div>
          </div>
        </section>

        {/* Modern Requests Section */}
        {loading ? (
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
            <div className="p-12 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 font-medium text-lg">Loading pending requests...</div>
            </div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Pending Requests</h3>
                  <p className="text-gray-500">All gate pass, leave, and loan requests have been processed</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Pending Approval Requests</h2>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6 pt-0">
              {pendingRequests.map((request) => (
                <div key={request.approval_id} className="group relative overflow-hidden bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 flex flex-col h-full border border-gray-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Header with Profile Picture */}
                  <div className="relative z-10 flex items-center space-x-3 mb-3">
                    <div className="relative">
                      {request.requester_profile_picture ? (
                        <img
                          src={request.requester_profile_picture}
                          alt={request.requester_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-red-200 shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center border-2 border-red-200 shadow-md">
                          <span className="text-white font-bold text-sm">
                            {request.requester_name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-orange-400 rounded-full border border-white shadow-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate text-base">{request.requester_name}</h3>
                      <div className="flex items-center space-x-1.5 flex-wrap mt-1">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full text-xs font-medium">
                          {request.requester_position}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          request.request_type === 'Gate Pass' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                          request.request_type === 'Leave' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' :
                          request.request_type === 'Loan' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                        }`}>
                          {request.request_type}
                        </span>
                        {request.request_type === 'Leave' && request.leave_type && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
                            {request.leave_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="relative z-10 space-y-2 mb-4 flex-grow">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Purpose</span>
                      <p className="text-sm text-gray-900 mt-1 font-medium">{request.purpose || request.reason || 'Not specified'}</p>
                    </div>
                  
                    {/* Show destination and time fields only for Gate Pass requests */}
                    {request.request_type === 'Gate Pass' && (
                      <>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Destination</span>
                          <p className="text-sm text-blue-900 mt-1 font-medium">{request.destination || 'Not specified'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Time Out</span>
                            <p className="text-xs text-blue-800 mt-1 font-medium">{formatDateTime(request.time_out)}</p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Time In</span>
                            <p className="text-xs text-blue-800 mt-1 font-medium">{formatDateTime(request.time_in)}</p>
                          </div>
                        </div>
                      </>
                    )}
                  
                    {/* Show comprehensive leave information for Leave requests */}
                    {request.request_type === 'Leave' && (
                      <>
                        {request.leave_type && (
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Leave Type</span>
                            <p className="text-sm text-purple-900 mt-1 font-medium">{request.leave_type}</p>
                          </div>
                        )}
                        {(request.start_date || request.end_date) && (
                          <div className="grid grid-cols-2 gap-2">
                            {request.start_date && (
                              <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Start Date</span>
                                <p className="text-xs text-purple-800 mt-1 font-medium">{formatDateTime(request.start_date)}</p>
                              </div>
                            )}
                            {request.end_date && (
                              <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">End Date</span>
                                <p className="text-xs text-purple-800 mt-1 font-medium">{formatDateTime(request.end_date)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {request.duration && (
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Duration</span>
                            <p className="text-sm text-purple-900 mt-1 font-medium">{request.duration}</p>
                          </div>
                        )}
                        {request.date_needed && (
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Date Needed</span>
                            <p className="text-sm text-purple-900 mt-1 font-medium">{formatDateTime(request.date_needed)}</p>
                          </div>
                        )}
                      </>
                    )}
                  
                    {/* Show comprehensive loan information for Loan requests */}
                    {request.request_type === 'Loan' && (
                      <>
                        {request.amount && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Loan Amount</span>
                            <p className="text-base text-green-900 mt-1 font-bold">₱{request.amount.toLocaleString()}</p>
                          </div>
                        )}
                        {request.date_needed && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Date Needed</span>
                            <p className="text-sm text-green-900 mt-1 font-medium">{formatDateTime(request.date_needed)}</p>
                          </div>
                        )}
                        {(request.monthly_deduction || request.total_months) && (
                          <div className="grid grid-cols-2 gap-2">
                            {request.monthly_deduction && (
                              <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Monthly Deduction</span>
                                <p className="text-xs text-green-800 mt-1 font-medium">₱{request.monthly_deduction.toLocaleString()}</p>
                              </div>
                            )}
                            {request.total_months && (
                              <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Months</span>
                                <p className="text-xs text-green-800 mt-1 font-medium">{request.total_months} months</p>
                              </div>
                            )}
                          </div>
                        )}
                        {request.repayment_terms && (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Repayment Terms</span>
                            <p className="text-sm text-green-900 mt-1 font-medium">{request.repayment_terms}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modern Footer */}
                  <div className="relative z-10 flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDateTime(request.created_at)}
                    </span>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApprovalAction(request, 'Approved')}
                        disabled={processingId === request.approval_id}
                        className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                      <button
                        onClick={() => handleApprovalAction(request, 'Rejected')}
                        disabled={processingId === request.approval_id}
                        className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modern Approval Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  actionType === 'Approved' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                    : 'bg-gradient-to-br from-red-500 to-red-600'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {actionType === 'Approved' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {actionType} Request
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedRequest.request_type} from {selectedRequest.requester_name}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                Are you sure you want to <strong>{actionType.toLowerCase()}</strong> the{' '}
                <strong>{selectedRequest.request_type.toLowerCase()}</strong> request from{' '}
                <strong>{selectedRequest.requester_name}</strong>?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notes (Optional)
                </label>
                <textarea
                  value={deanNotes}
                  onChange={(e) => setDeanNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  rows={4}
                  placeholder="Add any notes or comments..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={processApproval}
                  disabled={processingId === selectedRequest.approval_id}
                  className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    actionType === 'Approved' 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  }`}
                >
                  {processingId === selectedRequest.approval_id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {actionType === 'Approved' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      Confirm {actionType}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={processingId === selectedRequest.approval_id}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

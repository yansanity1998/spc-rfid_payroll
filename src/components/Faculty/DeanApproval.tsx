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
      
      // Step 1: Get all Gate Pass and Leave requests
      const { data: allRequests, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .in('request_type', ['Gate Pass', 'Leave']);

      console.log('[DeanApproval] All Gate Pass and Leave requests:', { allRequests, requestError });

      if (requestError) {
        console.error('[DeanApproval] Error fetching requests:', requestError);
        toast.error('Failed to fetch requests: ' + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        console.log('[DeanApproval] No Gate Pass or Leave requests found at all');
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dean Approval Center</h1>
          <p className="mt-2 text-gray-600">Review and approve gate pass and leave requests from faculty members</p>
        </div>

        {/* Stats Card */}
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">{pendingRequests.length}</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
              <p className="text-sm text-gray-500">Gate pass and leave requests awaiting your approval</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={fetchPendingRequests}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-500">Loading pending requests...</div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-500">No pending requests found</div>
            <p className="text-sm text-gray-400 mt-2">All gate pass and leave requests have been processed</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <div key={request.approval_id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Header with Profile Picture */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="relative">
                    {request.requester_profile_picture ? (
                      <img
                        src={request.requester_profile_picture}
                        alt={request.requester_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-red-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center border-2 border-red-200">
                        <span className="text-white font-semibold text-lg">
                          {request.requester_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{request.requester_name}</h3>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {request.requester_position}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.request_type === 'Gate Pass' ? 'bg-blue-100 text-blue-700' :
                        request.request_type === 'Leave' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {request.request_type}
                      </span>
                      {request.request_type === 'Leave' && request.leave_type && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {request.leave_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purpose</span>
                    <p className="text-sm text-gray-900 mt-1">{request.purpose || 'Not specified'}</p>
                  </div>
                  
                  {/* Show destination and time fields only for Gate Pass requests */}
                  {request.request_type === 'Gate Pass' && (
                    <>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destination</span>
                        <p className="text-sm text-gray-900 mt-1">{request.destination || 'Not specified'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Out</span>
                          <p className="text-xs text-gray-700 mt-1">{formatDateTime(request.time_out)}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time In</span>
                          <p className="text-xs text-gray-700 mt-1">{formatDateTime(request.time_in)}</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Show comprehensive leave information for Leave requests */}
                  {request.request_type === 'Leave' && (
                    <>
                      {request.leave_type && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Leave Type</span>
                          <p className="text-sm text-gray-900 mt-1">{request.leave_type}</p>
                        </div>
                      )}
                      {(request.start_date || request.end_date) && (
                        <div className="grid grid-cols-2 gap-2">
                          {request.start_date && (
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</span>
                              <p className="text-xs text-gray-700 mt-1">{formatDateTime(request.start_date)}</p>
                            </div>
                          )}
                          {request.end_date && (
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</span>
                              <p className="text-xs text-gray-700 mt-1">{formatDateTime(request.end_date)}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {request.duration && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</span>
                          <p className="text-sm text-gray-900 mt-1">{request.duration}</p>
                        </div>
                      )}
                      {request.date_needed && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Needed</span>
                          <p className="text-sm text-gray-900 mt-1">{formatDateTime(request.date_needed)}</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {request.reason && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</span>
                      <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {formatDateTime(request.created_at)}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprovalAction(request, 'Approved')}
                      disabled={processingId === request.approval_id}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleApprovalAction(request, 'Rejected')}
                      disabled={processingId === request.approval_id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approval Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {actionType} Request
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to {actionType.toLowerCase()} the {selectedRequest.request_type.toLowerCase()} request from{' '}
                <strong>{selectedRequest.requester_name}</strong>?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={deanNotes}
                  onChange={(e) => setDeanNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Add any notes or comments..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={processApproval}
                  disabled={processingId === selectedRequest.approval_id}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${
                    actionType === 'Approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processingId === selectedRequest.approval_id ? 'Processing...' : `Confirm ${actionType}`}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={processingId === selectedRequest.approval_id}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
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

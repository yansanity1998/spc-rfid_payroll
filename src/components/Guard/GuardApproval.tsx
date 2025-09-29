import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';

interface GuardApprovalRequest {
  approval_id: number;
  request_id: number;
  requester_name: string;
  requester_position: string;
  requester_email: string;
  requester_profile_picture?: string;
  purpose: string;
  destination: string;
  time_out: string;
  time_in: string;
  reason: string;
  date_needed: string;
  status: string;
  approved_by_name?: string;
  approved_date: string;
  created_at: string;
  guard_approved?: boolean;
  guard_approved_by?: string;
  guard_approved_date?: string;
}

export const GuardApproval = () => {
  const [approvedRequests, setApprovedRequests] = useState<GuardApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    checkGuardAuthorization();
    fetchApprovedRequests();
  }, []);

  const checkGuardAuthorization = async () => {
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

      if (userData.role !== 'Guard') {
        toast.error('Access denied. Only Guard users can access this page.');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      console.error('Authorization error:', error);
      toast.error('Authorization failed');
    }
  };

  const fetchApprovedRequests = async () => {
    setLoading(true);
    try {
      console.log('[GuardApproval] Starting to fetch approved requests...');
      
      // Step 1: Get all Gate Pass requests that are approved by dean but not yet approved by guard
      const { data: allRequests, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('request_type', 'Gate Pass')
        .in('status', ['Approved', 'Guard Approved']) // Include both statuses to show all
        .order('approved_date', { ascending: false });

      console.log('[GuardApproval] All approved Gate Pass requests:', { allRequests, requestError });

      if (requestError) {
        console.error('[GuardApproval] Error fetching requests:', requestError);
        toast.error('Failed to fetch requests: ' + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        console.log('[GuardApproval] No approved Gate Pass requests found');
        setApprovedRequests([]);
        return;
      }

      // Step 2: Get user details and approver details for each request
      const requestsWithUsers = [];
      for (const request of allRequests) {
        // Get requester details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
          .eq('id', request.user_id)
          .single();

        // Get approver details
        let approverName = 'Unknown';
        if (request.approved_by) {
          const { data: approverData } = await supabase
            .from('users')
            .select('name')
            .eq('id', request.approved_by)
            .single();
          
          if (approverData) {
            approverName = approverData.name;
          }
        }

        if (!userError && userData) {
          console.log(`[GuardApproval] User data for request ${request.id}:`, userData);
          
          requestsWithUsers.push({
            approval_id: request.id,
            request_id: request.id,
            requester_name: userData.name,
            requester_position: userData.positions,
            requester_email: userData.email,
            requester_profile_picture: userData.profile_picture,
            purpose: request.purpose || '',
            destination: request.destination || '',
            time_out: request.time_out || '',
            time_in: request.time_in || '',
            reason: request.reason || '',
            date_needed: request.date_needed || '',
            status: request.status,
            approved_by_name: approverName,
            approved_date: request.approved_date,
            created_at: request.created_at,
            guard_approved: request.guard_approved || false,
            guard_approved_by: request.guard_approved_by,
            guard_approved_date: request.guard_approved_date
          });
        } else {
          console.error(`[GuardApproval] Error fetching user for request ${request.id}:`, userError);
        }
      }

      console.log('[GuardApproval] Final approved requests for guard view:', requestsWithUsers);
      setApprovedRequests(requestsWithUsers);

      // Also try to fetch from dean_approvals table if it exists
      try {
        const { data: approvals, error: approvalError } = await supabase
          .from('dean_approvals')
          .select(`
            *,
            users!dean_approvals_approved_by_fkey(name)
          `)
          .eq('status', 'Approved')
          .order('approved_date', { ascending: false });

        if (!approvalError && approvals && approvals.length > 0) {
          console.log('[GuardApproval] Found dean_approvals records, using those instead:', approvals);
          
          const transformedApprovals = approvals.map(approval => ({
            approval_id: approval.id,
            request_id: approval.request_id,
            requester_name: approval.requester_name,
            requester_position: approval.requester_position,
            requester_email: approval.requester_email,
            requester_profile_picture: undefined, // Will need to fetch separately if needed
            purpose: approval.purpose || '',
            destination: approval.destination || '',
            time_out: approval.time_out || '',
            time_in: approval.time_in || '',
            reason: approval.reason || '',
            date_needed: approval.date_needed || '',
            status: approval.status,
            approved_by_name: approval.users?.name || 'Unknown',
            approved_date: approval.approved_date,
            created_at: approval.created_at
          }));
          
          setApprovedRequests(transformedApprovals);
        }
      } catch (approvalErr) {
        console.log('[GuardApproval] dean_approvals table does not exist yet, using requests table data');
      }

    } catch (error) {
      console.error('[GuardApproval] Error fetching approved requests:', error);
      toast.error('Failed to fetch approved requests');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardApproval = async (request: GuardApprovalRequest) => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    setProcessingId(request.request_id);
    try {
      console.log(`[GuardApproval] Processing guard approval for request ${request.request_id}`);
      console.log(`[GuardApproval] Current user:`, currentUser);
      console.log(`[GuardApproval] Request details:`, request);

      const currentTimestamp = new Date().toISOString();

      // First, check if the request exists and can be updated
      const { data: existingRequest, error: checkError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', request.request_id)
        .single();

      if (checkError) {
        console.error('[GuardApproval] Error checking existing request:', checkError);
        toast.error('Request not found: ' + checkError.message);
        return;
      }

      console.log('[GuardApproval] Existing request before update:', existingRequest);

      // Update the request with guard approval - this is the main update
      const { data: updatedRequest, error: updateError } = await supabase
        .from('requests')
        .update({
          guard_approved: true,
          guard_approved_by: currentUser.id,
          guard_approved_date: currentTimestamp,
          status: 'Guard Approved', // This status will be visible to HR Personnel
          updated_at: currentTimestamp
        })
        .eq('id', request.request_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('[GuardApproval] Error updating request:', updateError);
        toast.error('Failed to approve request: ' + updateError.message);
        return;
      }

      console.log('[GuardApproval] Successfully updated request:', updatedRequest);

      // Also update dean_approvals table if it exists (for backward compatibility)
      try {
        const { error: deanApprovalError } = await supabase
          .from('dean_approvals')
          .update({
            guard_approved: true,
            guard_approved_by: currentUser.id,
            guard_approved_date: currentTimestamp,
            status: 'Guard Approved',
            updated_at: currentTimestamp
          })
          .eq('request_id', request.request_id);

        if (deanApprovalError) {
          console.log('[GuardApproval] dean_approvals table update failed (table may not exist):', deanApprovalError);
        } else {
          console.log('[GuardApproval] dean_approvals table also updated');
        }
      } catch (deanApprovalErr) {
        console.log('[GuardApproval] dean_approvals table update not needed or failed:', deanApprovalErr);
      }

      // Create an audit log entry for this approval
      try {
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            action: 'guard_approval',
            table_name: 'requests',
            record_id: request.request_id,
            user_id: currentUser.id,
            details: {
              request_id: request.request_id,
              requester_name: request.requester_name,
              guard_name: currentUser.name,
              approval_timestamp: currentTimestamp,
              previous_status: request.status,
              new_status: 'Guard Approved'
            },
            created_at: currentTimestamp
          });

        if (auditError) {
          console.log('[GuardApproval] Audit log creation failed (table may not exist):', auditError);
        }
      } catch (auditErr) {
        console.log('[GuardApproval] Audit log not created:', auditErr);
      }

      // Show success message
      toast.success(
        `✅ Exit approved for ${request.requester_name}!\n` +
        `HR Personnel can now see this approved gate pass.`,
        { duration: 5000 }
      );
      
      console.log(`[GuardApproval] ✅ APPROVAL COMPLETE:`);
      console.log(`[GuardApproval] - Request ID: ${request.request_id}`);
      console.log(`[GuardApproval] - Faculty: ${request.requester_name}`);
      console.log(`[GuardApproval] - Status changed to: 'Guard Approved'`);
      console.log(`[GuardApproval] - Guard: ${currentUser.name} (ID: ${currentUser.id})`);
      console.log(`[GuardApproval] - Timestamp: ${currentTimestamp}`);
      console.log(`[GuardApproval] - HR Personnel will see this in their requests dashboard`);
      
      // Refresh the requests list to show updated status
      await fetchApprovedRequests();

    } catch (error) {
      console.error('[GuardApproval] Error processing guard approval:', error);
      toast.error('Failed to process approval: ' + (error as Error).message);
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
      <div className="min-h-screen bg-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Access Denied</div>
          <div className="text-gray-600">Only Guard users can access this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-100">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Guard Gate Pass Monitor</h1>
          <p className="mt-2 text-gray-600">View approved gate pass requests from faculty members</p>
        </div>

        {/* Stats Card */}
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">{approvedRequests.length}</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Approved Gate Passes</h3>
              <p className="text-sm text-gray-500">Faculty gate pass requests approved by Dean</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={fetchApprovedRequests}
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
            <div className="text-gray-500">Loading approved requests...</div>
          </div>
        ) : approvedRequests.length === 0 ? (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-500">No approved requests found</div>
            <p className="text-sm text-gray-400 mt-2">No gate pass requests have been approved yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {approvedRequests.map((request) => (
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
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      request.guard_approved ? 'bg-blue-400' : 'bg-green-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{request.requester_name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {request.requester_position}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.guard_approved 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {request.guard_approved ? '✓ Guard Approved' : '✓ Dean Approved'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purpose</span>
                    <p className="text-sm text-gray-900 mt-1">{request.purpose || 'Not specified'}</p>
                  </div>
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
                  {request.reason && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</span>
                      <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved By</span>
                    <p className="text-sm text-gray-900 mt-1">{request.approved_by_name}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    <div>Requested: {formatDateTime(request.created_at)}</div>
                    <div>Approved: {formatDateTime(request.approved_date)}</div>
                    {request.guard_approved && request.guard_approved_date && (
                      <div>Guard Approved: {formatDateTime(request.guard_approved_date)}</div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!request.guard_approved ? (
                      <button
                        onClick={() => handleGuardApproval(request)}
                        disabled={processingId === request.request_id}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-1"
                      >
                        {processingId === request.request_id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Approve Exit</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-700 font-medium">✓ Exit Approved</span>
                        <span className="text-xs text-green-600">→ HR Notified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

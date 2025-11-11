import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

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
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'unapproved'>('date');

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
      // Optimized: Fetch all data in parallel with batch queries
      const [requestsResult, usersResult] = await Promise.all([
        supabase
          .from('requests')
          .select('*')
          .eq('request_type', 'Gate Pass')
          .in('status', ['Approved', 'Guard Approved'])
          .order('approved_date', { ascending: false }),
        supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
      ]);

      if (requestsResult.error) {
        toast.error('Failed to fetch requests');
        return;
      }

      if (!requestsResult.data || requestsResult.data.length === 0) {
        setApprovedRequests([]);
        return;
      }

      // Create user lookup map for O(1) access
      const userMap = new Map();
      if (usersResult.data) {
        usersResult.data.forEach(user => {
          userMap.set(user.id, user);
        });
      }

      // Transform requests with user data
      const requestsWithUsers = requestsResult.data.map(request => {
        const userData = userMap.get(request.user_id);
        const approverData = userMap.get(request.approved_by);

        return {
          approval_id: request.id,
          request_id: request.id,
          requester_name: userData?.name || 'Unknown',
          requester_position: userData?.positions || '',
          requester_email: userData?.email || '',
          requester_profile_picture: userData?.profile_picture,
          purpose: request.purpose || '',
          destination: request.destination || '',
          time_out: request.time_out || '',
          time_in: request.time_in || '',
          reason: request.reason || '',
          date_needed: request.date_needed || '',
          status: request.status,
          approved_by_name: approverData?.name || 'Unknown',
          approved_date: request.approved_date,
          created_at: request.created_at,
          guard_approved: request.guard_approved || false,
          guard_approved_by: request.guard_approved_by,
          guard_approved_date: request.guard_approved_date
        };
      });

      setApprovedRequests(requestsWithUsers);

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

    // SweetAlert2 confirmation
    const result = await Swal.fire({
      title: 'Approve Exit?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Faculty:</strong> ${request.requester_name}</p>
          <p class="mb-2"><strong>Destination:</strong> ${request.destination}</p>
          <p class="mb-2"><strong>Purpose:</strong> ${request.purpose}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve Exit',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
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

  const handleUnapprove = async (request: GuardApprovalRequest) => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    // SweetAlert2 confirmation
    const result = await Swal.fire({
      title: 'Unapprove Exit?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Faculty:</strong> ${request.requester_name}</p>
          <p class="mb-2">This will revert the status back to <strong>Dean Approved</strong>.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Unapprove',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    setProcessingId(request.request_id);
    try {
      console.log(`[GuardApproval] Processing unapproval for request ${request.request_id}`);

      const currentTimestamp = new Date().toISOString();

      // Update the request to remove guard approval
      const { data: updatedRequest, error: updateError } = await supabase
        .from('requests')
        .update({
          guard_approved: false,
          guard_approved_by: null,
          guard_approved_date: null,
          status: 'Approved', // Revert to Dean Approved status
          updated_at: currentTimestamp
        })
        .eq('id', request.request_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('[GuardApproval] Error unapproving request:', updateError);
        toast.error('Failed to unapprove request: ' + updateError.message);
        return;
      }

      console.log('[GuardApproval] Successfully unapproved request:', updatedRequest);

      // Also update dean_approvals table if it exists
      try {
        await supabase
          .from('dean_approvals')
          .update({
            guard_approved: false,
            guard_approved_by: null,
            guard_approved_date: null,
            status: 'Approved',
            updated_at: currentTimestamp
          })
          .eq('request_id', request.request_id);
      } catch (deanApprovalErr) {
        console.log('[GuardApproval] dean_approvals table update not needed');
      }

      // Create audit log for unapproval
      try {
        await supabase
          .from('audit_logs')
          .insert({
            action: 'guard_unapproval',
            table_name: 'requests',
            record_id: request.request_id,
            user_id: currentUser.id,
            details: {
              request_id: request.request_id,
              requester_name: request.requester_name,
              guard_name: currentUser.name,
              unapproval_timestamp: currentTimestamp,
              previous_status: 'Guard Approved',
              new_status: 'Approved'
            },
            created_at: currentTimestamp
          });
      } catch (auditErr) {
        console.log('[GuardApproval] Audit log not created:', auditErr);
      }

      toast.success(
        `✅ Approval removed for ${request.requester_name}!\n` +
        `Request reverted to Dean Approved status.`,
        { duration: 5000 }
      );

      await fetchApprovedRequests();

    } catch (error) {
      console.error('[GuardApproval] Error processing unapproval:', error);
      toast.error('Failed to unapprove: ' + (error as Error).message);
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

  // Filter and sort requests based on selected criteria
  const sortedRequests = [...approvedRequests]
    .filter((request) => {
      if (sortBy === 'status') {
        // Show only guard approved requests
        return request.guard_approved === true;
      } else if (sortBy === 'unapproved') {
        // Show only pending guard approval (dean approved but not guard approved)
        return request.guard_approved === false || !request.guard_approved;
      }
      // For 'date', show all
      return true;
    })
    .sort((a, b) => {
      // Always sort by date - newest first
      const dateA = new Date(a.approved_date || a.created_at).getTime();
      const dateB = new Date(b.approved_date || b.created_at).getTime();
      return dateB - dateA;
    });

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
    <div className="min-h-screen w-full lg:ml-70 py-8 roboto px-4 sm:px-6 bg-red-50">
      <main className="flex flex-col w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gate Pass Monitor</h1>
          <p className="mt-1 text-sm text-gray-600">View and approve gate pass requests</p>
        </div>

        {/* Stats Card with Sorting - Minimalist */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-semibold text-lg">{approvedRequests.length}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Approved Gate Passes</h3>
                <p className="text-xs text-gray-500">Requests approved by Dean</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'unapproved')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="date">Sort by Date</option>
                <option value="status">Approved by Guard</option>
                <option value="unapproved">Pending Guard Approval</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={fetchApprovedRequests}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="text-sm text-gray-500">Loading approved requests...</div>
          </div>
        ) : approvedRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="text-sm text-gray-500">No approved requests found</div>
            <p className="text-xs text-gray-400 mt-1">No gate pass requests have been approved yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedRequests.map((request) => (
              <div key={request.approval_id} className="relative bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Approved Watermark */}
                {request.guard_approved && (
                  <div className="absolute top-0 right-0 w-full h-full pointer-events-none flex items-center justify-center opacity-5">
                    <div className="transform rotate-[-45deg] text-blue-600 font-black text-6xl whitespace-nowrap">
                      APPROVED
                    </div>
                  </div>
                )}
                
                {/* Header with Profile Picture */}
                <div className="relative flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="relative flex-shrink-0">
                    {request.requester_profile_picture ? (
                      <img
                        src={request.requester_profile_picture}
                        alt={request.requester_name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center ring-2 ring-gray-100">
                        <span className="text-white font-semibold text-base">
                          {request.requester_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      request.guard_approved ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{request.requester_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{request.requester_position}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                      request.guard_approved 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'bg-green-50 text-green-700'
                    }`}>
                      {request.guard_approved ? '✓ Guard Approved' : '✓ Dean Approved'}
                    </span>
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-3 mb-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Purpose</span>
                    <p className="text-sm text-gray-900 mt-0.5">{request.purpose || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Destination</span>
                    <p className="text-sm text-gray-900 mt-0.5">{request.destination || 'Not specified'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Time Out</span>
                      <p className="text-xs text-gray-700 mt-0.5">{formatDateTime(request.time_out)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Time In</span>
                      <p className="text-xs text-gray-700 mt-0.5">{formatDateTime(request.time_in)}</p>
                    </div>
                  </div>
                  {request.reason && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Reason</span>
                      <p className="text-sm text-gray-900 mt-0.5">{request.reason}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-gray-500">Approved By</span>
                    <p className="text-sm text-gray-900 mt-0.5">{request.approved_by_name}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 min-h-[3rem]">
                    <div className="space-y-0.5">
                      <div>Requested: {formatDateTime(request.created_at)}</div>
                      <div>Approved: {formatDateTime(request.approved_date)}</div>
                      {request.guard_approved && request.guard_approved_date && (
                        <div className="text-blue-600 font-medium">Guard: {formatDateTime(request.guard_approved_date)}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Button - Uniform Design */}
                  <div className="w-full">
                    {!request.guard_approved ? (
                      <button
                        onClick={() => handleGuardApproval(request)}
                        disabled={processingId === request.request_id}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processingId === request.request_id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Approve Exit</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnapprove(request)}
                        disabled={processingId === request.request_id}
                        className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processingId === request.request_id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Unapprove</span>
                          </>
                        )}
                      </button>
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

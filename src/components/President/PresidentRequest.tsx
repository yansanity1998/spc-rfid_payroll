import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from "react-hot-toast";

interface PresidentDeanRequest {
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
  attachment?: string;
  status: string;
  created_at: string;
}

const PresidentRequest = () => {
  const [pendingRequests, setPendingRequests] = useState<PresidentDeanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PresidentDeanRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [presidentNotes, setPresidentNotes] = useState("");
  const [actionType, setActionType] = useState<"Approved" | "Rejected">("Approved");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<"All" | "Gate Pass" | "Leave" | "Loan">("All");

  useEffect(() => {
    checkPresidentAuthorization();
    fetchPendingRequests();
  }, []);

  const checkPresidentAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("auth_id", user.id)
        .single();

      if (error || !userData) {
        toast.error("User not found");
        return;
      }

      if (userData.role !== "President") {
        toast.error("Access denied. Only President can access this page.");
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      console.error("[PresidentRequest] Authorization error:", error);
      toast.error("Authorization failed");
    }
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      console.log("[PresidentRequest] Fetching dean-related requests for President view...");

      const { data: allRequests, error: requestError } = await supabase
        .from("requests")
        .select("*")
        .in("request_type", ["Gate Pass", "Leave", "Loan"])
        .in("status", ["Pending", "Pending Dean Approval"]);

      if (requestError) {
        console.error("[PresidentRequest] Error fetching requests:", requestError);
        toast.error("Failed to fetch requests: " + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        setPendingRequests([]);
        return;
      }

      const requestsWithUsers: PresidentDeanRequest[] = [];

      const userIds = Array.from(new Set(allRequests.map((r: any) => r.user_id)));

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, positions, role, profile_picture")
        .in("id", userIds);

      if (usersError) {
        console.error("[PresidentRequest] Error fetching users for requests:", usersError);
      }

      const usersMap = new Map<number, any>();
      usersData?.forEach((u: any) => usersMap.set(u.id, u));

      for (const request of allRequests) {
        const userData = usersMap.get(request.user_id);

        if (userData) {
          const isDeanRequester = userData.role === "Faculty" && userData.positions === "Dean";

          if (isDeanRequester) {
            requestsWithUsers.push({
              approval_id: request.id,
              request_id: request.id,
              requester_name: userData.name,
              requester_position: userData.positions,
              requester_email: userData.email,
              requester_profile_picture: userData.profile_picture,
              request_type: request.request_type || "Unknown",
              leave_type: request.leave_type || "",
              purpose: request.purpose || "",
              destination: request.destination || "",
              time_out: request.time_out || "",
              time_in: request.time_in || "",
              reason: request.reason || "",
              date_needed: request.date_needed || "",
              start_date: request.start_date || "",
              end_date: request.end_date || "",
              duration: request.duration || "",
              amount: request.amount || 0,
              repayment_terms: request.repayment_terms || "",
              monthly_deduction: request.monthly_deduction || 0,
              total_months: request.total_months || 0,
              attachment: request.attachment || "",
              status: "Pending",
              created_at: request.created_at,
            });
          }
        }
      }

      const sortedRequests = [...requestsWithUsers].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setPendingRequests(sortedRequests);

      // Also try dean_approvals table if available, but restrict to records where requester is Dean
      try {
        const { data: approvals, error: approvalError } = await supabase
          .from("dean_approvals")
          .select("*")
          .eq("status", "Pending")
          .eq("requester_position", "Dean")
          .order("created_at", { ascending: true });

        if (!approvalError && approvals && approvals.length > 0) {
          const sortedApprovals = [...approvals].sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setPendingRequests(sortedApprovals as any);
        }
      } catch (approvalErr) {
        console.log("[PresidentRequest] dean_approvals table not available, using requests table data only");
      }
    } catch (error) {
      console.error("[PresidentRequest] Error fetching pending requests:", error);
      toast.error("Failed to fetch pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (request: PresidentDeanRequest, action: "Approved" | "Rejected") => {
    setSelectedRequest(request);
    setActionType(action);
    setPresidentNotes("");
    setShowModal(true);
  };

  const processApproval = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.approval_id);
    try {
      const now = new Date().toISOString();

      let approverId = currentUser?.id as number | undefined;

      if (!approverId) {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;

        if (!authUser) {
          toast.error("Please login again to approve this request.");
          return;
        }

        const { data: approverData, error: approverError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", authUser.id)
          .single();

        if (approverError || !approverData) {
          console.error("[PresidentRequest] Unable to resolve approver user:", approverError);
          toast.error("Unable to identify approver account.");
          return;
        }

        approverId = approverData.id;
      }

      const { error: requestError } = await supabase
        .from("requests")
        .update({
          status: actionType,
          approved_by: approverId,
          approved_date: now,
          admin_notes: presidentNotes || null,
          updated_at: now,
        })
        .eq("id", selectedRequest.request_id);

      if (requestError) {
        throw requestError;
      }

      try {
        await supabase
          .from("dean_approvals")
          .update({
            status: actionType,
            approved_by: approverId,
            approved_date: now,
            dean_notes: presidentNotes || null,
            updated_at: now,
          })
          .eq("request_id", selectedRequest.request_id);
      } catch (err) {
        console.log("[PresidentRequest] dean_approvals update skipped or failed:", err);
      }

      toast.success(`Request ${actionType.toLowerCase()} successfully!`);
      setShowModal(false);
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (error) {
      console.error("[PresidentRequest] Error processing approval:", error);
      toast.error(`Failed to ${actionType.toLowerCase()} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-100">
      <main className="flex flex-col w-full max-w-6xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-xl rounded-2xl space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">President Dean Requests</h1>
              <p className="text-xs sm:text-sm text-gray-500">Review and approve dean-related gate pass, leave, and loan requests</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="font-medium text-gray-700">Pending: {pendingRequests.length}</span>
              </span>
            </div>
            <button
              onClick={fetchPendingRequests}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
          <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-gray-600">
            <span className="font-medium text-gray-800">Dean Requests</span>
            <span className="text-gray-400">•</span>
            <span>Sorted by latest first</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs sm:text-sm text-gray-500">Type</label>
            <select
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value as any)}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            >
              <option value="All">All</option>
              <option value="Gate Pass">Gate Pass</option>
              <option value="Leave">Leave</option>
              <option value="Loan">Loan</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden mt-6">
            <div className="p-12 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 font-medium text-lg">Loading dean requests...</div>
            </div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl flex items-center justify-center py-10">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-800">No pending dean requests</h3>
              <p className="text-xs text-gray-500">All dean-related requests have been processed.</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Pending dean requests</h2>
              <span className="text-xs text-gray-500">Newest first</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-3 pt-0">
              {pendingRequests
                .filter((request) => requestTypeFilter === "All" || request.request_type === requestTypeFilter)
                .map((request) => (
                  <div
                    key={request.approval_id}
                    className="group relative bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full border border-gray-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative z-10 flex items-center space-x-3 mb-2">
                      <div className="relative">
                        {request.requester_profile_picture ? (
                          <img
                            src={request.requester_profile_picture}
                            alt={request.requester_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-red-200 shadow-md"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
                            <span className="text-red-700 font-semibold text-sm">
                              {request.requester_name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-sm">{request.requester_name}</h3>
                        <div className="flex items-center space-x-1 flex-wrap mt-0.5">
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[10px] font-medium border border-red-100">
                            {request.requester_position}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              request.request_type === "Gate Pass"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : request.request_type === "Leave"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : request.request_type === "Loan"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {request.request_type}
                          </span>
                          {request.request_type === "Leave" && request.leave_type && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-medium border border-emerald-100">
                              {request.leave_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-1.5 mb-3 flex-grow">
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Purpose</span>
                        <p className="text-sm text-gray-900 mt-1 font-medium line-clamp-3">
                          {request.purpose || request.reason || "Not specified"}
                        </p>
                      </div>

                      {request.request_type === "Gate Pass" && (
                        <>
                          <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Destination</span>
                            <p className="text-sm text-blue-900 mt-1 font-medium">{request.destination || "Not specified"}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Time Out</span>
                              <p className="text-xs text-blue-800 mt-1 font-medium">{formatDateTime(request.time_out)}</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Time In</span>
                              <p className="text-xs text-blue-800 mt-1 font-medium">{formatDateTime(request.time_in)}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {request.request_type === "Leave" && (
                        <>
                          {request.leave_type && (
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                              <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Leave Type</span>
                              <p className="text-sm text-purple-900 mt-1 font-medium">{request.leave_type}</p>
                            </div>
                          )}
                          {(request.start_date || request.end_date) && (
                            <div className="grid grid-cols-2 gap-2">
                              {request.start_date && (
                                <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                                  <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Start Date</span>
                                  <p className="text-xs text-purple-800 mt-1 font-medium">{formatDateTime(request.start_date)}</p>
                                </div>
                              )}
                              {request.end_date && (
                                <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                                  <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">End Date</span>
                                  <p className="text-xs text-purple-800 mt-1 font-medium">{formatDateTime(request.end_date)}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {request.duration && (
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                              <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Duration</span>
                              <p className="text-sm text-purple-900 mt-1 font-medium">{request.duration}</p>
                            </div>
                          )}
                          {request.date_needed && (
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                              <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Date Needed</span>
                              <p className="text-sm text-purple-900 mt-1 font-medium">{formatDateTime(request.date_needed)}</p>
                            </div>
                          )}
                        </>
                      )}

                      {request.request_type === "Loan" && (
                        <>
                          {request.amount && (
                            <div className="bg-green-50 p-2.5 rounded-lg border border-green-100">
                              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Loan Amount</span>
                              <p className="text-base text-green-900 mt-1 font-bold">
                                ₱{request.amount.toLocaleString()}
                              </p>
                            </div>
                          )}
                          {request.date_needed && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Date Needed</span>
                              <p className="text-sm text-green-900 mt-1 font-medium">{formatDateTime(request.date_needed)}</p>
                            </div>
                          )}
                          {(request.monthly_deduction || request.total_months) && (
                            <div className="grid grid-cols-2 gap-2">
                              {request.monthly_deduction && (
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Monthly Deduction</span>
                                  <p className="text-xs text-green-800 mt-1 font-medium">
                                    ₱{request.monthly_deduction.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {request.total_months && (
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Total Months</span>
                                  <p className="text-xs text-green-800 mt-1 font-medium">{request.total_months} months</p>
                                </div>
                              )}
                            </div>
                          )}
                          {request.repayment_terms && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Repayment Terms</span>
                              <p className="text-sm text-green-900 mt-1 font-medium">{request.repayment_terms}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-2 border-t border-gray-200 mt-auto">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {formatDateTime(request.created_at)}
                      </span>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleApprovalAction(request, "Approved")}
                          disabled={processingId === request.approval_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(request, "Rejected")}
                          disabled={processingId === request.approval_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    actionType === "Approved"
                      ? "bg-gradient-to-br from-green-500 to-green-600"
                      : "bg-gradient-to-br from-red-500 to-red-600"
                  }`}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {actionType === "Approved" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{actionType} Request</h3>
                  <p className="text-gray-600 text-sm">
                    {selectedRequest.request_type} from {selectedRequest.requester_name}
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                Are you sure you want to <strong>{actionType.toLowerCase()}</strong> the{" "}
                <strong>{selectedRequest.request_type.toLowerCase()}</strong> request from{" "}
                <strong>{selectedRequest.requester_name}</strong>?
              </p>

              {selectedRequest.attachment && (
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex items-center justify-between gap-4">
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
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-md transition-all duration-200"
                  >
                    View attachment
                  </a>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Notes (Optional)</label>
                <textarea
                  value={presidentNotes}
                  onChange={(e) => setPresidentNotes(e.target.value)}
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
                    actionType === "Approved"
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
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
                        {actionType === "Approved" ? (
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

export default PresidentRequest;


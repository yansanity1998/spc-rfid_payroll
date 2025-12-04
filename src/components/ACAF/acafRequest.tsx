import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { toast } from "react-hot-toast";

interface AcafRequestItem {
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
  date_needed?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  amount?: number;
  repayment_terms?: string;
  period_deduction?: number;
  total_periods?: number;
  status: string;
  created_at: string;
}

const AcafRequest = () => {
  const [pendingRequests, setPendingRequests] = useState<AcafRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AcafRequestItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [acafNotes, setAcafNotes] = useState("");
  const [actionType, setActionType] = useState<"Approved" | "Rejected">("Approved");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<"All" | "Gate Pass" | "Leave" | "Loan">("All");

  useEffect(() => {
    checkAcafAuthorization();
    fetchPendingRequests();
  }, []);

  const checkAcafAuthorization = async () => {
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

      if (userData.role !== "ACAF") {
        toast.error("Access denied. Only ACAF can access this page.");
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      console.error("[AcafRequest] Authorization error:", error);
      toast.error("Authorization failed");
    }
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      console.log("[AcafRequest] Fetching Faculty requests (excluding Deans) for ACAF view...");

      const { data: allRequests, error: requestError } = await supabase
        .from("requests")
        .select("*")
        .in("request_type", ["Gate Pass", "Leave", "Loan"])
        .in("status", ["Pending", "Pending Dean Approval"])
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("[AcafRequest] Error fetching requests:", requestError);
        toast.error("Failed to fetch requests: " + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        setPendingRequests([]);
        return;
      }

      const userIds = Array.from(new Set(allRequests.map((r: any) => r.user_id)));

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, positions, role, profile_picture")
        .in("id", userIds);

      if (usersError) {
        console.error("[AcafRequest] Error fetching users for requests:", usersError);
      }

      const usersMap = new Map<number, any>();
      usersData?.forEach((u: any) => usersMap.set(u.id, u));

      const requestsWithUsers: AcafRequestItem[] = [];

      for (const request of allRequests) {
        const userData = usersMap.get(request.user_id);

        if (userData) {
          const isFaculty = userData.role === "Faculty";
          const isDean = isFaculty && userData.positions === "Dean";

          // ACAF should see all Faculty requests EXCEPT Dean
          if (isFaculty && !isDean) {
            requestsWithUsers.push({
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
              total_days: request.total_days || 0,
              amount: request.amount || 0,
              repayment_terms: request.repayment_terms || "",
              period_deduction: request.period_deduction || 0,
              total_periods: request.total_periods || 0,
              status: request.status || "Pending",
              created_at: request.created_at,
            });
          }
        }
      }

      const sortedRequests = [...requestsWithUsers].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPendingRequests(sortedRequests);
    } catch (error) {
      console.error("[AcafRequest] Error fetching pending requests:", error);
      toast.error("Failed to fetch pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (request: AcafRequestItem, action: "Approved" | "Rejected") => {
    setSelectedRequest(request);
    setActionType(action);
    setAcafNotes("");
    setShowModal(true);
  };

  const processApproval = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.request_id);
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
          console.error("[AcafRequest] Unable to resolve approver user:", approverError);
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
          admin_notes: acafNotes || null,
          updated_at: now,
        })
        .eq("id", selectedRequest.request_id);

      if (requestError) {
        throw requestError;
      }

      toast.success(`Request ${actionType.toLowerCase()} successfully!`);
      setShowModal(false);
      setSelectedRequest(null);
      fetchPendingRequests();
    } catch (error) {
      console.error("[AcafRequest] Error processing approval:", error);
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

  const filteredRequests = pendingRequests.filter((req) => {
    const matchesType =
      requestTypeFilter === "All" || req.request_type === requestTypeFilter;
    return matchesType;
  });

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-4 sm:space-y-6">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  ACAF Requests
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Review and approve gate pass, loan, and leave requests from
                  Faculty (excluding Deans)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">
                {filteredRequests.length}
              </span>{" "}
              pending request{filteredRequests.length === 1 ? "" : "s"} shown
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Filter by type:
              </label>
              <select
                value={requestTypeFilter}
                onChange={(e) =>
                  setRequestTypeFilter(e.target.value as any)
                }
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="All">All</option>
                <option value="Gate Pass">Gate Pass</option>
                <option value="Loan">Loan</option>
                <option value="Leave">Leave</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Pending Faculty Requests
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-red-700 to-red-800 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">
                      Faculty
                    </th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">
                      Position
                    </th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">
                      Reason / Purpose
                    </th>
                    <th className="px-3 py-2.5 text-left border-b text-sm font-medium">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-center border-b text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-gray-600"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium">
                            Loading pending requests...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                      <tr
                        key={req.request_id}
                        className="hover:bg-white/80 transition-all duration-200 group"
                      >
                        <td className="px-3 py-3 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            {req.requester_profile_picture ? (
                              <img
                                src={req.requester_profile_picture}
                                alt={req.requester_name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-red-200"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {req.requester_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">
                                {req.requester_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {req.requester_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 border-b border-gray-200">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {req.requester_position || "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-3 border-b border-gray-200">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              req.request_type === "Gate Pass"
                                ? "bg-blue-100 text-blue-800"
                                : req.request_type === "Loan"
                                ? "bg-green-100 text-green-800"
                                : req.request_type === "Leave"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {req.request_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 border-b border-gray-200 max-w-xs">
                          <div className="text-xs text-gray-700 line-clamp-2">
                            {req.reason || req.purpose || `${req.request_type} Request`}
                          </div>
                        </td>
                        <td className="px-3 py-3 border-b border-gray-200">
                          <div className="text-xs text-gray-700">
                            {formatDateTime(req.created_at)}
                          </div>
                        </td>
                        <td className="px-3 py-3 border-b border-gray-200 text-center">
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                              onClick={() => handleApprovalAction(req, "Approved")}
                              disabled={processingId === req.request_id}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingId === req.request_id &&
                              actionType === "Approved"
                                ? "Approving..."
                                : "Approve"}
                            </button>
                            <button
                              onClick={() => handleApprovalAction(req, "Rejected")}
                              disabled={processingId === req.request_id}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingId === req.request_id &&
                              actionType === "Rejected"
                                ? "Rejecting..."
                                : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                              No Pending Requests
                            </h3>
                            <p className="text-gray-500">
                              {loading
                                ? "Loading requests..."
                                : "There are no pending Faculty requests at the moment."}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-700 to-red-800 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {actionType === "Approved" ? "Approve" : "Reject"} Request
                    </h2>
                    <p className="text-xs text-red-100">
                      {selectedRequest.requester_name}  b7 {selectedRequest.request_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="text-sm text-gray-700">
                  <p className="mb-1 font-semibold">Reason / Purpose</p>
                  <p className="text-gray-600 whitespace-pre-line">
                    {selectedRequest.reason ||
                      selectedRequest.purpose ||
                      `${selectedRequest.request_type} Request`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ACAF Notes (optional)
                  </label>
                  <textarea
                    value={acafNotes}
                    onChange={(e) => setAcafNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="Add any remarks or justification for this decision"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={processApproval}
                  disabled={processingId === selectedRequest.request_id}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === "Approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {processingId === selectedRequest.request_id
                    ? actionType === "Approved"
                      ? "Approving..."
                      : "Rejecting..."
                    : actionType === "Approved"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AcafRequest;


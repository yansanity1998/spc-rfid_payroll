import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const FacRequest = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    reason: "",
    date_needed: "",
    destination: "",
    purpose: ""
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
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false });

        if (!error) {
          setRequests(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (userData) {
        const { error } = await supabase
          .from("requests")
          .insert([{
            user_id: userData.id,
            type: formData.type,
            amount: formData.amount ? parseFloat(formData.amount) : null,
            reason: formData.reason,
            date_needed: formData.date_needed,
            destination: formData.destination,
            purpose: formData.purpose,
            status: "Pending"
          }]);

        if (!error) {
          setShowForm(false);
          setFormData({
            type: "",
            amount: "",
            reason: "",
            date_needed: "",
            destination: "",
            purpose: ""
          });
          fetchRequests();
        }
      }
    } catch (error) {
      console.error("Error submitting request:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = requests.filter(r => r.status === "Pending").length;
  const approvedRequests = requests.filter(r => r.status === "Approved").length;
  const rejectedRequests = requests.filter(r => r.status === "Rejected").length;

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
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Requests</h1>
                  <p className="text-gray-600">Submit and track your requests</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Request
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
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

          {/* Requests Table */}
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
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Amount</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Reason</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Date Needed</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Status</th>
                    <th className="px-3 sm:px-4 py-3 text-left border-b font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length > 0 ? (
                    requests.map((request) => (
                      <tr key={request.id} className="hover:bg-white/80 transition-all duration-200">
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200">
                          <span className="font-semibold text-gray-800">{request.type}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {request.amount ? `₱${request.amount.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {request.reason || "-"}
                        </td>
                        <td className="px-3 sm:px-4 py-4 border-b border-gray-200 text-gray-600">
                          {request.date_needed || "-"}
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
                      <td colSpan={6} className="text-center py-12">
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
        </section>

        {/* Request Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Submit New Request</h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Request Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select request type</option>
                    <option value="Loan">Loan Request</option>
                    <option value="Gatepass">Gatepass Request</option>
                    <option value="Leave">Leave Request</option>
                    <option value="Equipment">Equipment Request</option>
                  </select>
                </div>

                {/* Amount (for loans) */}
                {formData.type === "Loan" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₱)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter loan amount"
                    />
                  </div>
                )}

                {/* Destination (for gatepass) */}
                {formData.type === "Gatepass" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Where are you going?"
                    />
                  </div>
                )}

                {/* Reason/Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === "Gatepass" ? "Purpose" : "Reason"}
                  </label>
                  <textarea
                    value={formData.type === "Gatepass" ? formData.purpose : formData.reason}
                    onChange={(e) => setFormData({
                      ...formData, 
                      [formData.type === "Gatepass" ? "purpose" : "reason"]: e.target.value
                    })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder={`Explain the ${formData.type === "Gatepass" ? "purpose" : "reason"} for your request`}
                  />
                </div>

                {/* Date Needed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Needed</label>
                  <input
                    type="date"
                    value={formData.date_needed}
                    onChange={(e) => setFormData({...formData, date_needed: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRequest}
                    disabled={!formData.type}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

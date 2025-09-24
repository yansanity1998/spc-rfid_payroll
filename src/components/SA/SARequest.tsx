// src/components/SA/SARequest.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const SARequest = () => {
  const [requests, setRequests] = useState<Array<{
    id: number;
    request_type: string;
    description: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
    status: string;
    created_at: string;
    updated_at?: string;
    admin_response?: string;
  }>>([]);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    name: string;
    email: string;
    auth_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: "",
    description: "",
    start_date: "",
    end_date: "",
    reason: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const requestTypes = [
    "Leave Request",
    "Overtime Request", 
    "Training Request",
    "Equipment Request",
    "Event Approval",
    "Budget Request",
    "Other"
  ];

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No authenticated user found");
        return null;
      }

      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user data:", fetchError);
        return null;
      }

      return userData;
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return null;
    }
  };

  const fetchRequests = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in fetchRequests:", error);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    const userData = await fetchUserData();
    if (!userData) {
      setLoading(false);
      return;
    }
    
    setCurrentUser(userData);
    
    const requestsData = await fetchRequests(userData.id);
    setRequests(requestsData);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert("User not found. Please refresh and try again.");
      return;
    }

    if (!formData.request_type || !formData.description) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("requests")
        .insert([
          {
            user_id: currentUser.id,
            request_type: formData.request_type,
            description: formData.description,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            reason: formData.reason,
            status: "Pending",
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error("Error submitting request:", error);
        alert("Error submitting request. Please try again.");
        return;
      }

      // Reset form
      setFormData({
        request_type: "",
        description: "",
        start_date: "",
        end_date: "",
        reason: ""
      });
      setShowForm(false);

      // Refresh requests
      const updatedRequests = await fetchRequests(currentUser.id);
      setRequests(updatedRequests);

      alert("Request submitted successfully!");
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Rejected":
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Pending":
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-red-700 font-medium">Loading requests...</p>
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">SA Requests</h1>
              <p className="text-gray-600">Submit and track your requests</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </button>
          </div>
        </div>

        {/* New Request Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Submit New Request</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="request_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Request Type *
                  </label>
                  <select
                    id="request_type"
                    name="request_type"
                    value={formData.request_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Select request type</option>
                    {requestTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <input
                    type="text"
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Brief reason for request"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Provide detailed description of your request..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    submitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-yellow-600 hover:bg-yellow-700"
                  } text-white`}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Requests</h2>
          
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{request.request_type}</h3>
                        <p className="text-sm text-gray-600">
                          Submitted on {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {request.reason && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Reason</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      </div>
                    )}
                    {request.start_date && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Duration</p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.start_date).toLocaleDateString()}
                          {request.end_date && ` - ${new Date(request.end_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{request.description}</p>
                  </div>

                  {request.admin_response && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Admin Response</p>
                      <p className="text-sm text-blue-800">{request.admin_response}</p>
                      {request.updated_at && (
                        <p className="text-xs text-blue-600 mt-2">
                          Responded on {new Date(request.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't submitted any requests yet. Click "New Request" to get started.
              </p>
            </div>
          )}
        </div>
        </section>
      </main>
    </div>
  );
};

export default SARequest;

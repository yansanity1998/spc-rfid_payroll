// src/pages/Requests.tsx
import { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import { toast } from 'react-hot-toast';

interface HRRequest {
  id: number;
  name: string;
  type: string;
  leave_type?: string;
  reason: string;
  purpose: string;
  destination: string;
  time_out: string;
  time_in: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  date_needed?: string;
  date: string;
  status: string;
  requester_position: string;
  approved_by_name: string;
  guard_approved_by_name: string;
  approved_date: string;
  guard_approved_date: string;
  profile_picture?: string;
  // Add fields to track approval states
  approved_by?: number;
  guard_approved?: boolean;
  guard_approved_by?: number;
}

export const Requests = () => {
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetchAllRequests();
    
    // Set up automatic refresh every 30 seconds to catch new approvals
    const intervalId = setInterval(() => {
      console.log('[HR Requests] Auto-refreshing for new requests...');
      fetchAllRequests();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      console.log('[HR Requests] Fetching ALL requests from Faculty...');
      console.log('[HR Requests] Looking for requests with: request_type = "Gate Pass", "Loan", "Leave" from Faculty positions');

      // Fetch ALL requests from Faculty (Program Head, Full Time, Part Time)
      const { data: allRequests, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .in('request_type', ['Gate Pass', 'Loan', 'Leave'])
        .order('created_at', { ascending: false });

      console.log('[HR Requests] All requests:', { allRequests, requestError });
      console.log('[HR Requests] Request types found:', allRequests?.map(r => r.request_type));
      console.log('[HR Requests] Request statuses found:', allRequests?.map(r => r.status));

      if (requestError) {
        console.error('[HR Requests] Error fetching requests:', requestError);
        toast.error('Failed to fetch requests: ' + requestError.message);
        return;
      }

      if (!allRequests || allRequests.length === 0) {
        console.log('[HR Requests] No requests found');
        setRequests([]);
        return;
      }

      // Get user details for each request and filter for Faculty positions
      const requestsWithDetails = [];
      for (const request of allRequests) {
        // Get requester details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, positions, role, profile_picture')
          .eq('id', request.user_id)
          .single();

        // Get dean approver details
        let deanApproverName = 'Unknown';
        if (request.approved_by) {
          const { data: deanData } = await supabase
            .from('users')
            .select('name')
            .eq('id', request.approved_by)
            .single();
          
          if (deanData) {
            deanApproverName = deanData.name;
          }
        }

        // Get second approver details (Guard for Gate Pass, HR for Leave/Loan)
        let secondApproverName = 'Unknown';
        if (request.guard_approved_by) {
          const { data: approverData } = await supabase
            .from('users')
            .select('name')
            .eq('id', request.guard_approved_by)
            .single();
          
          if (approverData) {
            secondApproverName = approverData.name;
          }
        }

        if (!userError && userData) {
          console.log(`[HR Requests] Processing request ${request.id} from user ${userData.name} (${userData.role}, ${userData.positions}) - Request Type: ${request.request_type}, Status: ${request.status}`);
          
          // Only include Faculty members with specific positions
          if (userData.role === 'Faculty' && 
              ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions)) {
            
            console.log(`[HR Requests] Including Faculty request from ${userData.name} (${userData.positions}) - ${request.request_type}`);
            
            requestsWithDetails.push({
              id: request.id,
              name: userData.name,
              type: request.request_type || 'Unknown',
              leave_type: request.leave_type || '',
              reason: request.reason || request.purpose || `${request.request_type} Request`,
              purpose: request.purpose || '',
              destination: request.destination || '',
              time_out: request.time_out || '',
              time_in: request.time_in || '',
              start_date: request.start_date || '',
              end_date: request.end_date || '',
              duration: request.duration || '',
              date_needed: request.date_needed || '',
              date: request.created_at,
              status: request.status,
              requester_position: userData.positions || '',
              approved_by_name: deanApproverName,
              guard_approved_by_name: secondApproverName,
              approved_date: request.approved_date || '',
              guard_approved_date: request.guard_approved_date || '',
              profile_picture: userData.profile_picture,
              // Add approval state fields
              approved_by: request.approved_by,
              guard_approved: request.guard_approved || false,
              guard_approved_by: request.guard_approved_by
            });
          } else {
            console.log(`[HR Requests] Skipping non-Faculty request from ${userData.name} (${userData.role}, ${userData.positions})`);
          }
        } else {
          console.error(`[HR Requests] Error fetching user for request ${request.id}:`, userError);
        }
      }

      console.log('[HR Requests] Final requests with details:', requestsWithDetails);
      console.log('[HR Requests] Request types in final list:', requestsWithDetails.map(r => r.type));
      console.log('[HR Requests] Leave requests found:', requestsWithDetails.filter(r => r.type === 'Leave'));
      
      // Check for new requests and notify
      if (requestsWithDetails.length > lastRequestCount && lastRequestCount > 0) {
        const newRequestsCount = requestsWithDetails.length - lastRequestCount;
        const guardApprovedCount = requestsWithDetails.filter(r => r.status === 'Guard Approved').length;
        
        if (guardApprovedCount > 0) {
          toast.success(
            `🚪 ${newRequestsCount} new gate pass request(s) detected!\n` +
            `${guardApprovedCount} approved by Guard and ready for HR review.`,
            { duration: 6000 }
          );
        } else {
          toast.success(`${newRequestsCount} new gate pass request(s) detected!`);
        }
      }
      
      setRequests(requestsWithDetails);
      setLastRequestCount(requestsWithDetails.length);
      setLastRefresh(new Date());

    } catch (error) {
      console.error('[HR Requests] Error fetching guard-approved requests:', error);
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
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

  // Function to determine the actual status based on approval states and request type
  const getActualStatus = (request: HRRequest) => {
    const isGatePass = request.type === 'Gate Pass';
    const secondApproverLabel = isGatePass ? 'Guard' : 'HR';
    
    // Debug logging for rejected requests
    if (request.status === 'Rejected') {
      console.log(`[HR Requests] Request ${request.id} is REJECTED - Status: ${request.status}, approved_by: ${request.approved_by}`);
      return 'Rejected';
    }
    
    // Check if both dean and second approver have approved
    if (request.approved_by && request.guard_approved && request.guard_approved_by) {
      return `Dean & ${secondApproverLabel} Approved`;
    }
    
    // Check if only second approver has approved (shouldn't happen in normal flow, but handle it)
    if (request.guard_approved && request.guard_approved_by && !request.approved_by) {
      return `${secondApproverLabel} Approved`;
    }
    
    // Check if only dean has approved (and not rejected)
    if (request.approved_by && (!request.guard_approved || !request.guard_approved_by) && request.status !== 'Rejected') {
      console.log(`[HR Requests] Request ${request.id} is Dean Approved - Status: ${request.status}, approved_by: ${request.approved_by}`);
      return 'Dean Approved';
    }
    
    // Check for pending dean approval
    if (request.status === 'Pending Dean Approval') {
      return 'Pending Dean Approval';
    }
    
    // Default to pending
    return 'Pending';
  };

  // Function to get status color based on actual status
  const getStatusColor = (actualStatus: string) => {
    // Fully approved (both dean and second approver) - GREEN
    if (actualStatus.includes('Dean & Guard Approved') || actualStatus.includes('Dean & HR Approved')) {
      return 'bg-green-100 text-green-800';
    }
    // Dean approved only - BLUE
    if (actualStatus === 'Dean Approved') {
      return 'bg-blue-100 text-blue-800';
    }
    // Second approver only (Guard/HR) - TEAL
    if (actualStatus.includes('Guard Approved') || actualStatus.includes('HR Approved')) {
      return 'bg-teal-100 text-teal-800';
    }
    // Pending dean approval - ORANGE
    if (actualStatus === 'Pending Dean Approval') {
      return 'bg-orange-100 text-orange-800';
    }
    // Rejected - RED
    if (actualStatus === 'Rejected') {
      return 'bg-red-100 text-red-800';
    }
    // Pending - YELLOW
    if (actualStatus === 'Pending') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const filteredRequests = requests.filter(req => {
    const actualStatus = getActualStatus(req);
    let matchesFilter = false;
    
    if (activeFilter === "All") {
      matchesFilter = true;
    } else if (activeFilter === "Fully Approved") {
      matchesFilter = actualStatus.includes("Dean & Guard Approved") || actualStatus.includes("Dean & HR Approved");
    } else {
      matchesFilter = actualStatus === activeFilter || req.status === activeFilter;
    }
    
    const matchesSearch = req.name.toLowerCase().includes(search.toLowerCase()) || 
                         req.type.toLowerCase().includes(search.toLowerCase()) ||
                         req.reason.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Faculty Requests Monitor</h1>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">Monitor gate pass, loan, and leave requests from faculty members</p>
              {lastRefresh && (
                <p className="text-sm text-gray-500">
                  Last updated: {formatDateTime(lastRefresh.toISOString())}
                </p>
              )}
            </div>
          </div>

          {/* Modern Controls */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 shadow-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={fetchAllRequests}
              disabled={loading}
              className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </section>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {/* Total Requests */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Total</h2>
                </div>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
                <p className="text-blue-100 text-xs mt-1">All requests</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Pending Requests */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Pending</h2>
                </div>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === "Pending" || r.status === "Pending Dean Approval").length}
                </p>
                <p className="text-yellow-100 text-xs mt-1">
                  {requests.filter(r => r.status === "Pending Dean Approval").length > 0 
                    ? `${requests.filter(r => r.status === "Pending Dean Approval").length} awaiting dean approval`
                    : 'Awaiting review'
                  }
                </p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Dean Approved Requests */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Dean Approved</h2>
                </div>
                <p className="text-2xl font-bold">{requests.filter(r => getActualStatus(r) === "Dean Approved").length}</p>
                <p className="text-blue-100 text-xs mt-1">Dean approved only</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Fully Approved Requests */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.414-4.414a2 2 0 00-2.828 0L7 14.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l11-11a1 1 0 000-1.414z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Fully Approved</h2>
                </div>
                <p className="text-2xl font-bold">{requests.filter(r => {
                  const status = getActualStatus(r);
                  return status.includes("Dean & Guard Approved") || status.includes("Dean & HR Approved");
                }).length}</p>
                <p className="text-green-100 text-xs mt-1">Fully approved</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>

          {/* Rejected Requests */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold">Rejected</h2>
                </div>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === "Rejected").length}</p>
                <p className="text-red-100 text-xs mt-1">Declined requests</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 mb-4">
          {["All", "Pending", "Pending Dean Approval", "Dean Approved", "Fully Approved", "Rejected"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activeFilter === filter
                  ? filter === "All"
                    ? "bg-gray-800 text-white shadow-lg"
                    : filter === "Pending"
                    ? "bg-yellow-500 text-white shadow-lg"
                    : filter === "Pending Dean Approval"
                    ? "bg-orange-500 text-white shadow-lg"
                    : filter === "Dean Approved"
                    ? "bg-blue-500 text-white shadow-lg"
                    : filter === "Fully Approved"
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-red-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Modern Requests Table */}
        <div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Request Records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">ID</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Faculty</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Position</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Request Type</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Details</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Purpose</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Approved By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/80 transition-all duration-200 group">
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="font-medium text-gray-700 text-sm">{req.id}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          {req.profile_picture ? (
                            <img
                              src={req.profile_picture}
                              alt={req.name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-red-200"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">{req.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="font-semibold text-gray-800 text-sm">{req.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {req.requester_position}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.type === 'Gate Pass' ? 'bg-blue-100 text-blue-800' :
                          req.type === 'Loan' ? 'bg-green-100 text-green-800' :
                          req.type === 'Leave' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="text-xs text-gray-600 space-y-1">
                          {req.type === 'Gate Pass' && (
                            <>
                              <div><strong>Destination:</strong> {req.destination || 'Not specified'}</div>
                              <div><strong>Time Out:</strong> {formatDateTime(req.time_out)}</div>
                            </>
                          )}
                          {req.type === 'Leave' && (
                            <>
                              {req.leave_type && <div><strong>Leave Type:</strong> {req.leave_type}</div>}
                              {req.start_date && <div><strong>Start:</strong> {formatDateTime(req.start_date)}</div>}
                              {req.end_date && <div><strong>End:</strong> {formatDateTime(req.end_date)}</div>}
                              {req.duration && <div><strong>Duration:</strong> {req.duration}</div>}
                            </>
                          )}
                          {req.type === 'Loan' && (
                            <>
                              {req.date_needed && <div><strong>Date Needed:</strong> {formatDateTime(req.date_needed)}</div>}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-gray-600 text-sm">
                        {req.purpose || req.reason || 'Not specified'}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        {(() => {
                          const actualStatus = getActualStatus(req);
                          return (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(actualStatus)}`}>
                              {actualStatus}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200">
                        <div className="text-xs text-gray-600">
                          <div>Dean: {req.approved_by_name}</div>
                          <div>{req.type === 'Gate Pass' ? 'Guard' : 'HR'}: {req.guard_approved_by_name}</div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">No Requests Found</h3>
                          <p className="text-gray-500">{loading ? 'Loading requests...' : 'No faculty requests available.'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

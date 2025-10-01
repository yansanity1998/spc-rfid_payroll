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
  // Add loan-specific fields
  amount?: number;
  repayment_terms?: string;
  monthly_deduction?: number;
  total_months?: number;
  period_deduction?: number;
  total_periods?: number;
}

export const Requests = () => {
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<HRRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

      // Fetch ALL requests from Faculty (Program Head, Full Time, Part Time)
      const { data: allRequests, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .in('request_type', ['Gate Pass', 'Loan', 'Leave'])
        .order('created_at', { ascending: false });

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

      // Get all unique user IDs (requesters and approvers) for batch fetching
      const userIds = new Set<number>();
      allRequests.forEach(req => {
        userIds.add(req.user_id);
        if (req.approved_by) userIds.add(req.approved_by);
        if (req.guard_approved_by) userIds.add(req.guard_approved_by);
      });

      // Batch fetch all users at once
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, positions, role, profile_picture')
        .in('id', Array.from(userIds));

      // Create a map for quick user lookup
      const usersMap = new Map();
      usersData?.forEach(user => usersMap.set(user.id, user));

      // Process requests with details
      const requestsWithDetails = [];
      for (const request of allRequests) {
        const userData = usersMap.get(request.user_id);
        
        if (userData && userData.role === 'Faculty' && 
            ['Program Head', 'Full Time', 'Part Time'].includes(userData.positions)) {
          
          const deanApprover = request.approved_by ? usersMap.get(request.approved_by) : null;
          const secondApprover = request.guard_approved_by ? usersMap.get(request.guard_approved_by) : null;
          
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
            approved_by_name: deanApprover?.name || 'Unknown',
            guard_approved_by_name: secondApprover?.name || 'Unknown',
            approved_date: request.approved_date || '',
            guard_approved_date: request.guard_approved_date || '',
            profile_picture: userData.profile_picture,
            // Add approval state fields
            approved_by: request.approved_by,
            guard_approved: request.guard_approved || false,
            guard_approved_by: request.guard_approved_by,
            // Add loan-specific fields
            amount: request.amount || 0,
            repayment_terms: request.repayment_terms || '',
            monthly_deduction: request.monthly_deduction || 0,
            total_months: request.total_months || 0
          });
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

  const handleViewDetails = (request: HRRequest) => {
    setSelectedRequestDetails(request);
    setShowDetailsModal(true);
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
    
    // Default to pending dean approval
    return 'Pending Dean Approval';
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
    // Pending - YELLOW (removed since we now use Pending Dean Approval)
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, search]);

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
                <p className="text-blue-100 text-xs mt-1">
                  {activeFilter === "All" ? "All requests" : `Filtered results`}
                </p>
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
                  {activeFilter === "All" 
                    ? requests.filter(r => getActualStatus(r) === "Pending Dean Approval").length
                    : filteredRequests.filter(r => getActualStatus(r) === "Pending Dean Approval").length
                  }
                </p>
                <p className="text-yellow-100 text-xs mt-1">
                  Awaiting dean approval
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
                <p className="text-2xl font-bold">
                  {activeFilter === "All" 
                    ? requests.filter(r => getActualStatus(r) === "Dean Approved").length
                    : filteredRequests.filter(r => getActualStatus(r) === "Dean Approved").length
                  }
                </p>
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
                <p className="text-2xl font-bold">
                  {activeFilter === "All" 
                    ? requests.filter(r => {
                        const status = getActualStatus(r);
                        return status.includes("Dean & Guard Approved") || status.includes("Dean & HR Approved");
                      }).length
                    : filteredRequests.filter(r => {
                        const status = getActualStatus(r);
                        return status.includes("Dean & Guard Approved") || status.includes("Dean & HR Approved");
                      }).length
                  }
                </p>
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
                <p className="text-2xl font-bold">
                  {activeFilter === "All" 
                    ? requests.filter(r => getActualStatus(r) === "Rejected").length
                    : filteredRequests.filter(r => getActualStatus(r) === "Rejected").length
                  }
                </p>
                <p className="text-red-100 text-xs mt-1">Declined requests</p>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Modern Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 mb-4">
          {["All", "Pending Dean Approval", "Dean Approved", "Fully Approved", "Rejected"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                activeFilter === filter
                  ? filter === "All"
                    ? "bg-gray-800 text-white shadow-lg"
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
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Status</th>
                  <th className="px-3 py-2.5 text-left border-b text-sm font-medium">Approved By</th>
                  <th className="px-3 py-2.5 text-center border-b text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length > 0 ? (
                  paginatedRequests.map((req) => (
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
                          {req.type === 'Gate Pass' && <div>Guard: {req.guard_approved_by_name}</div>}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-gray-200 text-center">
                        <button
                          onClick={() => handleViewDetails(req)}
                          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-1.5 mx-auto"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
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

          {/* Pagination Controls */}
          {filteredRequests.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 flex-shrink-0">
                Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                <span className="font-semibold">{Math.min(endIndex, filteredRequests.length)}</span> of{" "}
                <span className="font-semibold">{filteredRequests.length}</span> requests
              </div>
              <div className="flex items-center justify-center gap-2 flex-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedRequestDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedRequestDetails.profile_picture ? (
                      <img
                        src={selectedRequestDetails.profile_picture}
                        alt={selectedRequestDetails.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-red-200 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center border-2 border-red-200 shadow-md">
                        <span className="text-white font-bold text-lg">
                          {selectedRequestDetails.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedRequestDetails.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full text-sm font-medium">
                          {selectedRequestDetails.requester_position}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                          selectedRequestDetails.type === 'Gate Pass' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                          selectedRequestDetails.type === 'Loan' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                          selectedRequestDetails.type === 'Leave' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' :
                          'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                        }`}>
                          {selectedRequestDetails.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="grid gap-6">
                  {/* Request Status */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Request Status
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(getActualStatus(selectedRequestDetails))}`}>
                        {getActualStatus(selectedRequestDetails)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Submitted: {formatDateTime(selectedRequestDetails.date)}
                      </span>
                    </div>
                  </div>

                  {/* Purpose/Reason */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Purpose/Reason
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedRequestDetails.purpose || selectedRequestDetails.reason || 'Not specified'}
                    </p>
                  </div>

                  {/* Request-Specific Details */}
                  {selectedRequestDetails.type === 'Gate Pass' && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Gate Pass Details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-1">Destination</label>
                          <p className="text-blue-900 bg-white p-3 rounded-lg border border-blue-200">
                            {selectedRequestDetails.destination || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-1">Time Out</label>
                          <p className="text-blue-900 bg-white p-3 rounded-lg border border-blue-200">
                            {formatDateTime(selectedRequestDetails.time_out)}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-blue-700 mb-1">Expected Time In</label>
                          <p className="text-blue-900 bg-white p-3 rounded-lg border border-blue-200">
                            {formatDateTime(selectedRequestDetails.time_in)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedRequestDetails.type === 'Leave' && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1 12a2 2 0 002 2h6a2 2 0 002-2L16 7" />
                        </svg>
                        Leave Details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {selectedRequestDetails.leave_type && (
                          <div>
                            <label className="block text-sm font-semibold text-purple-700 mb-1">Leave Type</label>
                            <p className="text-purple-900 bg-white p-3 rounded-lg border border-purple-200">
                              {selectedRequestDetails.leave_type}
                            </p>
                          </div>
                        )}
                        {selectedRequestDetails.start_date && (
                          <div>
                            <label className="block text-sm font-semibold text-purple-700 mb-1">Start Date</label>
                            <p className="text-purple-900 bg-white p-3 rounded-lg border border-purple-200">
                              {formatDateTime(selectedRequestDetails.start_date)}
                            </p>
                          </div>
                        )}
                        {selectedRequestDetails.end_date && (
                          <div>
                            <label className="block text-sm font-semibold text-purple-700 mb-1">End Date</label>
                            <p className="text-purple-900 bg-white p-3 rounded-lg border border-purple-200">
                              {formatDateTime(selectedRequestDetails.end_date)}
                            </p>
                          </div>
                        )}
                        {selectedRequestDetails.duration && (
                          <div>
                            <label className="block text-sm font-semibold text-purple-700 mb-1">Duration</label>
                            <p className="text-purple-900 bg-white p-3 rounded-lg border border-purple-200">
                              {selectedRequestDetails.duration}
                            </p>
                          </div>
                        )}
                        {selectedRequestDetails.date_needed && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-purple-700 mb-1">Date Needed</label>
                            <p className="text-purple-900 bg-white p-3 rounded-lg border border-purple-200">
                              {formatDateTime(selectedRequestDetails.date_needed)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequestDetails.type === 'Loan' && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Loan Details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-green-700 mb-1">Loan Amount</label>
                          <p className="text-green-900 bg-white p-3 rounded-lg border border-green-200 text-lg font-bold">
                            ₱{selectedRequestDetails.amount?.toLocaleString() || 'Not specified'}
                          </p>
                        </div>
                        {(selectedRequestDetails.total_periods || selectedRequestDetails.total_months) && (
                          <div>
                            <label className="block text-sm font-semibold text-green-700 mb-1">Number of Sessions</label>
                            <p className="text-green-900 bg-white p-3 rounded-lg border border-green-200 text-lg font-bold">
                              {selectedRequestDetails.total_periods || selectedRequestDetails.total_months} sessions
                            </p>
                            <p className="text-xs text-green-600 mt-1">15-day payment cycles</p>
                          </div>
                        )}
                        {selectedRequestDetails.date_needed && (
                          <div>
                            <label className="block text-sm font-semibold text-green-700 mb-1">Date Needed</label>
                            <p className="text-green-900 bg-white p-3 rounded-lg border border-green-200">
                              {formatDateTime(selectedRequestDetails.date_needed)}
                            </p>
                          </div>
                        )}
                        {(selectedRequestDetails.period_deduction || selectedRequestDetails.monthly_deduction) && (
                          <div>
                            <label className="block text-sm font-semibold text-green-700 mb-1">Per Period Deduction</label>
                            <p className="text-green-900 bg-white p-3 rounded-lg border border-green-200 font-semibold">
                              ₱{(selectedRequestDetails.period_deduction || selectedRequestDetails.monthly_deduction)?.toLocaleString()}
                            </p>
                            <p className="text-xs text-green-600 mt-1">Deducted every 15 days</p>
                          </div>
                        )}
                        {selectedRequestDetails.repayment_terms && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-green-700 mb-1">Repayment Terms</label>
                            <p className="text-green-900 bg-white p-3 rounded-lg border border-green-200">
                              {selectedRequestDetails.repayment_terms}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Approval Information */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approval Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Dean Approval</label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">
                          {selectedRequestDetails.approved_by_name || 'Pending'}
                        </p>
                        {selectedRequestDetails.approved_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved: {formatDateTime(selectedRequestDetails.approved_date)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {selectedRequestDetails.type === 'Gate Pass' ? 'Guard Approval' : 'HR Approval'}
                        </label>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">
                          {selectedRequestDetails.guard_approved_by_name || 'Pending'}
                        </p>
                        {selectedRequestDetails.guard_approved_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved: {formatDateTime(selectedRequestDetails.guard_approved_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

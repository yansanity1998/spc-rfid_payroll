// src/components/Faculty/FacClearance.tsx

import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";

export const Clearance = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [clearanceData, setClearanceData] = useState<any>(null);

  useEffect(() => {
    fetchClearanceData();
  }, []);

  const fetchClearanceData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Please log in to view your clearance");
        setLoading(false);
        return;
      }

      // Fetch user data
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        toast.error("Failed to fetch user data");
        setLoading(false);
        return;
      }

      setUserData(userProfile);

      // Fetch clearance record
      const { data: clearance, error: clearanceError } = await supabase
        .from("clearances")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (clearanceError && clearanceError.code !== 'PGRST116') {
        console.error("Error fetching clearance:", clearanceError);
      }

      setClearanceData(clearance || null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const statusBadgeClasses = (status: string | undefined) => {
    const s = String(status || '').toLowerCase();
    if (s === 'cleared') return 'inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-200';
    if (s === 'pending') return 'inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border-2 border-yellow-200';
    if (s === 'on-hold' || s === 'on hold') return 'inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-orange-100 text-orange-800 border-2 border-orange-200';
    return 'inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 border-2 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <Toaster position="top-right" />
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium text-lg">Loading clearance data...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <Toaster position="top-right" />
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Clearance</h1>
              <p className="text-gray-600">View your clearance status and details</p>
            </div>
          </div>
        </section>

        {/* Clearance Status Card */}
        <div className="mb-6">
          <div className={`relative overflow-hidden rounded-xl shadow-lg p-5 ${
            clearanceData?.clearance_status?.toLowerCase() === 'cleared'
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : clearanceData?.clearance_status?.toLowerCase() === 'on-hold' || clearanceData?.clearance_status?.toLowerCase() === 'on hold'
                ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
          }`}>
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white">
                  <p className="text-xs opacity-90 mb-1">Current Status</p>
                  <p className="text-2xl font-bold">{clearanceData?.clearance_status || 'Pending'}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {clearanceData?.clearance_status?.toLowerCase() === 'cleared' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
              </div>
              {clearanceData?.date_cleared && (
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Cleared on: {clearanceData.date_cleared}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clearance Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Personal Information Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Name</label>
                <p className="text-sm font-medium text-gray-800">{userData?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email</label>
                <p className="text-sm font-medium text-gray-800">{userData?.email || '-'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Position</label>
                <p className="text-sm font-medium text-gray-800">
                  {Array.isArray(userData?.positions) ? userData.positions.join(", ") : (userData?.position || userData?.positions || '-')}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Information Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Academic Period</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Term</label>
                <p className="text-sm font-medium text-gray-800">{clearanceData?.term || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">School Year</label>
                <p className="text-sm font-medium text-gray-800">{clearanceData?.school_year || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Date Submitted</label>
                <p className="text-sm font-medium text-gray-800">{clearanceData?.date_submitted || 'Not submitted'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clearance Details Card */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Clearance Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Clearance Status</label>
              <span className={statusBadgeClasses(clearanceData?.clearance_status)}>
                {clearanceData?.clearance_status || 'Pending'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Completion Status</label>
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                clearanceData?.complete_clearance 
                  ? 'bg-green-100 text-green-800 border-2 border-green-200' 
                  : 'bg-gray-100 text-gray-800 border-2 border-gray-200'
              }`}>
                {clearanceData?.complete_clearance ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Remarks</label>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <p className="text-sm text-gray-800">{clearanceData?.clearance_remarks || 'No remarks provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* No Clearance Message */}
        {!clearanceData && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Clearance Record Found</h3>
            <p className="text-gray-600">Your clearance record has not been created yet. Please contact the HR department for assistance.</p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={fetchClearanceData}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </main>
    </div>
  );
};

import { useState } from "react";
import supabase from "../../utils/supabase";

const GuardScanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScannedUser, setLastScannedUser] = useState<any>(null);
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success' as 'success' | 'error' | 'info',
    title: '',
    message: '',
    userName: '',
    userRole: '',
    profilePicture: '',
    time: '',
    action: ''
  });

  // Function to show modern alert
  const showModernAlert = (
    type: 'success' | 'error' | 'info', 
    title: string, 
    message: string, 
    userName: string = '', 
    userRole: string = '',
    profilePicture: string = '',
    action: string = ''
  ) => {
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    setAlertData({
      type,
      title,
      message,
      userName,
      userRole,
      profilePicture,
      time: currentTime,
      action
    });
    setShowAlert(true);
    
    // Auto-close after 4 seconds
    setTimeout(() => setShowAlert(false), 4000);
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 1. Check if user exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, role, profile_picture")
        .eq("id", cardId)
        .single();

      if (userError || !user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', '', '', 'error');
        setLoading(false);
        return;
      }

      setLastScannedUser(user);

      // 2. Check if user has attendance record for today
      const { data: existing, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", cardId)
        .eq("att_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // First scan (Time In)
        const { error: insertError } = await supabase
          .from("attendance")
          .insert([
            {
              user_id: cardId,
              att_date: today,
              time_in: new Date().toISOString(),
              attendance: true,
            },
          ]);

        if (insertError) throw insertError;

        showModernAlert('success', 'Time In Successful', 'Welcome! Your attendance has been recorded.', user.name, user.role, user.profile_picture, 'time_in');
      } else if (!existing.time_out) {
        // Second scan (Time Out)
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: new Date().toISOString(),
            attendance: false,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;

        showModernAlert('error', 'Time Out Successful', 'Goodbye! Your departure has been recorded.', user.name, user.role, user.profile_picture, 'time_out');
      } else {
        showModernAlert('info', 'Already Completed', `${user.name} already completed attendance for today.`, user.name, user.role, user.profile_picture, 'completed');
      }
    } catch (err: any) {
      console.error(err);
      showModernAlert('error', 'System Error', 'Unable to record attendance. Please try again.', '', '', '', 'error');
    } finally {
      setLoading(false);
      setScannedCard("");
    }
  };

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl min-h-[90vh]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">RFID Attendance Scanner</h1>
              <p className="text-gray-600">Tap your RFID card to record attendance</p>
            </div>
          </div>
        </div>

        {/* Scanner Interface */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Hidden Input for RFID */}
          <input
            autoFocus
            type="text"
            value={scannedCard}
            onChange={(e) => setScannedCard(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && scannedCard.trim() !== "") {
                handleScan(scannedCard.trim());
              }
            }}
            className="opacity-0 absolute -left-96"
            placeholder="RFID Scanner Input"
          />

          {/* Scanner Visual */}
          <div className="relative mb-8">
            <div className="w-64 h-64 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-48 h-48 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <div className="w-32 h-32 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Scanning Animation */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 border-4 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-semibold text-teal-600">Processing...</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-2">Ready to Scan</p>
                <p className="text-gray-500">Please tap your RFID card on the scanner</p>
              </div>
            )}
          </div>

          {/* Last Scanned User Info */}
          {lastScannedUser && !loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 max-w-md w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {lastScannedUser.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{lastScannedUser.name}</p>
                  <p className="text-sm text-gray-500">{lastScannedUser.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Back to Dashboard Button */}
          <a
            href="/Guard/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
        </div>

        {/* Modern Alert Modal */}
        {showAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAlert(false)}
            />
            
            {/* Alert Modal */}
            <div className={`relative bg-white/95 backdrop-blur-xl border-2 shadow-2xl rounded-3xl p-8 max-w-lg w-full mx-4 transform transition-all duration-500 ease-out ${
              showAlert ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            } ${
              alertData.type === 'success' 
                ? 'border-teal-400 bg-gradient-to-br from-teal-50/90 to-cyan-50/90' 
                : (alertData.type === 'error' && alertData.action === 'time_out')
                  ? 'border-teal-400 bg-gradient-to-br from-teal-50/90 to-cyan-50/90'
                  : alertData.type === 'error' 
                    ? 'border-red-400 bg-gradient-to-br from-red-50/90 to-rose-50/90'
                    : 'border-blue-400 bg-gradient-to-br from-blue-50/90 to-sky-50/90'
            }`}>
              
              {/* Close Button */}
              <button
                onClick={() => setShowAlert(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/70 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modern Profile Card */}
              <div className="flex flex-col items-center text-center mb-6">
                {/* Profile Picture Section */}
                <div className="relative mb-6">
                  {/* Profile Picture or Avatar - BIGGER SIZE */}
                  <div className="relative">
                    {alertData.profilePicture ? (
                      <img
                        src={alertData.profilePicture}
                        alt={alertData.userName}
                        className="w-48 h-48 rounded-full object-cover border-6 border-white shadow-2xl ring-4 ring-teal-200/50"
                        onError={(e) => {
                          // Fallback to avatar if image fails to load
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback Avatar - BIGGER SIZE */}
                    <div 
                      className={`w-48 h-48 rounded-full flex items-center justify-center border-6 border-white shadow-2xl ring-4 ring-teal-200/50 ${
                        !alertData.profilePicture ? 'flex' : 'hidden'
                      } ${
                        alertData.type === 'success' 
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-600' 
                          : (alertData.type === 'error' && alertData.action === 'time_out')
                            ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
                            : alertData.type === 'error' 
                              ? 'bg-gradient-to-br from-red-500 to-rose-600'
                              : 'bg-gradient-to-br from-blue-500 to-sky-600'
                      }`}
                    >
                      {alertData.userName ? (
                        <span className="text-6xl font-bold text-white drop-shadow-lg">
                          {alertData.userName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <svg className="w-24 h-24 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Status Badge - BIGGER SIZE */}
                  <div className={`absolute -bottom-3 -right-3 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-lg ${
                    alertData.type === 'success' 
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-600' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
                        : alertData.type === 'error' 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600'
                          : 'bg-gradient-to-br from-blue-500 to-sky-600'
                  } animate-pulse`}>
                    {alertData.type === 'success' ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    ) : (alertData.type === 'error' && alertData.action === 'time_out') ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    ) : alertData.type === 'error' ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Alert Title */}
                <h3 className={`text-3xl font-bold mb-2 ${
                  alertData.type === 'success' 
                    ? 'text-teal-800' 
                    : (alertData.type === 'error' && alertData.action === 'time_out')
                      ? 'text-teal-800'
                      : alertData.type === 'error' 
                        ? 'text-red-800'
                        : 'text-blue-800'
                }`}>
                  {alertData.title}
                </h3>
                
                {/* Unique Guard-Style User Information Card */}
                {alertData.userName && (
                  <div className="relative mb-6">
                    {/* Main Name Display with Unique Guard Design */}
                    <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 rounded-3xl px-10 py-6 mb-3 shadow-2xl border-2 border-teal-300/50 transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <p className="text-3xl font-black text-white tracking-wide drop-shadow-lg text-center">
                          {alertData.userName.toUpperCase()}
                        </p>
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Role Badge with Security Theme */}
                    {alertData.userRole && (
                      <div className="flex justify-center">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-full px-6 py-2 border-2 border-teal-400/30 shadow-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-sm font-bold text-teal-100 uppercase tracking-widest">
                              {alertData.userRole}
                            </span>
                            <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Alert Message */}
                <p className="text-gray-700 text-xl mb-6 leading-relaxed font-medium">
                  {alertData.message}
                </p>
                
                {/* Time Display */}
                <div className="flex items-center gap-3 text-gray-600 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{alertData.time}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAlert(false)}
                  className={`px-8 py-3 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                    alertData.type === 'success' 
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700' 
                      : (alertData.type === 'error' && alertData.action === 'time_out')
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700'
                        : alertData.type === 'error' 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                          : 'bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GuardScanner;

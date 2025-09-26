import { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import { titlelogo, spc1, spc2, spc3, spc4 } from "../../utils";
import { Link } from "react-router-dom";

const Scanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Modern Alert Modal State
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    type: 'success', // 'success', 'error', 'info'
    title: '',
    message: '',
    userName: '',
    time: '',
    action: '' // 'time_in', 'time_out', 'error'
  });

  const carouselImages = [
    { src: spc1, alt: "SPC Image 1" },
    { src: spc2, alt: "SPC Image 2" },
    { src: spc3, alt: "SPC Image 3" },
    { src: spc4, alt: "SPC Image 4" },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  // Auto-close alert after 4 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  // Function to show modern alert
  const showModernAlert = (type: 'success' | 'error' | 'info', title: string, message: string, userName: string = '', action: string = '') => {
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
      time: currentTime,
      action
    });
    setShowAlert(true);
  };

  const handleScan = async (cardId: string) => {
    setLoading(true);
    setMessage("");

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // 🔍 Step 1: Find user with this cardId in users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name") // only fetch what you need
        .eq("id", cardId)   // if RFID = users.id
        .maybeSingle();

      if (userError) throw userError;
      if (!user) {
        showModernAlert('error', 'Card Not Found', `No user found for card ${cardId}`, '', 'error');
        return;
      }

      // 🔍 Step 2: Check if user already has attendance today
      const { data: existing, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("att_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // ✅ First scan of the day → Time In
        const { error: insertError } = await supabase.from("attendance").insert([
          {
            user_id: user.id,
            att_date: today,
            time_in: new Date().toISOString(),
            status: true,
          },
        ]);

        if (insertError) throw insertError;
        showModernAlert('success', 'Time In Successful', 'Welcome! Your attendance has been recorded.', user.name ?? user.id, 'time_in');
      } else if (!existing.time_out) {
        // ✅ Currently timed in → Time Out
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_out: new Date().toISOString(),
            status: false,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        showModernAlert('error', 'Time Out Successful', 'Goodbye! Your departure has been recorded.', user.name ?? user.id, 'time_out');
      } else {
        // ✅ Currently timed out → Time In again (allows multiple in/out per day)
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            time_in: new Date().toISOString(),
            time_out: null, // Clear previous time_out
            status: true,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        showModernAlert('success', 'Time In Successful', 'Welcome back! Your return has been recorded.', user.name ?? user.id, 'time_in');
      }
    } catch (err: any) {
      console.error(err);
      showModernAlert('error', 'System Error', 'Unable to record attendance. Please try again.', '', 'error');
    } finally {
      setLoading(false);
      setScannedCard(""); // clear input for next scan
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      
      {/* Header - Absolute positioned over carousel */}
      <header className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center p-6 lg:p-8">
        {/* Logo and System Text - Upper Left */}
        <div className="flex items-center gap-4">
          <img 
            src={titlelogo} 
            alt="SPC Logo" 
            className="h-12 lg:h-16 w-auto drop-shadow-2xl"
          />
          <div className="text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
              SPC RFID & PAYROLL
            </h1>
            <p className="text-sm lg:text-base text-white/90 font-medium drop-shadow-md">
              Attendance Scanner
            </p>
          </div>
        </div>

        {/* Back Button - Upper Right */}
        <Link
          to="/"
          className="group relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:bg-white/20 hover:scale-105 shadow-lg"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </span>
          <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Link>
      </header>

      {/* Full Screen Carousel Background */}
      <div className="relative z-10 flex flex-col h-screen">
        <div className="relative w-full h-full">
          <div className="relative w-full h-full overflow-hidden">
            {/* Carousel Images */}
            <div className="relative w-full h-full">
              {carouselImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentSlide 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover object-center select-none"
                    style={{
                      imageRendering: 'auto',
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Interface - Centered Overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl max-w-md w-full mx-4">
          {/* Scanner Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">RFID Scanner</h2>
            <p className="text-white/70">Attendance Management System</p>
          </div>

          {/* Scanner Status */}
          <div className="text-center mb-8">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-white font-medium text-lg">Processing scan...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-white/50 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 bg-white/70 rounded-full"></div>
                </div>
                <p className="text-white font-medium text-lg">Ready to scan RFID card</p>
                <p className="text-white/60 text-sm">Tap your card or enter ID manually</p>
              </div>
            )}
          </div>

          {/* Hidden Input for RFID Scanner */}
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
            className="opacity-0 absolute -left-96 pointer-events-none"
            placeholder="RFID will be scanned here"
          />

          {/* Manual Input Option */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-2 text-white font-medium">Manual Entry (Optional)</label>
              <input
                type="text"
                value={scannedCard}
                onChange={(e) => setScannedCard(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scannedCard.trim() !== "") {
                    handleScan(scannedCard.trim());
                  }
                }}
                className="w-full h-12 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter card ID manually"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={() => {
                if (scannedCard.trim() !== "") {
                  handleScan(scannedCard.trim());
                }
              }}
              disabled={loading || !scannedCard.trim()}
              className="w-full h-12 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "Processing..." : "Scan Attendance"}
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
              <p className="text-white text-center font-medium">{message}</p>
            </div>
          )}
        </div>
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
              ? 'border-green-400 bg-gradient-to-br from-green-50/90 to-emerald-50/90' 
              : (alertData.type === 'error' && alertData.action === 'time_out')
                ? 'border-red-400 bg-gradient-to-br from-red-50/90 to-rose-50/90'
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

            {/* Alert Icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                alertData.type === 'success' 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                  : (alertData.type === 'error' && alertData.action === 'time_out')
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : alertData.type === 'error' 
                      ? 'bg-gradient-to-br from-red-500 to-rose-600'
                      : 'bg-gradient-to-br from-blue-500 to-sky-600'
              } shadow-lg animate-pulse`}>
                {alertData.type === 'success' ? (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                ) : (alertData.type === 'error' && alertData.action === 'time_out') ? (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                ) : alertData.type === 'error' ? (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              {/* Alert Title */}
              <h3 className={`text-2xl font-bold mb-2 ${
                alertData.type === 'success' 
                  ? 'text-green-800' 
                  : (alertData.type === 'error' && alertData.action === 'time_out')
                    ? 'text-red-800'
                    : alertData.type === 'error' 
                      ? 'text-red-800'
                      : 'text-blue-800'
              }`}>
                {alertData.title}
              </h3>
              
              {/* User Name */}
              {alertData.userName && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 mb-4 border border-white/40">
                  <p className="text-lg font-semibold text-gray-800">{alertData.userName}</p>
                </div>
              )}
              
              {/* Alert Message */}
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                {alertData.message}
              </p>
              
              {/* Time Display */}
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{alertData.time}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowAlert(false)}
                className={`px-8 py-3 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                  alertData.type === 'success' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                    : (alertData.type === 'error' && alertData.action === 'time_out')
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
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
    </div>
  );
};

export default Scanner;

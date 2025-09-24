import { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";
import { titlelogo, spc1, spc2, spc3, spc4 } from "../../utils";
import { Link } from "react-router-dom";

const Scanner = () => {
  const [scannedCard, setScannedCard] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
        toast.error(`❌ No user found for card ${cardId}`);
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
        toast.success(`✅ Time In recorded for ${user.name ?? user.id}`);
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
        toast.success(`✅ Time Out recorded for ${user.name ?? user.id}`);
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
        toast.success(`✅ Time In recorded again for ${user.name ?? user.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Error recording attendance");
    } finally {
      setLoading(false);
      setScannedCard(""); // clear input for next scan
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      
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
    </div>
  );
};

export default Scanner;

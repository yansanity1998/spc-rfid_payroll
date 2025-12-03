import { useState, useEffect } from "react";
import { titlelogo, spc1, spc2, spc3, spc4 } from "../utils";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../utils/supabase";
import toast, { Toaster } from "react-hot-toast";

// Modern Login Form Component
const ModernLoginForm = ({ onClose }: { onClose: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState("password");
  const [eye, setEye] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      toast.error("User not found.");
      setLoading(false);
      return;
    }

    let userRole: string | null = null;
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("role, status")
      .eq("auth_id", userId)
      .single();

    if (!userError && userProfile?.role) {
      // Check if user account is active
      if (userProfile.status !== "Active") {
        toast.error("Your account has been deactivated. Please contact an administrator.");
        setLoading(false);
        return;
      }
      userRole = userProfile.role;
    } else {
      const { data: roleProfile, error: roleError } = await supabase
        .from("roles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!roleError && roleProfile?.role) {
        // Check user status in users table before allowing login
        const { data: userStatus, error: statusError } = await supabase
          .from("users")
          .select("status")
          .eq("auth_id", userId)
          .single();
          
        if (!statusError && userStatus && userStatus.status !== "Active") {
          toast.error("Your account has been deactivated. Please contact an administrator.");
          setLoading(false);
          return;
        }
        userRole = roleProfile.role;
      }
    }

    if (!userRole) {
      toast.error("Role not assigned. Contact admin.");
      setLoading(false);
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.session));
    localStorage.setItem("role", userRole);

    onClose();
    switch (userRole) {
      case "HR Personnel":
        navigate("/HR/dashboard");
        break;
      case "Accounting":
        navigate("/accounting/dashboard");
        break;
      case "Administrator":
        navigate("/hrAdmin/dashboard");
        break;
      case "Faculty":
        navigate("/Faculty/dashboard");
        break;
      case "Guard":
        navigate("/Guard/dashboard");
        break;
      case "Staff":
        navigate("/Staff/dashboard");
        break;
      case "SA":
        navigate("/SA/dashboard");
        break;
      case "ACAF":
        navigate("/ACAF/dashboard");
        break;
      default:
        toast.error("Role not assigned. Contact admin.");
    }
    setLoading(false);
  };

  const handleShow = () => {
    setEye((prev) => !prev);
    setType((prev) => (prev === "password" ? "text" : "password"));
  };

  return (
    <div className="w-full">
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-white/70">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="mb-2 text-white font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
              placeholder="Enter your email"
              autoComplete="off"
              required
            />
          </div>
          
          <div className="flex flex-col">
            <label className="mb-2 text-white font-medium">Password</label>
            <div className="relative">
              <input
                type={type}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter your password"
                autoComplete="off"
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                onClick={handleShow}
              >
                {eye ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Signing in...
            </div>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            className="text-white/70 hover:text-white text-sm underline transition-colors"
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </div>
  );
};

export const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
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
    }, 3000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showLoginModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLoginModal]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
      {/* Navigation Header */}
      <header className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and System Text */}
            <div className="flex items-center gap-4">
              <img 
                src={titlelogo} 
                alt="SPC Logo" 
                className="h-12 w-auto drop-shadow-lg"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  SPC RFID & PAYROLL
                </h1>
                <p className="text-sm text-white/80 font-medium">
                  Management System
                </p>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Background Carousel */}
        <div className="absolute inset-0 overflow-hidden">
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-30' : 'opacity-0'
              }`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-red-900/60 to-slate-900/80"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="bg-red-600/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold border border-red-500/30">
                St. Peter's College Official System
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Integrated RFID Attendance
              <span className="block text-red-400">& Payroll Management</span>
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              St. Peter's College's comprehensive workforce management solution featuring contactless RFID attendance, automated payroll processing with penalty calculations, and real-time schedule monitoring for Faculty, Staff, and Student Assistants.
            </p>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-400 mb-1">Dual Session</div>
                <div className="text-white/80 text-sm">Morning & Afternoon Tracking</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-400 mb-1">15-Min Grace</div>
                <div className="text-white/80 text-sm">Penalty-Free Buffer Period</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-400 mb-1">Auto Penalty</div>
                <div className="text-white/80 text-sm">₱1/min Late, ₱240 Absent</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                to="/scanner"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Tap Your RFID Card
              </Link>
              <Link
                to="/schedule-scanner"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Class Attendance
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-3">System Capabilities</h3>
            <p className="text-white/70">Comprehensive workforce management for St. Peter's College</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dual Session Tracking */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-red-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dual Session Tracking</h3>
              <p className="text-white/80">Separate morning (7AM-12PM) and afternoon (1PM-7PM) attendance records with 15-minute grace period.</p>
            </div>

            {/* Smart Penalty System */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-orange-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Penalty System</h3>
              <p className="text-white/80">Automated deductions: ₱1/minute for tardiness, ₱240 for absences.</p>
            </div>

            {/* Class Schedule Integration */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Class Schedule Integration</h3>
              <p className="text-white/80">Faculty class schedules with subject-specific attendance tracking and missing class detection.</p>
            </div>

            {/* Payroll Automation */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Payroll Automation</h3>
              <p className="text-white/80">Integrated payroll with automatic penalty calculations from both regular and class attendance.</p>
            </div>

            {/* Loan Management */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Loan Management</h3>
              <p className="text-white/80">Flexible loan system with customizable periods and automatic payroll deductions.</p>
            </div>

            {/* Request System */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request System</h3>
              <p className="text-white/80">Submit and track leave requests, schedule changes, and other administrative requests with approval workflow.</p>
            </div>
          </div>
        </div>
      </main>


      {/* Role-Based Access Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-white mb-4">Dedicated Portals for Every Role</h3>
          <p className="text-white/80 text-lg">Customized dashboards with role-specific features and permissions</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Administrator */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">Administrator</h4>
          </div>

          {/* HR Personnel */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">HR Personnel</h4>
          </div>

          {/* Accounting */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">Accounting</h4>
          </div>

          {/* Faculty */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">Faculty</h4>
          </div>

          {/* Staff */}
          <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">Staff</h4>
          </div>

          {/* SA & Guard */}
          <div className="bg-gradient-to-br from-yellow-600 to-teal-600 rounded-xl p-4 text-center hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="text-white font-bold text-sm">SA & Guard</h4>
          </div>
        </div>
      </section>

      {/* Quick Access Footer */}
      <footer className="relative z-10 bg-white/5 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center">
              <h4 className="text-white font-bold text-lg mb-2">🔖 RFID Attendance Stations</h4>
              <p className="text-white/70">Morning: 7:00-7:15 AM (Grace) | Afternoon: 1:00-1:15 PM (Grace)</p>
              <p className="text-white/60 text-sm mt-1">Tap your card at entrance/exit points</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              © 2025 St. Peter's College - RFID & Payroll Management System | For assistance, contact HR or IT Department
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative max-w-md w-full my-8">
            <button
              onClick={() => setShowLoginModal(false)}
              className="sticky top-0 -mb-8 ml-auto block -mr-2 sm:-mr-4 z-10 bg-red-900 text-white p-2 sm:p-3 rounded-full hover:bg-red-800 transition-colors shadow-2xl"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl">
              <ModernLoginForm onClose={() => setShowLoginModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

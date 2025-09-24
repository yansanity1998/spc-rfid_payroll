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
      .select("role")
      .eq("auth_id", userId)
      .single();

    if (!userError && userProfile?.role) {
      userRole = userProfile.role;
    } else {
      const { data: roleProfile, error: roleError } = await supabase
        .from("roles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!roleError && roleProfile?.role) {
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
        navigate("/hrPersonnel/dashboard");
        break;
      case "Accounting":
        navigate("/accounting/payroll");
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

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="mb-2 text-white font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
              placeholder="Enter your email"
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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header - Absolute positioned over carousel */}
      <header className="absolute top-0 left-0 right-0 z-30 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 lg:p-8 gap-3 sm:gap-0">
        {/* Logo and System Text - Upper Left */}
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <img 
            src={titlelogo} 
            alt="SPC Logo" 
            className="h-8 sm:h-10 md:h-12 lg:h-16 w-auto drop-shadow-2xl flex-shrink-0"
          />
          <div className="text-left min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg leading-tight">
              SPC RFID & PAYROLL
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-white/90 font-medium drop-shadow-md leading-tight">
              Management System
            </p>
          </div>
        </div>

        {/* Login Button - Upper Right */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="group relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold transition-all duration-300 hover:bg-white/20 hover:scale-105 shadow-lg text-sm sm:text-base w-full sm:w-auto"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Login
          </span>
          <div className="absolute inset-0 bg-red-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </header>

      {/* Main Content - Full Screen Carousel */}
      <main className="relative z-10 flex flex-col h-screen pt-20 sm:pt-0">
        {/* Carousel - Full Screen */}
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
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              ))}
            </div>

            {/* Carousel Controls */}
            <button
              onClick={prevSlide}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md border border-white/30 text-white p-2 sm:p-3 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md border border-white/30 text-white p-2 sm:p-3 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Carousel Indicators */}
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-white scale-125' 
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>


      {/* Footer with Scanner */}
      <footer className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-30">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-4">
          <div className="text-center sm:text-right order-2 sm:order-1">
            <p className="text-white/80 font-medium text-sm sm:text-lg mb-1 animate-pulse">
              Ready to Scan?
            </p>
            <p className="text-white/60 text-xs sm:text-sm">
              Quick access RFID
            </p>
          </div>
          <Link
            to="/scanner"
            className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg transition-all duration-300 hover:scale-105 shadow-2xl w-full sm:w-auto order-1 sm:order-2"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scanner
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 z-10 bg-red-900 text-white p-2 sm:p-3 rounded-full hover:bg-red-800 transition-colors shadow-2xl"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <ModernLoginForm onClose={() => setShowLoginModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

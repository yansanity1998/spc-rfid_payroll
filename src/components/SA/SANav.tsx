// src/components/SA/SANav.tsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { spclogo } from "../../utils";
import supabase from "../../utils/supabase";
import { useState, useEffect } from "react";

export const SANav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const menu = [
    { key: "dashboard", label: "Dashboard", link: "/SA/dashboard" },
    { key: "attendance", label: "Attendance", link: "/SA/attendance" },
    { key: "events", label: "Events & Activities", link: "/SA/events" },
    { key: "request", label: "Request", link: "/SA/request" },
    { key: "reports", label: "Reports", link: "/SA/reports" },
  ];

  const getMenuIcon = (key: string) => {
    const iconClass = "w-5 h-5";
    switch (key) {
      case "dashboard":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
          </svg>
        );
      case "attendance":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "students":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case "events":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "request":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "reports":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <div
        className="lg:hidden border border-gray-500/40 bg-white p-1 rounded-full fixed top-4 left-4 z-50"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <button className="relative w-5 h-5 flex flex-col justify-between items-center p-1">
          <span
            className={`block h-0.5 w-full bg-gray-800 transform transition-all duration-300 ease-in-out
              ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          ></span>
          <span
            className={`block h-0.5 w-full bg-gray-800 transition-all duration-300 ease-in-out
              ${menuOpen ? "opacity-0" : ""}`}
          ></span>
          <span
            className={`block h-0.5 w-full bg-gray-800 transform transition-all duration-300 ease-in-out
              ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          ></span>
        </button>
      </div>

      {/* Sidebar (desktop) */}
      <div className="hidden lg:flex w-70 min-h-screen fixed left-0 top-0 pr-2 py-6 flex-col justify-between bg-gradient-to-b from-red-900 via-red-800 to-red-900 shadow-2xl z-30">
        <div>
          {/* Modern Logo Section */}
          <div className="flex flex-col items-center justify-center px-4 py-6 mb-6">
            <div className="bg-white backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-2 mb-2">
              <img src={spclogo} alt="SPC Logo" className="h-12 w-auto drop-shadow-lg" />
            </div>
            <h2 className="text-white font-bold text-xl tracking-wide whitespace-nowrap mb-1">Student Affairs</h2>
            {userEmail && <p className="text-white/70 text-xs font-medium">{userEmail}</p>}
          </div>
          
          {/* Modern Navigation */}
          <nav className="flex flex-col px-4 space-y-2">
            {menu.map((item) => (
              <Link
                key={item.key}
                to={item.link}
                className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
                  location.pathname === item.link
                    ? "bg-white/20 border-white/30 text-white shadow-lg scale-[1.02]"
                    : "bg-white/5 border-white/10 text-white/90 hover:text-white hover:bg-white/20"
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  {getMenuIcon(item.key)}
                  {item.label}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Modern Logout Section */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="group relative overflow-hidden w-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-red-700 shadow-xl cursor-pointer px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] font-semibold"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </span>
            <div className="absolute inset-0 bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>

      {/* Sidebar (mobile overlay) */}
      {menuOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-40 lg:hidden">
          <div className="fixed top-0 left-0 w-72 h-full bg-gradient-to-b from-red-900 via-red-800 to-red-900 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Mobile Logo Section */}
              <div className="flex flex-col items-center justify-center px-4 py-6 mb-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2 mb-2">
                  <img src={spclogo} alt="SPC Logo" className="h-10 w-auto drop-shadow-lg" />
                </div>
                <h2 className="text-white font-bold text-lg tracking-wide whitespace-nowrap mb-1">Student Affairs</h2>
                {userEmail && <p className="text-white/70 text-xs font-medium">{userEmail}</p>}
              </div>
              
              {/* Mobile Navigation */}
              <nav className="flex flex-col px-4 space-y-2">
                {menu.map((item) => (
                  <Link
                    key={item.key}
                    to={item.link}
                    onClick={() => setMenuOpen(false)} // close menu after navigation
                    className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
                      location.pathname === item.link
                        ? "bg-white/20 border-white/30 text-white shadow-lg scale-[1.02]"
                        : "bg-white/5 border-white/10 text-white/90 hover:text-white hover:bg-white/20"
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      {getMenuIcon(item.key)}
                      {item.label}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* Mobile Logout Section */}
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="group relative overflow-hidden w-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-red-700 shadow-xl cursor-pointer px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] font-semibold"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </span>
                <div className="absolute inset-0 bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

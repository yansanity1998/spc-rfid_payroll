// src/components/Staff/StaffNav.tsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "../../utils/supabase";
import { useState, useEffect } from "react";
import { Settings } from "../Settings/Settings";

export const StaffNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userProfilePicture, setUserProfilePicture] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userPosition, setUserPosition] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        
        // Fetch user profile data from users table in background
        supabase
          .from('users')
          .select('profile_picture, name, positions')
          .eq('auth_id', user.id)
          .single()
          .then(({ data: userData, error }) => {
            if (userData && !error) {
              setUserProfilePicture(userData.profile_picture || '');
              setUserName(userData.name || '');
              setUserPosition(userData.positions || '');
            }
          });
      }
    };
    getUser();
  }, []);

  const menu = [
    { key: "dashboard", label: "Dashboard", link: "/Staff/dashboard" },
    { key: "attendance", label: "Attendance", link: "/Staff/attendance" },
    { key: "schedule", label: "Schedule", link: "/Staff/schedule" },
    { key: "payroll", label: "Payroll", link: "/Staff/payroll" },
    { key: "reports", label: "Reports", link: "/Staff/reports" },
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
      case "schedule":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "payroll":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "reports":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

  const handleProfileClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleProfileUpdate = (updatedData: { name: string; profile_picture: string }) => {
    setUserName(updatedData.name);
    setUserProfilePicture(updatedData.profile_picture);
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
          {/* Modern Profile Section */}
          <div className="flex flex-col items-center justify-center px-4 py-6 mb-6">
            <div className="relative mb-4">
              <button
                onClick={handleProfileClick}
                className="relative group focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-red-900 rounded-full"
              >
                {userProfilePicture ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/30 shadow-xl group-hover:ring-red-400/50 transition-all duration-300">
                    <img 
                      src={userProfilePicture} 
                      alt="Profile Picture" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center ring-4 ring-white/30 shadow-xl group-hover:ring-red-400/50 group-hover:scale-105 transition-all duration-300">
                    <span className="text-white text-2xl font-bold">
                      {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
            </div>
            <h2 className="text-white font-bold text-xl tracking-wide whitespace-nowrap mb-1">
              Staff{userPosition && ` (${userPosition})`}
            </h2>
            <p className="text-white/90 text-sm font-medium mb-1">{userName || 'User'}</p>
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
              {/* Mobile Profile Section */}
              <div className="flex flex-col items-center justify-center px-4 py-6 mb-4">
                <div className="relative mb-3">
                  <button
                    onClick={handleProfileClick}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-red-900 rounded-full"
                  >
                    {userProfilePicture ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-3 ring-white/30 shadow-xl group-hover:ring-red-400/50 transition-all duration-300">
                        <img 
                          src={userProfilePicture} 
                          alt="Profile Picture" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center ring-3 ring-white/30 shadow-xl group-hover:ring-red-400/50 group-hover:scale-105 transition-all duration-300">
                        <span className="text-white text-xl font-bold">
                          {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>
                </div>
                <h2 className="text-white font-bold text-lg tracking-wide whitespace-nowrap mb-1">
                  Staff{userPosition && ` (${userPosition})`}
                </h2>
                <p className="text-white/90 text-sm font-medium mb-1">{userName || 'User'}</p>
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

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
        onUpdate={handleProfileUpdate}
      />
    </>
  );
};

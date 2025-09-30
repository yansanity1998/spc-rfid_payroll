// src/components/NavGuard.tsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "../../utils/supabase";
import { useState, useEffect } from "react";
import { Settings } from "../Settings/Settings";

export const NavGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userProfilePicture, setUserProfilePicture] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        
        // Fetch user profile data from users table in background
        supabase
          .from('users')
          .select('profile_picture, name, role, auth_id')
          .eq('auth_id', user.id)
          .single()
          .then(({ data: userData, error }) => {
            if (userData && !error) {
              setUserProfilePicture(userData.profile_picture || '');
              setUserName(userData.name || '');
            } else {
              // If not found by auth_id, try by email
              supabase
                .from('users')
                .select('profile_picture, name, role, auth_id')
                .eq('email', user.email)
                .single()
                .then(({ data: userByEmail, error: emailError }) => {
                  if (userByEmail && !emailError) {
                    setUserProfilePicture(userByEmail.profile_picture || '');
                    setUserName(userByEmail.name || '');
                    
                    // Update auth_id if it doesn't match
                    if (userByEmail.auth_id !== user.id) {
                      supabase
                        .from('users')
                        .update({ auth_id: user.id })
                        .eq('email', user.email);
                    }
                  }
                });
            }
          });
      }
    };
    getUser();
  }, []);

  const menu = [
    { key: "dashboard", label: "Dashboard", link: "Guard/dashboard" },
    { key: "scanner", label: "RFID Scanner", link: "Guard/scanner" },
    { key: "approvals", label: "Gate Pass Monitor", link: "Guard/approvals" },
    { key: "reports", label: "Reports", link: "Guard/reports" },
  ];

  const getMenuIcon = (key: string) => {
    const iconClass = "w-5 h-5";
    switch (key) {
      case "dashboard":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "scanner":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
          </svg>
        );
      case "approvals":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      <div className="hidden lg:flex w-70 min-h-screen fixed left-0 top-0 pr-2 py-6 flex-col justify-between bg-red-900 shadow-2xl z-30">
        <div>
          {/* Modern Profile Section - Picture and Role Only */}
          <div className="flex flex-col items-center justify-center px-4 py-4 mb-4">
            <div className="relative">
              <div className="relative">
                {userProfilePicture ? (
                  <img 
                    src={userProfilePicture} 
                    alt="Profile" 
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-white/30 shadow-xl" 
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-white/30 shadow-xl">
                    {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-white text-lg font-bold">Security Guard</p>
            </div>
          </div>
          
          {/* Modern Navigation */}
          <nav className="flex flex-col px-4 space-y-2">
            {menu.map((item) => (
              <Link
                key={item.key}
                to={item.link}
                className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
                  location.pathname === `/${item.link}`
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
        
        {/* User Info Section at Bottom with Dropdown */}
        <div className="p-4">
          <div className="relative">
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-sm tracking-wide truncate">
                  {userName || "Security Guard"}
                </h2>
                {userEmail && <p className="text-white/70 text-xs font-medium truncate">{userEmail}</p>}
              </div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="ml-2 text-white hover:text-white/80 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Settings</span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 border-t border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar (mobile overlay) */}
      {menuOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-40 lg:hidden">
          <div className="fixed top-0 left-0 w-72 h-full bg-red-900 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Mobile Profile Section - Picture and Role Only */}
              <div className="flex flex-col items-center justify-center px-4 py-3 mb-3">
                <div className="relative">
                  <div className="relative">
                    {userProfilePicture ? (
                      <img 
                        src={userProfilePicture} 
                        alt="Profile" 
                        className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30 shadow-xl" 
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/30 shadow-xl">
                        {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-white text-sm font-bold">Security Guard</p>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <nav className="flex flex-col px-4 space-y-2">
                {menu.map((item) => (
                  <Link
                    key={item.key}
                    to={item.link}
                    onClick={() => setMenuOpen(false)} // close menu after navigation
                    className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
                      location.pathname === `/${item.link}`
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
            
            {/* Mobile User Info Section at Bottom with Dropdown */}
            <div className="p-4">
              <div className="relative">
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-sm tracking-wide truncate">
                      {userName || "Security Guard"}
                    </h2>
                    {userEmail && <p className="text-white/70 text-xs font-medium truncate">{userEmail}</p>}
                  </div>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="ml-2 text-white hover:text-white/80 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => {
                        setSettingsOpen(true);
                        setDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 border-t border-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(updatedData: { name: string; profile_picture: string }) => {
          setUserName(updatedData.name);
          setUserProfilePicture(updatedData.profile_picture);
        }}
      />
    </>
  );
};

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
      <div className="hidden lg:flex w-70 min-h-screen fixed left-0 top-0 pr-2 py-6 flex-col justify-between bg-red-900 shadow-2xl z-30">
        <div>
          {/* Modern Profile Section */}
          <div className="flex flex-col items-center justify-center px-4 py-6 mb-6">
            <div className="relative mb-4">
              <button
                onClick={handleProfileClick}
                className="relative group focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-red-900 rounded-full"
              >
                {userProfilePicture ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/30 shadow-xl group-hover:ring-teal-400/50 transition-all duration-300">
                    <img 
                      src={userProfilePicture} 
                      alt="Profile Picture" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center ring-4 ring-white/30 shadow-xl group-hover:ring-teal-400/50 group-hover:scale-105 transition-all duration-300">
                    <span className="text-white text-2xl font-bold">
                      {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-500 rounded-full border-2 border-white shadow-lg"></div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
            </div>
            <h2 className="text-white font-bold text-xl tracking-wide whitespace-nowrap mb-1">Security Guard</h2>
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
          <div className="fixed top-0 left-0 w-72 h-full bg-red-900 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Mobile Profile Section */}
              <div className="flex flex-col items-center justify-center px-4 py-6 mb-4">
                <div className="relative mb-3">
                  <button
                    onClick={handleProfileClick}
                    className="relative group focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-red-900 rounded-full"
                  >
                    {userProfilePicture ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-3 ring-white/30 shadow-xl group-hover:ring-teal-400/50 transition-all duration-300">
                        <img 
                          src={userProfilePicture} 
                          alt="Profile Picture" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center ring-3 ring-white/30 shadow-xl group-hover:ring-teal-400/50 group-hover:scale-105 transition-all duration-300">
                        <span className="text-white text-xl font-bold">
                          {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full border-2 border-white shadow-lg"></div>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>
                </div>
                <h2 className="text-white font-bold text-lg tracking-wide whitespace-nowrap mb-1">Security Guard</h2>
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

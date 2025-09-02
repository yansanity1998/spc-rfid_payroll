// src/components/Accounting/NavAccounting.tsx
import { Link, useNavigate } from "react-router-dom";
import { spclogo } from "../../utils";
import supabase from "../../utils/supabase";
import { useState } from "react";

export const NavAccounting = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const menu = [
    { key: "dashboard", label: "Dashboard", link: "/accounting/dashboard" },
    { key: "payroll", label: "Payroll", link: "/accounting/payroll" },
    { key: "contributions", label: "Gov’t Contributions", link: "/accounting/contributions" },
    { key: "reports", label: "Reports", link: "/accounting/reports" },
  ];

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
      <div className="hidden lg:flex w-70 h-screen pr-2 py-10 flex-col justify-between bg-white shadow-md">
        <div>
          <div className="flex items-center justify-center gap-10">
            <img src={spclogo} alt="Logo" className="h-10" />
          </div>
          <nav className="flex flex-col p-4 mt-10 space-y-2">
            {menu.map((item) => (
              <Link
                key={item.key}
                to={item.link}
                reloadDocument
                className="hover:bg-red-800 block w-full text-left px-3 py-2 rounded-md hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 hover:bg-red-600 hover:text-white shadow-md cursor-pointer px-3 py-2 rounded-md transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar (mobile overlay) */}
      {menuOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-40 lg:hidden">
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center p-4">
                <img src={spclogo} alt="Logo" className="h-10" />
              </div>
              <nav className="flex flex-col p-4 space-y-2">
                {menu.map((item) => (
                  <Link
                    key={item.key}
                    to={item.link}
                    reloadDocument
                    onClick={() => setMenuOpen(false)}
                    className="hover:bg-blue-800 block w-full text-left px-3 py-2 rounded-md hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="w-full bg-gray-200 hover:bg-blue-600 hover:text-white shadow-md cursor-pointer px-3 py-2 rounded-md transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

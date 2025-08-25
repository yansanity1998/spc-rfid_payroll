import { Link, useNavigate } from "react-router-dom";
import { spclogo } from "../utils";
import supabase from "../utils/supabase";

export const NavBar = () => {
  const navigate = useNavigate();

  const menu = [
    { key: "dashboard", label: "Dashboard", link: "hrAdmin/dashboard" },
    { key: "users", label: "User Management", link: "hrAdmin/userManagement" },
    { key: "attendance", label: "Attendance", link: "hrAdmin/attendance" },
    { key: "payroll", label: "Payroll", link: "hrAdmin/payroll" },
    { key: "requests", label: "Requests", link: "hrAdmin/requests" },
    { key: "reports", label: "Reports", link: "hrAdmin/reports" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="w-70 h-screen pr-2 py-10 flex flex-col justify-between">

      <div>
        <div className="flex items-center justify-center gap-10">
          <img src={spclogo} alt="Logo" className="h-10" />
          <svg
            height="30"
            className="hover:bg-gray-100 transition cursor-pointer hover:border-1 border-gray-200 rounded-full p-1"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M21 20H7V4H21V20ZM19 18H9V6H19V18Z"
              fill="#340605"
            />
            <path d="M3 20H5V4H3V20Z" fill="#340605" />
          </svg>
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
  );
};

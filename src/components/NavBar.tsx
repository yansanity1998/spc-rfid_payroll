import { Link } from "react-router";
import { spclogo } from "../utils";

export const NavBar = () => {
  const menu = [
    { key: "dashboard", label: "Dashboard" , link: "dashboard"},
    { key: "users", label: "User Management", link: "userManagement" },
    { key: "attendance", label: "Attendance", link: "attendance" },
    { key: "payroll", label: "Payroll", link: "payroll" },
    { key: "requests", label: "Requests", link: "requests" },
    { key: "reports", label: "Reports", link: "reports" },
  ];
  return (
    <div className="w-70 absolute left-0 h-full pr-2 py-10">
      <div className="flex items-center justify-center gap-10">
        <img src={spclogo} alt="" className="h-10" />
        <svg height="30" className="hover:bg-gray-100 transition cursor-pointer hover:border-1 border-gray-200 rounded-full p-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M21 20H7V4H21V20ZM19 18H9V6H19V18Z"
              fill="#340605"
            ></path>{" "}
            <path d="M3 20H5V4H3V20Z" fill="#340605"></path>{" "}
          </g>
        </svg>
      </div>
      <nav className="flex flex-col p-4 mt-10 space-y-2">
          {menu.map((item) => (
            <Link
              to={item.link}
              className="hover:bg-red-800 block w-full text-left px-3 py-2 rounded-md hover:text-white transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
    </div>
  );
};

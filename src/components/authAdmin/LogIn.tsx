import { useState } from "react";
import { spclogo, titlelogo } from "../../utils";
import { Link, useNavigate } from "react-router";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";

export const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState("password");
  const [eye, setEye] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      toast.error("User not found.");
      return;
    }

    // 2. Try fetching role from 'users' table
    let userRole: string | null = null;
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", userId)
      .single();

    if (!userError && userProfile?.role) {
      userRole = userProfile.role;
    } else {
      // 3. Fallback: fetch role from 'roles' table
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
      return;
    }

    // 4. Save session and role
    localStorage.setItem("user", JSON.stringify(data.session));
    localStorage.setItem("role", userRole);

    // 5. Redirect based on role
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
  };

  const handleShow = () => {
    setEye((prev) => !prev);
    setType((prev) => (prev === "password" ? "text" : "password"));
  };

  return (
    <div className="h-screen w-full relative overflow-hidden flex flex-col">
      <Toaster position="bottom-left" reverseOrder={false} />
      <div className="bg-red-950 shadow-xl/20 h-2 sm:h-3"></div>

      <img
        src={spclogo}
        alt=""
        className="h-16 sm:h-24 md:h-32 lg:h-40 absolute top-5 sm:top-10 left-5 sm:left-10"
      />

      <div className="flex flex-1 items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-red-950/20 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl p-6 space-y-6"
        >
          <div className="flex justify-center">
            <img src={titlelogo} alt="" className="h-10 sm:h-16" />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col text-sm sm:text-base">
              <label className="mb-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-2 w-full h-10 border-gray-800 border-2 rounded-xl"
              />
            </div>
            <div className="flex flex-col text-sm sm:text-base">
              <label className="mb-1">Password</label>
              <div className="flex relative">
                <input
                  type={type}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-2 w-full h-10 border-gray-800 border-2 rounded-xl"
                />
                <button
                  type="button"
                  className="absolute right-5 top-2 cursor-pointer"
                  onClick={handleShow}
                >
                  {eye === true ? (
                    <svg
                      height="25"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M3 14C3 9.02944 7.02944 5 12 5C16.9706 5 21 9.02944 21 14M17 14C17 16.7614 14.7614 19 12 19C9.23858 19 7 16.7614 7 14C7 11.2386 9.23858 9 12 9C14.7614 9 17 11.2386 17 14Z"
                          stroke="#000000"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>{" "}
                      </g>
                    </svg>
                  ) : (
                    <svg
                      height="25"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M9.60997 9.60714C8.05503 10.4549 7 12.1043 7 14C7 16.7614 9.23858 19 12 19C13.8966 19 15.5466 17.944 16.3941 16.3878M21 14C21 9.02944 16.9706 5 12 5C11.5582 5 11.1238 5.03184 10.699 5.09334M3 14C3 11.0069 4.46104 8.35513 6.70883 6.71886M3 3L21 21"
                          stroke="#000000"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>{" "}
                      </g>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-red-900 text-white px-6 sm:px-10 py-2 text-sm sm:text-base cursor-pointer shadow-xl/20 hover:bg-red-950 transition rounded-lg"
            >
              Log In
            </button>
          </div>

          <div className="flex justify-start">
            <a
              href="/"
              className="text-xs sm:text-sm underline hover:text-red-800"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
      <div className="absolute right-10 bottom-10 flex items-center gap-5">
        <p className="font-medium italic opacity-50 hover:opacity-100 transition">
          Ready to Scan?
        </p>
        <Link
          className="text-white text-medium bg-red-900 px-4 py-2 rounded font-semibold hover:scale-105 transition"
          reloadDocument
          to="/scanner"
        >
          Scanner
        </Link>
      </div>
    </div>
  );
};

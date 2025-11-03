import { useState, useEffect } from "react";
import { spclogo, titlelogo } from "../../utils";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

export const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState("password");
  const [eye, setEye] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check for existing session on component mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const savedSession = getCookie("supabase_session");
      const savedRole = getCookie("user_role");

      if (savedSession && savedRole) {
        setIsLoading(true);
        
        // Validate the session with Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session) {
          // Session is valid, redirect based on role
          toast.success(`Welcome back! Auto-login successful.`);
          redirectBasedOnRole(savedRole);
        } else {
          // Clear invalid cookies
          deleteCookie("supabase_session");
          deleteCookie("user_role");
          localStorage.removeItem("user");
          localStorage.removeItem("role");
        }
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
      // Clear any invalid cookies
      deleteCookie("supabase_session");
      deleteCookie("user_role");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionToCookies = (session: any, role: string) => {
    if (session?.access_token) {
      // Save to cookies (persistent across browser sessions)
      setCookie("supabase_session", session.access_token, 7); // 7 days
      setCookie("user_role", role, 7);
      
      // Also save to localStorage for immediate access
      localStorage.setItem("user", JSON.stringify(session));
      localStorage.setItem("role", role);
    }
  };

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case "HR Personnel":
        navigate("/HR/dashboard");
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
      case "SA":
        navigate("/SA/dashboard");
        break;
      case "Staff":
        navigate("/Staff/dashboard");
        break;
      default:
        toast.error("Invalid role detected");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    console.log("🚀 LOGIN FORM SUBMITTED!");
    console.log("Email:", email);

    try {
      // 1. Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        toast.error("User not found.");
        setIsLoading(false);
        return;
      }

      let userRole: string | null = null;
      let debugMsg = "";
      const userEmail = data.user?.email;

      console.log("=== LOGIN DEBUG START ===");
      console.log("User ID:", userId);
      console.log("User Email:", userEmail);
      console.log("Looking for Staff role specifically...");

      // COMPREHENSIVE ROLE DETECTION WITH DETAILED LOGGING
      
      // Step 1: Check if there's any Staff role in the roles table
      console.log("Step 1: Checking for Staff roles in roles table...");
      const { data: allStaffRoles, error: staffRolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("role", "Staff");

      console.log("Staff Roles found:", allStaffRoles);
      console.log("Staff Roles error:", staffRolesError);

      if (!staffRolesError && allStaffRoles && allStaffRoles.length > 0) {
        console.log(`Found ${allStaffRoles.length} Staff role(s) in roles table`);
        
        // If there's exactly one Staff role, assume it's the current user
        if (allStaffRoles.length === 1) {
          console.log("Only one Staff role found - assuming current user is Staff");
          
          // Check user status in users table before allowing login
          const { data: userStatus, error: statusError } = await supabase
            .from("users")
            .select("status")
            .eq("auth_id", userId)
            .single();
            
          if (!statusError && userStatus && userStatus.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          
          userRole = "Staff";
          debugMsg += `Single Staff role found in roles table, assuming current user\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome Staff! Redirecting to dashboard...");
          navigate("/Staff/dashboard");
          return;
        }
        
        // If multiple Staff roles, try to match by ID
        const matchingRole = allStaffRoles.find(role => role.id === userId);
        if (matchingRole) {
          console.log("Found matching Staff role by ID");
          
          // Check user status in users table before allowing login
          const { data: userStatus, error: statusError } = await supabase
            .from("users")
            .select("status")
            .eq("auth_id", userId)
            .single();
            
          if (!statusError && userStatus && userStatus.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          
          userRole = "Staff";
          debugMsg += `Staff role found in roles table by ID match: ${userId}\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome Staff! Redirecting to dashboard...");
          navigate("/Staff/dashboard");
          return;
        }
      }

      // Step 2: Check if there's any SA role in the roles table
      console.log("Step 2: Checking for SA roles in roles table...");
      const { data: allSARoles, error: saRolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("role", "SA");

      console.log("SA Roles found:", allSARoles);
      console.log("SA Roles error:", saRolesError);

      if (!saRolesError && allSARoles && allSARoles.length > 0) {
        console.log(`Found ${allSARoles.length} SA role(s) in roles table`);
        
        // If there's exactly one SA role, assume it's the current user
        if (allSARoles.length === 1) {
          console.log("Only one SA role found - assuming current user is SA");
          
          // Check user status in users table before allowing login
          const { data: userStatus, error: statusError } = await supabase
            .from("users")
            .select("status")
            .eq("auth_id", userId)
            .single();
            
          if (!statusError && userStatus && userStatus.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          
          userRole = "SA";
          debugMsg += `Single SA role found in roles table, assuming current user\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome SA! Redirecting to dashboard...");
          navigate("/SA/dashboard");
          return;
        }
        
        // If multiple SA roles, try to match by ID
        const matchingRole = allSARoles.find(role => role.id === userId);
        if (matchingRole) {
          console.log("Found matching SA role by ID");
          
          // Check user status in users table before allowing login
          const { data: userStatus, error: statusError } = await supabase
            .from("users")
            .select("status")
            .eq("auth_id", userId)
            .single();
            
          if (!statusError && userStatus && userStatus.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          
          userRole = "SA";
          debugMsg += `SA role found in roles table by ID match: ${userId}\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome SA! Redirecting to dashboard...");
          navigate("/SA/dashboard");
          return;
        }
      }

      // Step 3: Check users table by auth_id
      console.log("Step 3: Checking users table by auth_id...");
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", userId)
        .single();

      console.log("User profile by auth_id:", userProfile);
      console.log("User profile error:", userError);
      
      if (userProfile) {
        console.log("Found user profile - Role:", userProfile.role);
        console.log("User status:", userProfile.status);
      }

      if (!userError && userProfile) {
        // Check if user account is active
        if (userProfile.status !== "Active") {
          toast.error("Your account has been deactivated. Please contact an administrator.");
          setIsLoading(false);
          return;
        }
        
        // Handle SA role 
        if (userProfile.role === "SA") {
          console.log("SA role found in users table by auth_id");
          userRole = "SA";
          debugMsg += `SA role found in users table by auth_id: ${userId}\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome SA! Redirecting to dashboard...");
          navigate("/SA/dashboard");
          return;
        }
        
        
        // Handle Guard role
        if (userProfile.role === "Guard") {
          console.log("Guard role found in users table by auth_id");
          userRole = "Guard";
          debugMsg += `Guard role found in users table by auth_id: ${userId}\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome Guard! Redirecting to dashboard...");
          navigate("/Guard/dashboard");
          return;
        }
        
        // Handle Staff role
        if (userProfile.role === "Staff") {
          console.log("Staff role found in users table by auth_id");
          userRole = "Staff";
          debugMsg += `Staff role found in users table by auth_id: ${userId}\n`;
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome Staff! Redirecting to dashboard...");
          navigate("/Staff/dashboard");
          return;
        }
      }

      // Step 4: Check users table by email
      if (userEmail) {
        console.log("Step 4: Checking users table by email...");
        const { data: userByEmail, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .single();

        console.log("User profile by email:", userByEmail);
        console.log("User profile by email error:", emailError);

        if (!emailError && userByEmail?.role === "SA") {
          // Check if user account is active
          if (userByEmail.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          console.log("SA role found in users table by email");
          userRole = "SA";
          debugMsg += `SA role found in users table by email: ${userEmail}\n`;
          
          // Fix auth_id mismatch if needed
          if (userByEmail.auth_id !== userId) {
            console.log("Fixing auth_id mismatch...");
            const { error: updateError } = await supabase
              .from("users")
              .update({ auth_id: userId })
              .eq("id", userByEmail.id);
            
            if (!updateError) {
              console.log("Auth ID fixed successfully");
              debugMsg += `Auth ID fixed for SA user\n`;
            } else {
              console.log("Failed to fix auth ID:", updateError);
            }
          }
          
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome SA! Authentication fixed. Redirecting to dashboard...");
          navigate("/SA/dashboard");
          return;
        }

        // Check for Staff role by email
        if (!emailError && userByEmail?.role === "Staff") {
          // Check if user account is active
          if (userByEmail.status !== "Active") {
            toast.error("Your account has been deactivated. Please contact an administrator.");
            setIsLoading(false);
            return;
          }
          console.log("Staff role found in users table by email");
          userRole = "Staff";
          debugMsg += `Staff role found in users table by email: ${userEmail}\n`;
          
          // Fix auth_id mismatch if needed
          if (userByEmail.auth_id !== userId) {
            console.log("Fixing Staff auth_id mismatch...");
            const { error: updateError } = await supabase
              .from("users")
              .update({ auth_id: userId })
              .eq("id", userByEmail.id);
            
            if (!updateError) {
              console.log("Staff Auth ID fixed successfully");
              debugMsg += `Auth ID fixed for Staff user\n`;
            } else {
              console.log("Failed to fix Staff auth ID:", updateError);
            }
          }
          
          saveSessionToCookies(data.session, userRole);
          toast.success("Welcome Staff! Authentication fixed. Redirecting to dashboard...");
          navigate("/Staff/dashboard");
          return;
        }
      }

      // Step 5: COMPREHENSIVE GUARD DETECTION (similar to SA detection)
      if (!userRole) {
        console.log("Step 5: Comprehensive Guard role detection...");
        
        // 5a: Check if there's any Guard role in the roles table
        console.log("Step 5a: Checking for Guard roles in roles table...");
        const { data: allGuardRoles, error: guardRolesError } = await supabase
          .from("roles")
          .select("*")
          .eq("role", "Guard");

        console.log("Guard Roles found:", allGuardRoles);
        console.log("Guard Roles error:", guardRolesError);

        if (!guardRolesError && allGuardRoles && allGuardRoles.length > 0) {
          console.log(`Found ${allGuardRoles.length} Guard role(s) in roles table`);
          
          // If there's exactly one Guard role, assume it's the current user
          if (allGuardRoles.length === 1) {
            console.log("Only one Guard role found - assuming current user is Guard");
            
            // Check user status in users table before allowing login
            const { data: userStatus, error: statusError } = await supabase
              .from("users")
              .select("status")
              .eq("auth_id", userId)
              .single();
              
            if (!statusError && userStatus && userStatus.status !== "Active") {
              toast.error("Your account has been deactivated. Please contact an administrator.");
              setIsLoading(false);
              return;
            }
            
            userRole = "Guard";
            debugMsg += `Single Guard role found in roles table, assuming current user\n`;
            saveSessionToCookies(data.session, userRole);
            toast.success("Welcome Guard! Redirecting to dashboard...");
            navigate("/Guard/dashboard");
            return;
          }
          
          // If multiple Guard roles, try to match by ID
          const matchingRole = allGuardRoles.find(role => role.id === userId);
          if (matchingRole) {
            console.log("Found matching Guard role by ID");
            
            // Check user status in users table before allowing login
            const { data: userStatus, error: statusError } = await supabase
              .from("users")
              .select("status")
              .eq("auth_id", userId)
              .single();
              
            if (!statusError && userStatus && userStatus.status !== "Active") {
              toast.error("Your account has been deactivated. Please contact an administrator.");
              setIsLoading(false);
              return;
            }
            
            userRole = "Guard";
            debugMsg += `Guard role found in roles table by ID match: ${userId}\n`;
            saveSessionToCookies(data.session, userRole);
            toast.success("Welcome Guard! Redirecting to dashboard...");
            navigate("/Guard/dashboard");
            return;
          }
        }

        // 5b: Check users table by email for Guard role
        if (userEmail) {
          console.log("Step 5b: Checking for Guard role by email...");
          const { data: guardByEmail, error: guardEmailError } = await supabase
            .from("users")
            .select("*")
            .eq("email", userEmail)
            .eq("role", "Guard")
            .single();

          console.log("Guard profile by email:", guardByEmail);
          console.log("Guard profile by email error:", guardEmailError);

          if (!guardEmailError && guardByEmail) {
            // Check if user account is active
            if (guardByEmail.status !== "Active") {
              toast.error("Your account has been deactivated. Please contact an administrator.");
              setIsLoading(false);
              return;
            }
            console.log("Guard role found in users table by email");
            userRole = "Guard";
            debugMsg += `Guard role found in users table by email: ${userEmail}\n`;
            
            // Fix auth_id mismatch if needed
            if (guardByEmail.auth_id !== userId) {
              console.log("Fixing Guard auth_id mismatch...");
              const { error: updateError } = await supabase
                .from("users")
                .update({ auth_id: userId })
                .eq("id", guardByEmail.id);
              
              if (!updateError) {
                console.log("Guard Auth ID fixed successfully");
                debugMsg += `Auth ID fixed for Guard user\n`;
              } else {
                console.log("Failed to fix Guard auth ID:", updateError);
              }
            }
            
            saveSessionToCookies(data.session, userRole);
            toast.success("Welcome Guard! Authentication fixed. Redirecting to dashboard...");
            navigate("/Guard/dashboard");
            return;
          }
        }
      }

      // Step 6: For other non-SA/Guard/Staff roles, continue with regular logic
      if (!userRole && userProfile?.role) {
        // Check if user account is active
        if (userProfile.status !== "Active") {
          toast.error("Your account has been deactivated. Please contact an administrator.");
          setIsLoading(false);
          return;
        }
        userRole = userProfile.role;
        debugMsg += `Role found in users table: ${userRole}\n`;
        console.log("Non-SA/Guard role found:", userRole);
      }

      console.log("=== LOGIN DEBUG END ===");
      console.log("Final userRole:", userRole);

      // If still no role found, show error
      if (!userRole) {
        toast.error(`Role not assigned. Contact admin. Debug info: ${debugMsg}`);
        setIsLoading(false);
        return;
      }

      // 4. Save session and role
      saveSessionToCookies(data.session, userRole);

      // 5. Redirect based on role
      switch (userRole) {
        case "HR Personnel":
          navigate("/HR/dashboard");
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
        case "SA":
          // SA should have been handled earlier, but keeping as fallback
          toast.success("Welcome SA! Redirecting to dashboard...");
          navigate("/SA/dashboard");
          break;
        case "Staff":
          // Staff should have been handled earlier, but keeping as fallback
          toast.success("Welcome Staff! Redirecting to dashboard...");
          navigate("/Staff/dashboard");
          break;
        default:
          toast.error(`Role not assigned. Debug info: ${debugMsg}`);
      }

    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShow = () => {
    setEye((prev) => !prev);
    setType((prev) => (prev === "password" ? "text" : "password"));
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

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
                required
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
                  required
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
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M3 14C3 9.02944 7.02944 5 12 5C16.9706 5 21 9.02944 21 14M17 14C17 16.7614 14.7614 19 12 19C9.23858 19 7 16.7614 7 14C7 11.2386 9.23858 9 12 9C14.7614 9 17 11.2386 17 14Z"
                          stroke="#000000"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
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
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M9.60997 9.60714C8.05503 10.4549 7 12.1043 7 14C7 16.7614 9.23858 19 12 19C13.8966 19 15.5466 17.944 16.3941 16.3878M21 14C21 9.02944 16.9706 5 12 5C11.5582 5 11.1238 5.03184 10.699 5.09334M3 14C3 11.0069 4.46104 8.35513 6.70883 6.71886M3 3L21 21"
                          stroke="#000000"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
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
              disabled={isLoading}
              className="bg-red-900 text-white px-6 sm:px-10 py-2 text-sm sm:text-base cursor-pointer shadow-xl/20 hover:bg-red-950 transition rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Log In"}
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

export default LogIn;
import { useState } from "react";
import { spclogo, titlelogo } from "../../utils";
import { useNavigate } from "react-router";
import supabase from "../../utils/supabase";

export const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setErrorMsg("User not found.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("roles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) {
      setErrorMsg("Failed to fetch user profile.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.session));
    localStorage.setItem("role", profile.role);

    switch (profile.role) {
      case "HR Personnel":
        navigate("/hrAdmin/dashboard");
        break;
      case "Accounting":
        navigate("/accounting/dashboard");
        break;
      case "Administrator":
        navigate("/hrAdmin/dashboard");
        break;
      case "Faculty":
        navigate("/faculty/dashboard");
        break;
      case "Guard":
        navigate("/Guard/dashboard");
        break;
      default:
        setErrorMsg("Role not assigned. Contact admin.");
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden flex flex-col">
      {/* Top accent bar */}
      <div className="bg-red-950 shadow-xl/20 h-2 sm:h-3"></div>

      {/* Logo top left */}
      <img
        src={spclogo}
        alt=""
        className="h-16 sm:h-24 md:h-32 lg:h-40 absolute top-5 sm:top-10 left-5 sm:left-10"
      />

      {/* Centered form */}
      <div className="flex flex-1 items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-red-950/20 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl p-6 space-y-6"
        >
          {/* Title */}
          <div className="flex justify-center">
            <img src={titlelogo} alt="" className="h-10 sm:h-16" />
          </div>

          {/* Input fields */}
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-2 w-full h-10 border-gray-800 border-2 rounded-xl"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMsg && <p className="text-red-600 text-xs sm:text-sm">{errorMsg}</p>}

          {/* Submit button */}
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-red-900 text-white px-6 sm:px-10 py-2 text-sm sm:text-base cursor-pointer shadow-xl/20 hover:bg-red-950 transition rounded-lg"
            >
              Log In
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-start">
            <a href="/" className="text-xs sm:text-sm underline hover:text-red-800">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

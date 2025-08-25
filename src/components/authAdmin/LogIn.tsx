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
    } else {
      localStorage.setItem("user", JSON.stringify(data.session));

      navigate("/dashboard");
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden">
      <div className="bg-red-950 shadow-xl/20 h-3"></div>
      <img src={spclogo} alt="" className="h-40 absolute top-20 left-10" />

      <div className="w-full h-screen z-99 flex items-center justify-center poppins-regular">
        <form
          onSubmit={handleLogin}
          className="h-150 w-120 rounded-2xl backdrop-blur-md bg-red-950/20 border relative border-white/20 shadow-lg p-6 relative overflow-hidden"
        >
          <img src={titlelogo} alt="" className="h-30" />
          <div className="py-15 space-y-2 text-end">
            <div className="space-x-6">
              <label>Email</label>
              <input
                type="text"
                value={email}
                className="pl-2 w-80 h-10 border-gray-800 border-2 rounded-xl"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-x-5">
              <label>Password</label>
              <input
                type="password"
                value={password}
                className="pl-2 w-80 h-10 border-gray-800 border-2 rounded-xl"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

          <div className="w-full flex justify-center">
            <button
              type="submit"
              className="bg-red-900 text-white px-10 py-2 cursor-pointer shadow-xl/20 hover:bg-red-950 transition rounded-lg"
            >
              Log In
            </button>
          </div>
          <a href="/" className="absolute bottom-5 left-5 text-xs">
            Forgot password?
          </a>
        </form>
      </div>

      {/* <div className="absolute bottom-30 translate-x-140 -z-2 translate-y-100 flex flex-col gap-10 -rotate-30">
        <div className="h-30 w-400 bg-red-950"></div>
        <div className="h-30 w-400 bg-red-950"></div>
        <div className="h-30 w-400 bg-red-950"></div>
        <div className="h-30 w-400 bg-red-950"></div>
      </div> */}
    </div>
  );
};

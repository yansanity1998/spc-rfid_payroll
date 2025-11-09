import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center">
        {/* Large 404 */}
        <h1 className="text-[180px] md:text-[240px] font-bold text-gray-900 leading-none mb-8">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-500 text-lg mb-12 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Countdown */}
        <p className="text-sm text-gray-400">
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
};

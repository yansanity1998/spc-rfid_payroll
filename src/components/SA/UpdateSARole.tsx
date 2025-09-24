// Temporary component to update SA role - Remove after use
import { useState } from "react";
import supabase from "../../utils/supabase";

const UpdateSARole = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateRole = async () => {
    if (!email) {
      setMessage("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      // Update the user role to SA
      const { data, error } = await supabase
        .from("users")
        .update({ role: "SA" })
        .eq("email", email)
        .select();

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else if (data && data.length > 0) {
        setMessage(`Success! Role updated to SA for ${email}`);
      } else {
        setMessage("No user found with that email");
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Update SA Role
        </h1>
        <p className="text-gray-600 mb-6 text-center text-sm">
          This is a temporary tool to assign SA role to your account
        </p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Your Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Enter your email address"
            />
          </div>

          <button
            onClick={updateRole}
            disabled={loading}
            className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-600 hover:bg-yellow-700"
            } text-white`}
          >
            {loading ? "Updating..." : "Update Role to SA"}
          </button>

          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.includes("Success") 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800"
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-xs">
            <strong>Note:</strong> After updating your role, please delete this component file 
            and try logging in again with your SA account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdateSARole;

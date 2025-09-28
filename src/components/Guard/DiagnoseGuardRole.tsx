import { useState } from "react";
import supabase from "../../utils/supabase";
import toast, { Toaster } from "react-hot-toast";

export const DiagnoseGuardRole = () => {
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosis("");
    
    let report = "=== GUARD ROLE DIAGNOSIS ===\n\n";
    
    try {
      // 1. Check current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      report += `1. Current Auth User:\n`;
      if (authError) {
        report += `   ERROR: ${authError.message}\n`;
        setDiagnosis(report);
        setLoading(false);
        return;
      }
      
      if (!user) {
        report += `   ERROR: No authenticated user found\n`;
        setDiagnosis(report);
        setLoading(false);
        return;
      }
      
      report += `   ✓ User ID: ${user.id}\n`;
      report += `   ✓ Email: ${user.email}\n\n`;
      
      // 2. Check roles table for Guard entries
      report += `2. Roles Table Check:\n`;
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("role", "Guard");
      
      if (rolesError) {
        report += `   ERROR: ${rolesError.message}\n`;
      } else {
        report += `   Found ${rolesData?.length || 0} Guard entries in roles table\n`;
        rolesData?.forEach((role, index) => {
          report += `   Entry ${index + 1}: ID=${role.id}, Role=${role.role}\n`;
        });
      }
      report += "\n";
      
      // 3. Check users table by auth_id
      report += `3. Users Table Check (by auth_id):\n`;
      const { data: userByAuthId, error: authIdError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id);
      
      if (authIdError) {
        report += `   ERROR: ${authIdError.message}\n`;
      } else if (!userByAuthId || userByAuthId.length === 0) {
        report += `   ❌ No user found with auth_id: ${user.id}\n`;
      } else {
        report += `   ✓ Found user by auth_id:\n`;
        userByAuthId.forEach(u => {
          report += `     - ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Email: ${u.email}\n`;
        });
      }
      report += "\n";
      
      // 4. Check users table by email
      report += `4. Users Table Check (by email):\n`;
      const { data: userByEmail, error: emailError } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email);
      
      if (emailError) {
        report += `   ERROR: ${emailError.message}\n`;
      } else if (!userByEmail || userByEmail.length === 0) {
        report += `   ❌ No user found with email: ${user.email}\n`;
      } else {
        report += `   ✓ Found user(s) by email:\n`;
        userByEmail.forEach(u => {
          report += `     - ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Auth_ID: ${u.auth_id}\n`;
          if (u.auth_id !== user.id) {
            report += `     ⚠️  AUTH_ID MISMATCH! Database: ${u.auth_id}, Current: ${user.id}\n`;
          }
        });
      }
      report += "\n";
      
      // 5. Check for Guard role specifically
      report += `5. Guard Role Check:\n`;
      const { data: guardUsers, error: guardError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "Guard");
      
      if (guardError) {
        report += `   ERROR: ${guardError.message}\n`;
      } else {
        report += `   Found ${guardUsers?.length || 0} Guard users in database:\n`;
        guardUsers?.forEach((guard, index) => {
          report += `   Guard ${index + 1}: ID=${guard.id}, Name=${guard.name}, Email=${guard.email}, Auth_ID=${guard.auth_id}\n`;
          if (guard.email === user.email) {
            report += `     ✓ This matches your email!\n`;
            if (guard.auth_id !== user.id) {
              report += `     ⚠️  But auth_id is mismatched!\n`;
            }
          }
        });
      }
      report += "\n";
      
      // 6. Recommendations
      report += `6. RECOMMENDATIONS:\n`;
      
      const guardUser = userByEmail?.find(u => u.role === "Guard");
      if (guardUser) {
        if (guardUser.auth_id !== user.id) {
          report += `   🔧 AUTH_ID MISMATCH DETECTED!\n`;
          report += `   ✅ Click "Fix Auth ID" button below to automatically fix this\n`;
        } else {
          report += `   ✅ Guard account looks properly configured\n`;
          report += `   ✅ Try logging out and logging back in\n`;
        }
      } else {
        report += `   ❌ No Guard role found for your email\n`;
        report += `   📝 Contact admin to assign Guard role to your account\n`;
      }
      
    } catch (error) {
      report += `\nUNEXPECTED ERROR: ${error}\n`;
    }
    
    setDiagnosis(report);
    setLoading(false);
  };

  const fixAuthId = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No authenticated user found");
        setLoading(false);
        return;
      }
      
      // Find Guard user by email
      const { data: guardUser, error: findError } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .eq("role", "Guard")
        .single();
      
      if (findError || !guardUser) {
        toast.error("Guard user not found by email");
        setLoading(false);
        return;
      }
      
      if (guardUser.auth_id === user.id) {
        toast.success("Auth ID is already correct!");
        setLoading(false);
        return;
      }
      
      // Update auth_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ auth_id: user.id })
        .eq("id", guardUser.id);
      
      if (updateError) {
        toast.error(`Failed to update auth_id: ${updateError.message}`);
      } else {
        toast.success("Auth ID fixed successfully! Try logging in again.");
      }
      
    } catch (error) {
      toast.error(`Error: ${error}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Guard Role Diagnostic Tool
            </h1>
            <p className="text-gray-600">
              Diagnose and fix Guard account login issues
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4 justify-center">
              <button
                onClick={runDiagnosis}
                disabled={loading}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
              >
                {loading ? "Running Diagnosis..." : "Run Diagnosis"}
              </button>
              
              <button
                onClick={fixAuthId}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? "Fixing..." : "Fix Auth ID"}
              </button>
            </div>
            
            {diagnosis && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Diagnosis Report:
                </h3>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-4 rounded border overflow-x-auto">
                  {diagnosis}
                </pre>
              </div>
            )}
            
            <div className="text-center">
              <a
                href="/"
                className="text-teal-600 hover:text-teal-800 font-medium underline"
              >
                ← Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnoseGuardRole;

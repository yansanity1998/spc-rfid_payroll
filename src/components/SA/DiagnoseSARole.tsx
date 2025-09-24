// src/components/SA/DiagnoseSARole.tsx
import { useState } from "react";
import supabase from "../../utils/supabase";
import { useNavigate } from "react-router-dom";

const DiagnoseSARole = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const diagnoseCurrentUser = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("No authenticated user found. Please log in first.");
        setLoading(false);
        return;
      }

      const authId = user.id;
      const email = user.email;

      // Check users table for auth_id match
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .single();

      // Check users table for email match
      const { data: usersEmailData, error: usersEmailError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email);

      // Check roles table for auth_id match (without .single() to see all matches)
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("id", authId);

      // Check all SA roles in the roles table to see the structure
      const { data: allSARoles, error: allSARolesError } = await supabase
        .from("roles")
        .select("*")
        .eq("role", "SA");

      const diagnosticResults = {
        authUser: {
          id: authId,
          email: email,
          created_at: user.created_at
        },
        usersTableByAuthId: {
          found: !usersError,
          data: usersData,
          error: usersError?.message
        },
        usersTableByEmail: {
          found: !usersEmailError && usersEmailData && usersEmailData.length > 0,
          data: usersEmailData,
          error: usersEmailError?.message
        },
        rolesTable: {
          found: !rolesError && rolesData && rolesData.length > 0,
          data: rolesData,
          error: rolesError?.message
        },
        allSARoles: {
          found: !allSARolesError && allSARoles && allSARoles.length > 0,
          data: allSARoles,
          error: allSARolesError?.message
        }
      };

      setResults(diagnosticResults);
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fixAuthId = async () => {
    if (!results?.usersTableByEmail?.data?.[0]) {
      setError("No user found by email to fix auth_id");
      return;
    }

    setLoading(true);
    try {
      const userRecord = results.usersTableByEmail.data[0];
      const correctAuthId = results.authUser.id;

      // Update the auth_id in users table
      const { error: updateError } = await supabase
        .from("users")
        .update({ auth_id: correctAuthId })
        .eq("id", userRecord.id);

      if (updateError) {
        setError(`Failed to update auth_id: ${updateError.message}`);
        setLoading(false);
        return;
      }

      alert("Auth ID fixed successfully! Please try logging in again.");
      
      // Re-run diagnosis to confirm fix
      await diagnoseCurrentUser();
    } catch (err: any) {
      setError(`Error fixing auth_id: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSARole = async () => {
    if (!results?.authUser?.id || !results?.authUser?.email) {
      setError("No authenticated user found to create SA role");
      return;
    }

    setLoading(true);
    try {
      const authId = results.authUser.id;

      // Insert SA role into roles table
      const { error: insertError } = await supabase
        .from("roles")
        .insert({
          id: authId,
          role: "SA"
        });

      if (insertError) {
        setError(`Failed to create SA role: ${insertError.message}`);
        setLoading(false);
        return;
      }

      alert("SA role created successfully! Please try logging in again.");
      
      // Re-run diagnosis to confirm creation
      await diagnoseCurrentUser();
    } catch (err: any) {
      setError(`Error creating SA role: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("No authenticated user found");
        setLoading(false);
        return;
      }

      console.log("Testing login for user:", user.id);

      // Try the same logic as login - EXACT COPY from LogIn.tsx
      let userRole: string | null = null;
      const { data: userProfile, error: userProfileError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      console.log("Users table query result:", { userProfile, userProfileError });

      if (!userProfileError && userProfile?.role) {
        userRole = userProfile.role;
        console.log("Role found in users table:", userRole);
      } else {
        console.log("Fallback to roles table...");
        // Fallback to roles table
        const { data: roleProfile, error: roleError } = await supabase
          .from("roles")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("Roles table query result:", { roleProfile, roleError });

        if (!roleError && roleProfile?.role) {
          userRole = roleProfile.role;
          console.log("Role found in roles table:", userRole);
        }
      }

      console.log("Final userRole:", userRole);

      if (!userRole) {
        setError("Role not assigned. Contact admin. (Same error as login)");
        return;
      }

      if (userRole === "SA") {
        alert(`SA role detected! Role: ${userRole}. Redirecting to SA dashboard...`);
        navigate("/SA/dashboard");
      } else {
        setError(`Role found: ${userRole}. Expected "SA" role.`);
      }
    } catch (err: any) {
      setError(`Login test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">SA Role Diagnostic Tool</h1>
          <p className="text-gray-600 mb-8">
            This tool helps diagnose and fix authentication issues for SA accounts.
          </p>

          <div className="space-y-4 mb-8">
            <button
              onClick={diagnoseCurrentUser}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Diagnosing..." : "Diagnose Current User"}
            </button>

            <button
              onClick={testLogin}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ml-4"
            >
              {loading ? "Testing..." : "Test Current User Login"}
            </button>

            {results?.usersTableByEmail?.found && !results?.usersTableByAuthId?.found && (
              <button
                onClick={fixAuthId}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ml-4"
              >
                {loading ? "Fixing..." : "Fix Auth ID"}
              </button>
            )}

            {results && !results?.rolesTable?.found && (
              <button
                onClick={createSARole}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ml-4"
              >
                {loading ? "Creating..." : "Create SA Role"}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Diagnostic Results</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Authenticated User</h4>
                    <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                      {JSON.stringify(results.authUser, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Users Table (by auth_id) 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${results.usersTableByAuthId.found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {results.usersTableByAuthId.found ? 'FOUND' : 'NOT FOUND'}
                      </span>
                    </h4>
                    <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                      {JSON.stringify(results.usersTableByAuthId, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Users Table (by email)
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${results.usersTableByEmail.found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {results.usersTableByEmail.found ? 'FOUND' : 'NOT FOUND'}
                      </span>
                    </h4>
                    <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                      {JSON.stringify(results.usersTableByEmail, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Roles Table (by auth_id)
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${results.rolesTable.found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {results.rolesTable.found ? 'FOUND' : 'NOT FOUND'}
                      </span>
                    </h4>
                    <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                      {JSON.stringify(results.rolesTable, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      All SA Roles in System
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${results.allSARoles.found ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {results.allSARoles.found ? 'FOUND' : 'NOT FOUND'}
                      </span>
                    </h4>
                    <pre className="bg-white p-3 rounded border text-sm overflow-auto">
                      {JSON.stringify(results.allSARoles, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Analysis</h4>
                  {results.usersTableByAuthId.found ? (
                    <p className="text-blue-800">✅ Auth ID is correctly linked in users table</p>
                  ) : results.usersTableByEmail.found ? (
                    <p className="text-orange-800">⚠️ User found by email but auth_id mismatch detected. Use "Fix Auth ID" button.</p>
                  ) : (
                    <p className="text-red-800">❌ User not found in users table. Contact admin to create SA account.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnoseSARole;

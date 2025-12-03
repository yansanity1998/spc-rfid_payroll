import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import supabase from "../utils/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>("/");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Get user role from users table first
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("role, status")
        .eq("auth_id", user.id)
        .single();

      if (!userError && userProfile) {
        // Check if user is active
        if (userProfile.status !== "Active") {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setUserRole(userProfile.role);
        setRedirectPath(getRoleRedirectPath(userProfile.role));
        setLoading(false);
        return;
      }

      // Fallback: Check roles table
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!roleError && roleData) {
        // Cross-check status in users table
        const { data: statusData } = await supabase
          .from("users")
          .select("status")
          .eq("auth_id", user.id)
          .single();

        if (statusData && statusData.status !== "Active") {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setUserRole(roleData.role);
        setRedirectPath(getRoleRedirectPath(roleData.role));
        setLoading(false);
        return;
      }

      // No role found
      setIsAuthenticated(false);
      setLoading(false);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const getRoleRedirectPath = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      "Administrator": "/hrAdmin/dashboard",
      "HR Personnel": "/HR/dashboard",
      "Accounting": "/accounting/dashboard",
      "Faculty": "/Faculty/dashboard",
      "SA": "/SA/dashboard",
      "Staff": "/Staff/dashboard",
      "Guard": "/Guard/dashboard",
      "ACAF": "/ACAF/dashboard",
      "President": "/President/dashboard",
      "Vice President": "/V-President/dashboard",
    };
    return roleMap[role] || "/";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to landing page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if user's role is allowed for this route
  if (userRole && !allowedRoles.includes(userRole)) {
    // User is authenticated but not authorized - redirect to their dashboard
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

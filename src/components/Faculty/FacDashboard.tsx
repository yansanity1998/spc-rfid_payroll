import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const FacDashboard = () => {
  const [faculty, setFaculty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchFaculty = async () => {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMsg("No session found. Please log in again.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        setErrorMsg("Failed to fetch faculty data.");
        console.error(error);
      } else {
        setFaculty(data);
      }

      setLoading(false);
    };

    fetchFaculty();
  }, []);

  if (loading) return <div>Loading faculty data...</div>;
  if (errorMsg) return <div className="text-red-600">{errorMsg}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {faculty.name}</h1>
      <p><strong>Email:</strong> {faculty.email}</p>
      <p><strong>Role:</strong> {faculty.role}</p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Available Actions</h2>
        <ul className="list-disc list-inside">
          {faculty.role === "Faculty" && (
            <>
              <li>Request a Loan</li>
              <li>Request a Gatepass</li>
              <li>View Attendance Records</li>
            </>
          )}
          {faculty.role === "Staff" && (
            <>
              <li>Request a Loan</li>
              <li>Request a Gatepass</li>
            </>
          )}
          {faculty.role === "Student Assistant" && (
            <>
              <li>Request a Gatepass</li>
              <li>View Attendance Records</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default FacDashboard;

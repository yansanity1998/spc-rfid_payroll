import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const GuardDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date().toISOString().split("T")[0];

      // 1. Fetch all attendance for today
      const { data, error } = await supabase
        .from("attendance")
        .select("id, user_id, time_in, time_out, users(name, role)")
        .eq("att_date", today)
        .order("time_in", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        const total = data.length;
        const active = data.filter((a) => a.time_in && !a.time_out).length;
        const completed = data.filter((a) => a.time_in && a.time_out).length;

        setStats({ total, active, completed });
        setRecent(data.slice(0, 10)); // latest 10
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 w-full relative">
      <h1 className="text-2xl font-bold mb-6">Guard Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-blue-100 rounded">
          Total Scans: {stats.total}
        </div>
        <div className="p-4 bg-green-100 rounded">
          Active Inside: {stats.active}
        </div>
        <div className="p-4 bg-yellow-100 rounded">
          Completed: {stats.completed}
        </div>
      </div>

      {/* Recent Scans */}
      <h2 className="text-lg font-medium italic mb-4">Recent Activity</h2>
      <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr className="bg-red-900">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Role</th>
                <th className="p-3 border">Time In</th>
                <th className="p-3 border">Time Out</th>
              </tr>
            </thead>
            <tbody>
              {recent.length > 0 ? (
                recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{r.users?.name || "Unknown"}</td>
                    <td className="p-3 border">{r.users?.role || "N/A"}</td>
                    <td className="p-3 border">
                      {r.time_in
                        ? new Date(r.time_in).toLocaleTimeString()
                        : "-"}
                    </td> 
                    <td className="p-3 border">
                      {r.time_out
                        ? new Date(r.time_out).toLocaleTimeString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4 absolute bottom-15 right-10">
        <a
          href="/Guard/scanner"
          className="px-4 py-2 bg-red-700 hover:bg-red-900 transition text-white rounded"
        >
          Go to Scanner
        </a>
        <a
          href="/Guard/reports"
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          View Reports
        </a>
      </div>
    </div>
  );
};

export default GuardDashboard;

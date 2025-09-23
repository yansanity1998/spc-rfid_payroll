import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

interface AttendanceRecord {
  id: number;
  user_id: number;
  att_date: string;
  time_in: string | null;
  time_out: string | null;
  users: {
    name: string;
    role: string;
  };
}

const GuardReports = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  const fetchReports = async (date?: string) => {
    setLoading(true);

    let query = supabase
      .from("attendance")
      .select("id, user_id, att_date, time_in, time_out, users(name, role)")
      .order("att_date", { ascending: false });

    if (date) {
      query = query.eq("att_date", date);
    }

    const { data, error } = await query.returns<AttendanceRecord[]>();

    if (error) {
      console.error(error);
    } else if (data) {
      setRecords(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold mb-6">Attendance Reports</h1>

      {/* Filter by Date */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={() => fetchReports(filterDate)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Filter
        </button>
        <button
          onClick={() => {
            setFilterDate("");
            fetchReports();
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr className="bg-red-900">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Role</th>
                <th className="p-3 border">Date</th>
                <th className="p-3 border">Time In</th>
                <th className="p-3 border">Time Out</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{r.users?.name || "Unknown"}</td>
                    <td className="p-3 border">{r.users?.role || "N/A"}</td>
                    <td className="p-3 border">{r.att_date}</td>
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
      )}
    </div>
  );
};

export default GuardReports;

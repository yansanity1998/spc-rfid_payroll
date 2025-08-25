// src/pages/Attendance.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Attendance = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select(`
      id,
      name,
      role,
      attendance (
        id,
        time_in,
        time_out,
        status
      )
    `);

    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Flatten logs or placeholder
  const logs = users
    .map((user) =>
      user.attendance?.length
        ? user.attendance.map((att: any) => ({
            ...att,
            userId: user.id,
            name: user.name,
            role: user.role,
          }))
        : [
            {
              id: `no-attendance-${user.id}`,
              userId: user.id,
              name: user.name,
              role: user.role,
              time_in: null,
              time_out: null,
              status: "No Record",
            },
          ]
    )
    .flat();

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 px-3 sm:px-5 roboto">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg lg:rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Attendance Monitoring
          </h1>
          <button
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            onClick={fetchAttendance}
          >
            Refresh
          </button>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-green-800">Present</h2>
            <p className="text-2xl font-bold">
              {logs.filter((l) => l.status === "Present").length}
            </p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-red-800">Absent</h2>
            <p className="text-2xl font-bold">
              {logs.filter((l) => l.status === "Absent").length}
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-yellow-800">Late</h2>
            <p className="text-2xl font-bold">
              {logs.filter((l) => l.status === "Late").length}
            </p>
          </div>
        </section>

        {/* Attendance Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Role</th>
                <th className="px-4 py-2 text-left border-b">Time In</th>
                <th className="px-4 py-2 text-left border-b">Time Out</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{log.userId}</td>
                    <td className="px-4 py-2 border-b">{log.name}</td>
                    <td className="px-4 py-2 border-b">{log.role}</td>
                    <td className="px-4 py-2 border-b">
                      {log.time_in
                        ? new Date(log.time_in).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {log.time_out
                        ? new Date(log.time_out).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td
                      className={`px-4 py-2 border-b font-semibold ${
                        log.status === "Present"
                          ? "text-green-600"
                          : log.status === "Late"
                          ? "text-yellow-600"
                          : log.status === "Absent"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {log.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

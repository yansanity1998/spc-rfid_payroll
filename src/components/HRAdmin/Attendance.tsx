// src/pages/Attendance.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Attendance = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // 🔍 Search state

  const fetchAttendance = async () => {
    setLoading(true);

    // join attendance + user info
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
    id,
    att_date,
    time_in,
    time_out,
    user:users (
      id,
      name,
      role,
      semester,
      schoolYear,
      hiredDate
    )
  `
      )
      .order("att_date", { ascending: false });

    if (error) {
      console.error(error);
      setRecords([]);
    } else {
      // Flatten into single array
      const flat = data.map((row: any) => ({
        id: row.id,
        att_date: row.att_date,
        time_in: row.time_in,
        time_out: row.time_out,
        attendance: row.attendance,
        userId: row.user?.id,
        name: row.user?.name,
        role: row.user?.role,
        semester: row.user?.semester,
        schoolYear: row.user?.schoolYear,
        hiredDate: row.user?.hiredDate,
        status: row.attendance
          ? row.time_in && !row.time_out
            ? "Present"
            : row.time_out
              ? "Completed"
              : "Late"
          : "Absent",
      }));

      setRecords(flat);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // 🔍 Filter logs
  const filtered = records.filter(
    (log) =>
      log.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.role?.toLowerCase().includes(search.toLowerCase()) ||
      log.semester?.toString().includes(search) ||
      log.schoolYear?.toString().includes(search) ||
      log.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 px-3 sm:px-5 roboto">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg lg:rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Attendance Monitoring
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* 🔍 Search */}
            <input
              type="text"
              placeholder="Search by name, role, year, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-full px-4 py-2 w-full sm:w-72 outline-none"
            />
            <button
              className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              onClick={fetchAttendance}
            >
              Refresh
            </button>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-green-800">Present</h2>
            <p className="text-2xl font-bold">
              {filtered.filter((l) => l.status === "Present").length}
            </p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-red-800">Absent</h2>
            <p className="text-2xl font-bold">
              {filtered.filter((l) => l.status === "Absent").length}
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-yellow-800">Completed</h2>
            <p className="text-2xl font-bold">
              {filtered.filter((l) => l.status === "Completed").length}
            </p>
          </div>
        </section>

        {/* Attendance Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left border-b">User ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Role</th>
                <th className="px-4 py-2 text-left border-b">Semester</th>
                <th className="px-4 py-2 text-left border-b">School Year</th>
                <th className="px-4 py-2 text-left border-b">Hired Date</th>
                <th className="px-4 py-2 text-left border-b">Date</th>
                <th className="px-4 py-2 text-left border-b">Time In</th>
                <th className="px-4 py-2 text-left border-b">Time Out</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{log.userId}</td>
                    <td className="px-4 py-2 border-b">{log.name}</td>
                    <td className="px-4 py-2 border-b">{log.role}</td>
                    <td className="px-4 py-2 border-b">
                      {log.semester ?? "--"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {log.schoolYear ?? "--"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {log.hiredDate
                        ? new Date(log.hiredDate).toLocaleDateString()
                        : "--"}
                    </td>
                    <td className="px-4 py-2 border-b">{log.att_date}</td>
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
                      className={`px-4 py-2 border-b font-semibold ${log.status === "Present"
                          ? "text-green-600"
                          : log.status === "Completed"
                            ? "text-blue-600"
                            : log.status === "Absent"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }`}
                    >
                      {log.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-4">
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

// src/pages/Attendance.tsx
import { useState } from "react";

export const Attendance = () => {
  const [logs] = useState([
    { id: 1, name: "Jane Smith", department: "HR", timeIn: "08:05 AM", timeOut: "05:01 PM", status: "Present" },
    { id: 2, name: "Mark Reyes", department: "Faculty", timeIn: "08:45 AM", timeOut: "--", status: "Late" },
    { id: 3, name: "Ana Cruz", department: "Accounting", timeIn: "--", timeOut: "--", status: "Absent" },
  ]);

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Attendance Monitoring</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Export Report
          </button>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-green-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-green-800">Present</h2>
            <p className="text-2xl font-bold">{logs.filter(l => l.status === "Present").length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-red-800">Absent</h2>
            <p className="text-2xl font-bold">{logs.filter(l => l.status === "Absent").length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow text-center">
            <h2 className="text-lg font-semibold text-yellow-800">Late</h2>
            <p className="text-2xl font-bold">{logs.filter(l => l.status === "Late").length}</p>
          </div>
        </section>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Department</th>
                <th className="px-4 py-2 text-left border-b">Time In</th>
                <th className="px-4 py-2 text-left border-b">Time Out</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{log.id}</td>
                  <td className="px-4 py-2 border-b">{log.name}</td>
                  <td className="px-4 py-2 border-b">{log.department}</td>
                  <td className="px-4 py-2 border-b">{log.timeIn}</td>
                  <td className="px-4 py-2 border-b">{log.timeOut}</td>
                  <td
                    className={`px-4 py-2 border-b font-semibold ${
                      log.status === "Present"
                        ? "text-green-600"
                        : log.status === "Late"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {log.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

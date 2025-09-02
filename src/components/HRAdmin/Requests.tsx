// src/pages/Requests.tsx
import { useState } from "react";

export const Requests = () => {
  const [requests] = useState([
    { id: 1, name: "Jane Smith", type: "Leave", reason: "Sick Leave", date: "2025-08-25", status: "Pending" },
    { id: 2, name: "Mark Reyes", type: "Loan", reason: "Medical Loan", date: "2025-08-20", status: "Approved" },
    { id: 3, name: "Ana Cruz", type: "Leave", reason: "Vacation", date: "2025-08-15", status: "Rejected" },
  ]);

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 roboto px-3 sm:px-5">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg lg:rounded-l-xl overflow-y-auto">
        <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Requests</h1>
          <button className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            + New Request
          </button>
        </section>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">All</button>
          <button className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800">Pending</button>
          <button className="px-4 py-2 rounded-lg bg-green-100 text-green-800">Approved</button>
          <button className="px-4 py-2 rounded-lg bg-red-100 text-red-800">Rejected</button>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Employee</th>
                <th className="px-4 py-2 text-left border-b">Type</th>
                <th className="px-4 py-2 text-left border-b">Reason</th>
                <th className="px-4 py-2 text-left border-b">Date</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
                <th className="px-4 py-2 text-left border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 border-b">{req.id}</td>
                  <td className="px-4 py-2 border-b">{req.name}</td>
                  <td className="px-4 py-2 border-b">{req.type}</td>
                  <td className="px-4 py-2 border-b">{req.reason}</td>
                  <td className="px-4 py-2 border-b">{req.date}</td>
                  <td
                    className={`px-4 py-2 border-b font-semibold ${
                      req.status === "Pending"
                        ? "text-yellow-600"
                        : req.status === "Approved"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {req.status}
                  </td>
                  <td className="px-4 py-2 border-b flex flex-col sm:flex-row gap-2">
                    <button className="w-full sm:w-auto px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">
                      Approve
                    </button>
                    <button className="w-full sm:w-auto px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                      Reject
                    </button>
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

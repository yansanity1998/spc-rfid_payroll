// src/pages/Payroll.tsx
import { useState } from "react";

export const Payroll = () => {
  const [payrolls] = useState([
    {
      id: 1,
      name: "Jane Smith",
      department: "IT",
      period: "Aug 1 - Aug 15, 2025",
      gross: 25000,
      deductions: 2500,
      net: 22500,
      status: "Pending",
    },
    {
      id: 2,
      name: "Mark Reyes",
      department: "HR",
      period: "Aug 1 - Aug 15, 2025",
      gross: 20000,
      deductions: 1800,
      net: 18200,
      status: "Finalized",
    },
  ]);

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            + New Payroll
          </button>
        </section>

        {/* Payroll Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Employee</th>
                <th className="px-4 py-2 text-left border-b">Department</th>
                <th className="px-4 py-2 text-left border-b">Period</th>
                <th className="px-4 py-2 text-left border-b">Gross Pay</th>
                <th className="px-4 py-2 text-left border-b">Deductions</th>
                <th className="px-4 py-2 text-left border-b">Net Pay</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
                <th className="px-4 py-2 text-left border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((pr) => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{pr.id}</td>
                  <td className="px-4 py-2 border-b">{pr.name}</td>
                  <td className="px-4 py-2 border-b">{pr.department}</td>
                  <td className="px-4 py-2 border-b">{pr.period}</td>
                  <td className="px-4 py-2 border-b">₱{pr.gross.toLocaleString()}</td>
                  <td className="px-4 py-2 border-b">₱{pr.deductions.toLocaleString()}</td>
                  <td className="px-4 py-2 border-b font-semibold text-green-700">
                    ₱{pr.net.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-2 border-b font-semibold ${
                      pr.status === "Pending"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {pr.status}
                  </td>
                  <td className="px-4 py-2 border-b flex gap-2">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      View
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-white ${
                        pr.status === "Pending"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                      disabled={pr.status !== "Pending"}
                    >
                      Finalize
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

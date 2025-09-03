// src/pages/Payroll.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Payroll = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select(`
      id,
      name,
      role,
      payrolls (
        id,
        period,
        gross,
        deductions,
        net,
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
    fetchPayrolls();
  }, []);

  // --- Finalize Payroll ---
  const finalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Finalized" })
      .eq("id", id);

    if (error) alert(error.message);
    else fetchPayrolls();
  };

  // --- Save Edited Payroll ---
  const savePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({
        gross: editData.gross,
        deductions: editData.deductions,
        net: editData.gross - editData.deductions,
      })
      .eq("id", id);

    if (error) alert(error.message);
    else {
      setEditing(null);
      setEditData({});
      fetchPayrolls();
    }
  };

  // Flatten payrolls
  const payrolls = users
    .map((user) =>
      user.payrolls?.length
        ? user.payrolls.map((pr: any) => ({
            ...pr,
            userId: user.id,
            name: user.name,
            role: user.role,
          }))
        : [
            {
              id: `no-payroll-${user.id}`,
              userId: user.id,
              name: user.name,
              role: user.role,
              period: "--",
              gross: 0,
              deductions: 0,
              net: 0,
              status: "No Record",
            },
          ]
    )
    .flat();

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 px-3 sm:px-5 roboto">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg lg:rounded-l-xl overflow-y-auto">
        <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Payroll Management (HR Admin)
          </h1>
          <button
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            onClick={fetchPayrolls}
          >
            Refresh
          </button>
        </section>

        {/* Payroll Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Employee</th>
                <th className="px-4 py-2 text-left border-b">Employee Type</th>
                <th className="px-4 py-2 text-left border-b">Period</th>
                <th className="px-4 py-2 text-left border-b">Gross Pay</th>
                <th className="px-4 py-2 text-left border-b">Deductions</th>
                <th className="px-4 py-2 text-left border-b">Net Pay</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
                <th className="px-4 py-2 text-left border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : payrolls.length > 0 ? (
                payrolls.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{pr.userId}</td>
                    <td className="px-4 py-2 border-b">{pr.name}</td>
                    <td className="px-4 py-2 border-b">{pr.role}</td>
                    <td className="px-4 py-2 border-b">{pr.period}</td>

                    <td className="px-4 py-2 border-b">
                      {editing === pr.id ? (
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-24"
                          value={editData.gross || pr.gross}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              gross: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : pr.gross > 0 ? (
                        `₱${pr.gross.toLocaleString()}`
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {editing === pr.id ? (
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-24"
                          value={editData.deductions || pr.deductions}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              deductions: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : pr.deductions > 0 ? (
                        `₱${pr.deductions.toLocaleString()}`
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-2 border-b font-semibold text-green-700">
                      {editing === pr.id
                        ? `₱${
                            (editData.gross || pr.gross) -
                            (editData.deductions || pr.deductions)
                          }`
                        : pr.net > 0
                        ? `₱${pr.net.toLocaleString()}`
                        : "--"}
                    </td>

                    <td
                      className={`px-4 py-2 border-b font-semibold ${
                        pr.status === "Pending"
                          ? "text-yellow-600"
                          : pr.status === "Finalized"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {pr.status}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 border-b flex flex-col sm:flex-row gap-2">
                      {pr.status === "Pending" && editing !== pr.id && (
                        <button
                          onClick={() => setEditing(pr.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                      )}

                      {editing === pr.id && (
                        <button
                          onClick={() => savePayroll(pr.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                      )}

                      <button
                        onClick={() => finalizePayroll(pr.id)}
                        className={`px-3 py-1 rounded text-white ${
                          pr.status === "Pending"
                            ? "bg-green-700 hover:bg-green-800"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Finalize
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-4">
                    No payroll records found
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

// src/pages/Payroll.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const Payroll = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const finalizePayroll = async (id: number) => {
    const { error } = await supabase
      .from("payrolls")
      .update({ status: "Finalized" })
      .eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      fetchPayrolls();
    }
  };

  // Flatten payrolls or create a placeholder if none
  const payrolls = users
    .map((user) => {
      if (user.payrolls && user.payrolls.length > 0) {
        return user.payrolls.map((pr: any) => ({
          ...pr,
          userId: user.id,
          name: user.name,
          role: user.role,
        }));
      }
      return [
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
      ];
    })
    .flat();

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Payroll Management
          </h1>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            onClick={fetchPayrolls}
          >
            Refresh
          </button>
        </section>

        {/* Payroll Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left border-b">ID</th>
                <th className="px-4 py-2 text-left border-b">Employee</th>
                <th className="px-4 py-2 text-left border-b">Role</th>
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
              ) : (
                payrolls.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{pr.userId}</td>
                    <td className="px-4 py-2 border-b">{pr.name}</td>
                    <td className="px-4 py-2 border-b">{pr.role}</td>
                    <td className="px-4 py-2 border-b">{pr.period}</td>
                    <td className="px-4 py-2 border-b">
                      {pr.gross > 0 ? `₱${pr.gross.toLocaleString()}` : "--"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {pr.deductions > 0
                        ? `₱${pr.deductions.toLocaleString()}`
                        : "--"}
                    </td>
                    <td className="px-4 py-2 border-b font-semibold text-green-700">
                      {pr.net > 0 ? `₱${pr.net.toLocaleString()}` : "--"}
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
                    <td className="px-4 py-2 border-b flex gap-2">
                      <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                        View
                      </button>
                      <button
                        onClick={() => finalizePayroll(pr.id)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

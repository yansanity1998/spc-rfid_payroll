// src/pages/Accounting/PayrollAcc.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

export const PayrollAcc = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    user_id: "",
    period: "",
    gross: 0,
    deductions: 0,
    net: 0,
    status: "Pending",
  });

  const fetchUsersWithPayrolls = async () => {
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
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsersWithPayrolls();
  }, []);

  // Input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addPayroll = async (userId: number, payrollData: any) => {
    const { error } = await supabase.from("payrolls").insert([
      {
        user_id: userId,
        ...payrollData,
      },
    ]);

    if (error) {
      console.error("Error adding payroll:", error.message);
    } else {
      fetchUsersWithPayrolls();
    }
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      alert("Please select an employee");
      return;
    }

    await addPayroll(Number(formData.user_id), {
      period: formData.period,
      gross: Number(formData.gross),
      deductions: Number(formData.deductions),
      net: Number(formData.net),
      status: formData.status,
    });

    setShowForm(false);
    setFormData({
      user_id: "",
      period: "",
      gross: 0,
      deductions: 0,
      net: 0,
      status: "Pending",
    });
  };

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
              status: "No Payroll",
            },
          ]
    )
    .flat();

  const filteredPayrolls = payrolls.filter(
    (pr) =>
      pr.name.toLowerCase().includes(search.toLowerCase()) ||
      pr.role.toLowerCase().includes(search.toLowerCase()) ||
      pr.period.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 px-3 sm:px-5 roboto">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-lg overflow-y-auto">
        {/* Header */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h1 className="text-2xl font-bold text-gray-800">
            Accounting Payroll
          </h1>
          <div className="flex gap-3 w-full sm:w-auto">
            {/* 🔍 Search */}
            <input
              type="text"
              placeholder="Search by name, role, or period..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-full px-4 py-2 w-full sm:w-72 outline-none"
            />
            <button
              className="bg-red-800 text-white px-4 py-2 cursor-pointer rounded-lg hover:bg-red-700"
              onClick={() => setShowForm(true)}
            >
              Add Payroll
            </button>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              onClick={fetchUsersWithPayrolls}
            >
              Refresh
            </button>
          </div>
        </section>

        {/* Payroll Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
            <thead className="bg-red-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left border-b">Employee ID</th>
                <th className="px-4 py-2 text-left border-b">Name</th>
                <th className="px-4 py-2 text-left border-b">Employee Type</th>
                <th className="px-4 py-2 text-left border-b">Period</th>
                <th className="px-4 py-2 text-left border-b">Gross Pay</th>
                <th className="px-4 py-2 text-left border-b">Deductions</th>
                <th className="px-4 py-2 text-left border-b">Net Pay</th>
                <th className="px-4 py-2 text-left border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filteredPayrolls.length > 0 ? (
                filteredPayrolls.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{pr.userId}</td>
                    <td className="px-4 py-2 border-b">{pr.name}</td>
                    <td className="px-4 py-2 border-b">{pr.role}</td>
                    <td className="px-4 py-2 border-b">{pr.period}</td>
                    <td className="px-4 py-2 border-b">
                      {pr.gross ? `₱${pr.gross.toLocaleString()}` : "--"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {pr.deductions
                        ? `₱${pr.deductions.toLocaleString()}`
                        : "--"}
                    </td>
                    <td className="px-4 py-2 border-b font-semibold text-green-700">
                      {pr.net ? `₱${pr.net.toLocaleString()}` : "--"}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No payroll records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Payroll Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Payroll</h2>
              <div className="flex flex-col gap-3">
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  className="border p-2 rounded"
                >
                  <option value="">Select Employee</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <legend>Period</legend>
                <input
                  type="text"
                  name="period"
                  placeholder="Period (e.g. Jan 2025)"
                  value={formData.period}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
                <legend>Gross</legend>
                <input
                  type="number"
                  name="gross"
                  placeholder="Gross Pay"
                  value={formData.gross}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
                <legend>Deduction</legend>
                <input
                  type="number"
                  name="deductions"
                  placeholder="Deductions"
                  value={formData.deductions}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
                <legend>Net</legend>
                <input
                  type="number"
                  name="net"
                  placeholder="Net Pay"
                  value={formData.net}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

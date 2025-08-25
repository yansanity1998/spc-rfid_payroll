// src/pages/Hero.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const Dashboard = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // fetch employees and payrolls
  const fetchData = async () => {
    setLoading(true);

    // fetch users (employees)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");

    if (userError) console.error("Error fetching employees:", userError);

    // fetch payrolls (joined with users)
    const { data: payrolls, error: payrollError } = await supabase
      .from("payrolls")
      .select(
        `
        id,
        period,
        gross,
        deductions,
        net,
        status,
        users (
          name,
          role,
          department
        )
      `
      )
      .order("created_at", { ascending: false });

    if (payrollError) console.error("Error fetching payrolls:", payrollError);

    setEmployees(users || []);
    setPayrollData(payrolls || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow-xs/20 justify-between rounded-l-xl overflow-y-auto">
        {/* Dashboard Header */}
        <section className="space-y-10">
          <div className="flex h-7">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-white rounded-lg border-1 border-gray-100 shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Employees</h2>
                <p className="text-2xl">{employees.length}</p>
              </div>
            </div>
            <div className="p-6 bg-white rounded-lg border-1 border-gray-100 shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Active Today</h2>
                <p className="text-2xl">87</p>
              </div>
            </div>
            <div className="p-6 bg-white rounded-lg border-1 border-gray-100 shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pending Requests</h2>
                <p className="text-2xl">5</p>
              </div>
            </div>
          </div>
        </section>

        {/* Employee List */}
        <div className="flex-1 p-2 shadow-xs/20 border-1 border-gray-100 rounded-lg mt-10">
          <h1 className="text-md mb-6 mt-2 font-medium mx-4">Employee List</h1>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border-b">ID</th>
                  <th className="px-4 py-2 text-left border-b">Name</th>
                  <th className="px-4 py-2 text-left border-b">Role</th>
                  <th className="px-4 py-2 text-left border-b">Department</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : employees.length > 0 ? (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">{emp.id}</td>
                      <td className="px-4 py-2 border-b">{emp.name}</td>
                      <td className="px-4 py-2 border-b">{emp.role}</td>
                      <td className="px-4 py-2 border-b">
                        {emp.department || "--"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payroll Records */}
        <div className="flex-1 p-2 shadow-xs/20 border-1 border-gray-100 rounded-lg mt-10">
          <h1 className="text-md mb-6 mt-2 font-medium mx-4">
            Payroll Records
          </h1>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border-b">Employee</th>
                  <th className="px-4 py-2 text-left border-b">Role</th>
                  <th className="px-4 py-2 text-left border-b">Department</th>
                  <th className="px-4 py-2 text-left border-b">Salary</th>
                  <th className="px-4 py-2 text-left border-b">Deductions</th>
                  <th className="px-4 py-2 text-left border-b">Net Pay</th>
                  <th className="px-4 py-2 text-left border-b">Period</th>
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
                ) : payrollData.length > 0 ? (
                  payrollData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">{row.users?.name}</td>
                      <td className="px-4 py-2 border-b">{row.users?.role}</td>
                      <td className="px-4 py-2 border-b">
                        {row.users?.department || "--"}
                      </td>
                      <td className="px-4 py-2 border-b">
                        ₱{row.gross?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 border-b">
                        ₱{row.deductions?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 border-b font-semibold text-green-600">
                        ₱{row.net?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 border-b">{row.period}</td>
                      <td
                        className={`px-4 py-2 border-b font-semibold ${
                          row.status === "Pending"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {row.status}
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

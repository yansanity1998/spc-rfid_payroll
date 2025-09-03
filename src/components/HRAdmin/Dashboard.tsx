// src/pages/Hero.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const Dashboard = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState(1);
  const tableRow = 5;

  const fetchData = async () => {
    setLoading(true);

    // fetch employees (for Employee List)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");

    if (userError) console.error("Error fetching employees:", userError);

    // fetch only users with payrolls (inner join ensures user must have payrolls)
    const { data: payrollUsers, error: payrollError } = await supabase
      .from("users")
      .select(
        `
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
    `
      )
      .not("payrolls", "is", null);

    if (payrollError) console.error("Error fetching payrolls:", payrollError);

    setEmployees(users || []);
    setPayrollData(payrollUsers || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tableLast = tableRow * table;
  const tableFirst = tableLast - tableRow;
  const tablePage = employees.slice(tableFirst, tableLast);

  return (
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 roboto px-3 sm:px-5">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow-xs/20 justify-between rounded-lg lg:rounded-l-xl overflow-y-auto">
        <section className="space-y-6 sm:space-y-10">
          <div className="flex h-7">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Dashboard
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-100 shadow flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">
                  Employees
                </h2>
                <p className="text-xl sm:text-2xl">{employees.length}</p>
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-100 shadow flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">
                  Active Today
                </h2>
                <p className="text-xl sm:text-2xl">87</p>
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-100 shadow  flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">
                  Pending Requests
                </h2>
                <p className="text-xl sm:text-2xl">5</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex-1 p-2 shadow-xs/20 border border-gray-100 rounded-lg mt-6 sm:mt-10">
          <h1 className="text-md sm:text-lg mb-4 sm:mb-6 mt-2 font-medium mx-2 sm:mx-4">
            Employee List
          </h1>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
              <thead className="bg-red-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">ID</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Name</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Employee Type</th>
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
                  tablePage.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-2 border-b">{emp.id}</td>
                      <td className="px-3 sm:px-4 py-2 border-b">{emp.name}</td>
                      <td className="px-3 sm:px-4 py-2 border-b">{emp.role}</td>
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
          <div className="flex justify-center space-x-2 items-center mt-4">
            <button
              onClick={() => setTable((prev) => Math.max(prev - 1, 1))}
              disabled={table === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                    fill="#000000"
                  ></path>{" "}
                </g>
              </svg>
            </button>

            <span>
              Page {table} of {Math.ceil(employees.length / tableRow)}
            </span>

            <button
              onClick={() =>
                setTable((prev) =>
                  prev < Math.ceil(employees.length / tableRow)
                    ? prev + 1
                    : prev
                )
              }
              disabled={table === Math.ceil(employees.length / tableRow)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
            >
              <svg
                className="h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#000000"
                  ></path>{" "}
                </g>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 p-2 shadow-xs/20 border border-gray-100 rounded-lg mt-6 sm:mt-10">
          <h1 className="text-md sm:text-lg mb-4 sm:mb-6 mt-2 font-medium mx-2 sm:mx-4">
            Payroll Records
          </h1>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full border-collapse bg-white text-sm sm:text-base">
              <thead className="bg-red-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Employee
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">Employee Type</th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Salary
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Deductions
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Net Pay
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Period
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-left border-b">
                    Status
                  </th>
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
                  payrollData.flatMap((user) =>
                    user.payrolls.map((pr: any) => (
                      <tr key={pr.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 border-b">
                          {user.name}
                        </td>
                        <td className="px-3 sm:px-4 py-2 border-b">
                          {user.role}
                        </td>
                        <td className="px-3 sm:px-4 py-2 border-b">
                          ₱{pr.gross?.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-4 py-2 border-b">
                          ₱{pr.deductions?.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-4 py-2 border-b font-semibold text-green-600">
                          ₱{pr.net?.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-4 py-2 border-b">
                          {pr.period}
                        </td>
                        <td
                          className={`px-3 sm:px-4 py-2 border-b font-semibold ${
                            pr.status === "Pending"
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {pr.status}
                        </td>
                      </tr>
                    ))
                  )
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

const Hero = () => {
  const payrollData = [
    {
      id: 1,
      name: "John Doe",
      department: "IT",
      salary: 25000,
      deductions: 2000,
      netPay: 23000,
      period: "Aug 2025",
    },
    {
      id: 2,
      name: "Jane Smith",
      department: "HR",
      salary: 28000,
      deductions: 1500,
      netPay: 26500,
      period: "Aug 2025",
    },
    {
      id: 3,
      name: "Mark Reyes",
      department: "Accounting",
      salary: 30000,
      deductions: 3000,
      netPay: 27000,
      period: "Aug 2025",
    },
  ];
  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5 bg-gray-50">
      <main className="flex flex-col w-full p-6 bg-white shadow-xs/20 justify-between rounded-l-xl overflow-y-auto">
        <section className="space-y-10">
          <div className="flex justify-between h-7">
            <h1 className="text-2xl mb-4">Dashboard</h1>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-white rounded-lg shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Employees</h2>
                <p className="text-2xl">124</p>
              </div>
              <svg
                height="50px"
                width="50px"
                version="1.1"
                id="_x32_"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 512 512"
                xmlSpace="preserve"
                fill="#000000"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <style type="text/css"> .st0{"fill:#000000;"} </style>{" "}
                  <g>
                    {" "}
                    <path
                      className="st0"
                      d="M256,0C114.613,0,0,114.616,0,255.996C0,397.382,114.613,512,256,512c141.386,0,256-114.617,256-256.004 C512,114.616,397.387,0,256,0z M255.996,401.912c-69.247-0.03-118.719-9.438-117.564-18.058 c6.291-47.108,44.279-51.638,68.402-70.94c10.832-8.666,16.097-6.5,16.097-20.945c0-5.053,0-14.446,0-23.111 c-6.503-7.219-8.867-6.317-14.366-34.663c-11.112,0-10.396-14.446-15.638-27.255c-4.09-9.984-0.988-14.294,2.443-16.165 c-1.852-9.87-0.682-43.01,13.532-60.259l-2.242-15.649c0,0,4.47,1.121,15.646-1.122c11.181-2.227,38.004-8.93,53.654,4.477 c37.557,5.522,47.53,36.368,40.204,72.326c3.598,1.727,7.178,5.962,2.901,16.392c-5.238,12.809-4.522,27.255-15.634,27.255 c-5.496,28.346-7.863,27.444-14.366,34.663c0,8.666,0,18.058,0,23.111c0,14.445,5.261,12.279,16.093,20.945 c24.126,19.301,62.111,23.831,68.406,70.94C374.715,392.474,325.246,401.882,255.996,401.912z"
                    ></path>{" "}
                  </g>{" "}
                </g>
              </svg>
            </div>
            <div className="p-6 bg-white rounded-lg shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Active Today</h2>
                <p className="text-2xl">87</p>
              </div>
              <svg
                height="50"
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
                    d="M12 7V12L14.5 10.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="#000000"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>{" "}
                </g>
              </svg>
            </div>

            <div className="p-6 bg-white rounded-lg shadow flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pending Requests</h2>
                <p className="text-2xl">5</p>
              </div>
              <svg
                height="50"
                width="50"
                fill="#000000"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M6.108,20H4a1,1,0,0,0,0,2H20a1,1,0,0,0,0-2H17.892c-.247-2.774-1.071-7.61-3.826-9,2.564-1.423,3.453-4.81,3.764-7H20a1,1,0,0,0,0-2H4A1,1,0,0,0,4,4H6.17c.311,2.19,1.2,5.577,3.764,7C7.179,12.39,6.355,17.226,6.108,20ZM9,16.6c0-1.2,3-3.6,3-3.6s3,2.4,3,3.6V20H9Z"></path>
                </g>
              </svg>
            </div>
          </div>
        </section>

        <div className="p-2 shadow-xs/20 rounded-lg">
          <h1 className="text-md mb-6 mt-2 font-medium mx-4">Payroll Records</h1>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border-b">Employee</th>
                  <th className="px-4 py-2 text-left border-b">Department</th>
                  <th className="px-4 py-2 text-left border-b">Salary</th>
                  <th className="px-4 py-2 text-left border-b">Deductions</th>
                  <th className="px-4 py-2 text-left border-b">Net Pay</th>
                  <th className="px-4 py-2 text-left border-b">Period</th>
                  <th className="px-4 py-2 text-left border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{row.name}</td>
                    <td className="px-4 py-2 border-b">{row.department}</td>
                    <td className="px-4 py-2 border-b">
                      ₱{row.salary.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border-b">
                      ₱{row.deductions.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border-b font-semibold text-green-600">
                      ₱{row.netPay.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border-b">{row.period}</td>
                    <td className="px-4 py-2 border-b">
                      <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                        View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Hero;

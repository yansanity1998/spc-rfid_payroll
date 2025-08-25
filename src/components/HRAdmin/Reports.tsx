// src/pages/Reports.tsx
const Reports = () => {
  const reports = [
    {
      id: 1,
      title: "Attendance Reports",
      description: "Daily, weekly, and monthly summaries of attendance records.",
    },
    {
      id: 2,
      title: "Payroll Reports",
      description: "Payroll summaries, payslip reports, and payroll registers.",
    },
    {
      id: 3,
      title: "Leave Reports",
      description: "Summary of leave requests and employee leave balances.",
    },
    {
      id: 4,
      title: "Loan Reports",
      description: "Outstanding loan balances and repayment schedules.",
    },
    {
      id: 5,
      title: "Government Contributions",
      description: "SSS, PhilHealth, Pag-IBIG, and Tax withholding reports.",
    },
  ];

  return (
    <div className="flex h-screen w-[87%] justify-end py-5 roboto pl-5">
      <main className="flex flex-col w-full p-6 bg-white shadow rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500">Generate and export system reports.</p>
        </section>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border rounded-lg p-5 shadow-sm bg-white hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold mb-2">{report.title}</h2>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  View
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Reports;

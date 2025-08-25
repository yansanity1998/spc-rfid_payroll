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
    <div className="flex h-screen w-full lg:w-[87%] justify-end py-5 roboto px-3 sm:px-5">
      <main className="flex flex-col w-full p-4 sm:p-6 bg-white shadow rounded-lg lg:rounded-l-xl overflow-y-auto">
        {/* Header */}
        <section className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Generate and export system reports.
          </p>
        </section>

        {/* Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border rounded-lg p-4 sm:p-5 shadow-sm bg-white hover:shadow-md hover:scale-[1.02] transition transform"
            >
              <h2 className="text-base sm:text-lg font-semibold mb-2">{report.title}</h2>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                  View
                </button>
                <button className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
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

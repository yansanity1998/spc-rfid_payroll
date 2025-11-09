// src/components/SA/SAGovContribution.tsx
import { useState } from "react";

interface ContributionData {
  sss: number;
  philhealth: number;
  pagibig: number;
  total: number;
}

const SAGovContribution = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Static contribution data for display
  const [contributions] = useState<ContributionData>({
    sss: 1350.00,
    philhealth: 500.00,
    pagibig: 200.00,
    total: 2050.00
  });

  const contributionBreakdown = [
    {
      name: "SSS (Social Security System)",
      amount: contributions.sss,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      description: "Employee and employer contributions for social security benefits"
    },
    {
      name: "PhilHealth",
      amount: contributions.philhealth,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      description: "National health insurance program for all Filipinos"
    },
    {
      name: "Pag-IBIG Fund",
      amount: contributions.pagibig,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      description: "Home Development Mutual Fund for housing and savings"
    }
  ];

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Government Contributions</h1>
              <p className="text-gray-600">SSS, PhilHealth, and Pag-IBIG contributions overview</p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-gray-700 font-semibold">Period:</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Total Contributions Card */}
        <div className="mb-8">
          <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Total Monthly Contributions</h2>
                      <p className="text-yellow-100 text-sm">Combined government mandated contributions</p>
                    </div>
                  </div>
                  <p className="text-5xl font-bold mt-4">₱{contributions.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Contribution Breakdown Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Contribution Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contributionBreakdown.map((item, index) => (
              <div
                key={index}
                className="group relative overflow-hidden bg-white border-2 border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-yellow-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
                <div className={`${item.bgColor} rounded-xl p-4 mt-4`}>
                  <p className="text-sm text-gray-600 mb-1">Monthly Contribution</p>
                  <p className={`text-3xl font-bold ${item.textColor}`}>
                    ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-gradient-to-r from-blue-50 to-yellow-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">About Government Contributions</h3>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>SSS:</strong> Provides social security protection to workers and their beneficiaries against sickness, maternity, disability, retirement, death, and other contingencies.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>PhilHealth:</strong> Ensures sustainable, affordable, and progressive social health insurance for all Filipinos.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>Pag-IBIG:</strong> Provides affordable shelter financing and encourages savings mobilization among Filipino workers.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Rates Table */}
        <div className="mt-8 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Standard Contribution Rates</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Agency</th>
                  <th className="px-6 py-4 text-left font-semibold">Employee Share</th>
                  <th className="px-6 py-4 text-left font-semibold">Employer Share</th>
                  <th className="px-6 py-4 text-left font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">SSS</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">4.5%</td>
                  <td className="px-6 py-4 text-gray-700">9.5%</td>
                  <td className="px-6 py-4 font-bold text-blue-600">14%</td>
                </tr>
                <tr className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">PhilHealth</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">2.5%</td>
                  <td className="px-6 py-4 text-gray-700">2.5%</td>
                  <td className="px-6 py-4 font-bold text-green-600">5%</td>
                </tr>
                <tr className="hover:bg-orange-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">Pag-IBIG</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">2%</td>
                  <td className="px-6 py-4 text-gray-700">2%</td>
                  <td className="px-6 py-4 font-bold text-orange-600">4%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Note Section */}
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-bold text-yellow-800 mb-1">Note</h4>
              <p className="text-sm text-yellow-700">
                This is a static display showing standard government contribution rates. Actual contributions may vary based on salary brackets and current government regulations. Please consult with HR for accurate contribution calculations.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SAGovContribution;

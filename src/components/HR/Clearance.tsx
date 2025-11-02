// src/components/HR/Clearance.tsx

export const Clearance = () => {

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-100">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Clearance Management</h1>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">Manage faculty clearance records and approvals</p>
            </div>
          </div>
        </section>

        {/* Content will be added here */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Clearance Module</h3>
            <p className="text-gray-500">Content coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

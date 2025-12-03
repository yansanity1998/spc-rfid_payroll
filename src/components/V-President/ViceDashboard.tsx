import { useEffect, useState, useMemo } from "react";
import supabase from "../../utils/supabase";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

const ViceDashboard = () => {
	const [recent, setRecent] = useState<any[]>([]);
	const [gatePassRequests, setGatePassRequests] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const getEmployeeTypeColor = (role: string) => {
		switch (role) {
			case "Administrator":
				return "from-purple-500 to-purple-600 text-purple-800 bg-purple-100";
			case "HR Personnel":
				return "from-blue-500 to-blue-600 text-blue-800 bg-blue-100";
			case "Accounting":
				return "from-green-500 to-green-600 text-green-800 bg-green-100";
			case "Faculty":
				return "from-red-500 to-red-600 text-red-800 bg-red-100";
			case "Staff":
				return "from-orange-500 to-orange-600 text-orange-800 bg-orange-100";
			case "SA":
				return "from-yellow-500 to-yellow-600 text-yellow-800 bg-yellow-100";
			case "Guard":
				return "from-teal-500 to-teal-600 text-teal-800 bg-teal-100";
			default:
				return "from-gray-500 to-gray-600 text-gray-800 bg-gray-100";
		}
	};

	const formatPhilippineTime = (dateString: string) => {
		let date: Date;
		if (dateString.includes('T')) {
			if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
				date = new Date(dateString + 'Z');
			} else {
				date = new Date(dateString);
			}
		} else {
			date = new Date(dateString + 'T00:00:00Z');
		}
		return date.toLocaleTimeString('en-PH', {
			timeZone: 'Asia/Manila',
			hour12: true,
			hour: 'numeric',
			minute: '2-digit'
		});
	};

	const fetchDashboardData = async () => {
		setLoading(true);
		try {
			const today = new Date().toISOString().split("T")[0];

			const { data, error } = await supabase
				.from("attendance")
				.select("id, user_id, time_in, time_out, users(name, role)")
				.eq("att_date", today)
				.order("time_in", { ascending: false });

			if (error) {
				console.error(error);
				return;
			}

			if (data) {
				setRecent(data.slice(0, 10));
			}

			const { data: gatePassData, error: gatePassError } = await supabase
				.from('requests')
				.select('*')
				.eq('request_type', 'Gate Pass')
				.order('created_at', { ascending: false });

			if (!gatePassError && gatePassData) {
				setGatePassRequests(gatePassData);
			}
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const gatePassStats = useMemo(() => {
		const pending = gatePassRequests.filter(req => req.status === 'Pending').length;
		const approved = gatePassRequests.filter(req => req.status === 'Approved').length;
		const guardApproved = gatePassRequests.filter(req => req.status === 'Guard Approved').length;
		const rejected = gatePassRequests.filter(req => req.status === 'Rejected').length;
		const total = gatePassRequests.length;

		return { pending, approved, guardApproved, rejected, total };
	}, [gatePassRequests]);

	const gatePassStatusData = useMemo(() => {
		const pending = gatePassRequests.filter(req => req.status === 'Pending').length;
		const approved = gatePassRequests.filter(req => req.status === 'Approved').length;
		const guardApproved = gatePassRequests.filter(req => req.status === 'Guard Approved').length;
		const rejected = gatePassRequests.filter(req => req.status === 'Rejected').length;

		return {
			labels: ['Pending', 'Dean Approved', 'Guard Approved', 'Rejected'],
			datasets: [{
				data: [pending, approved, guardApproved, rejected],
				backgroundColor: [
					'rgba(234, 179, 8, 0.8)',
					'rgba(34, 197, 94, 0.8)',
					'rgba(59, 130, 246, 0.8)',
					'rgba(239, 68, 68, 0.8)',
				],
				borderColor: [
					'rgba(234, 179, 8, 1)',
					'rgba(34, 197, 94, 1)',
					'rgba(59, 130, 246, 1)',
					'rgba(239, 68, 68, 1)',
				],
				borderWidth: 2,
			}]
		};
	}, [gatePassRequests]);

	return (
		<div className="min-h-screen w-full lg:ml-70 py-8 roboto px-4 sm:px-6 bg-red-50">
			<main className="flex flex-col w-full max-w-7xl mx-auto">
				<section className="flex-shrink-0 space-y-6">
					<div className="mb-6">
						<div className="flex items-center gap-3 mb-2">
							<div className="w-12 h-12 bg-gradient-to-br from-red-700 to-red-800 rounded-xl flex items-center justify-center shadow-md">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">Vice President Dashboard</h1>
								<p className="text-sm text-gray-600">Executive monitoring and attendance tracking</p>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						<div className="group relative overflow-hidden bg-gradient-to-br from-red-700 to-red-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
							<div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
							<div className="relative z-10 flex items-center justify-between">
								<div className="text-white">
									<div className="flex items-center gap-3 mb-3">
										<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
											<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<h2 className="text-lg font-semibold">Total Requests</h2>
									</div>
									<p className="text-3xl font-bold">{gatePassStats.total}</p>
									<p className="text-red-100 text-sm mt-1">All gate passes</p>
								</div>
							</div>
							<div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
						</div>

						<div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
							<div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
							<div className="relative z-10 flex items-center justify-between">
								<div className="text-white">
									<div className="flex items-center gap-3 mb-3">
										<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
											<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<h2 className="text-lg font-semibold">Pending</h2>
									</div>
									<p className="text-3xl font-bold">{gatePassStats.pending}</p>
									<p className="text-yellow-100 text-sm mt-1">Awaiting approval</p>
								</div>
							</div>
							<div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
						</div>

						<div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
							<div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
							<div className="relative z-10 flex items-center justify-between">
								<div className="text-white">
									<div className="flex items-center gap-3 mb-3">
										<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
											<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<h2 className="text-lg font-semibold">Dean Approved</h2>
									</div>
									<p className="text-3xl font-bold">{gatePassStats.approved}</p>
									<p className="text-green-100 text-sm mt-1">Ready for guard</p>
								</div>
							</div>
							<div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
						</div>

						<div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
							<div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
							<div className="relative z-10 flex items-center justify-between">
								<div className="text-white">
									<div className="flex items-center gap-3 mb-3">
										<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
											<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										</div>
										<h2 className="text-lg font-semibold">Guard Approved</h2>
									</div>
									<p className="text-3xl font-bold">{gatePassStats.guardApproved}</p>
									<p className="text-blue-100 text-sm mt-1">Exit approved</p>
								</div>
							</div>
							<div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
						</div>
					</div>

					<div className="mt-6">
						<div className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-xl flex items-center justify-center">
									<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
									</svg>
								</div>
								<h2 className="text-lg font-bold text-gray-800">Gate Pass Status Distribution</h2>
							</div>
							<div className="h-80 flex items-center justify-center">
								{gatePassRequests.length > 0 ? (
									<Doughnut data={gatePassStatusData} options={{ 
										maintainAspectRatio: false, 
										responsive: true,
										plugins: {
											legend: {
												position: 'bottom',
												labels: {
													padding: 20,
													font: {
														size: 13
													}
												}
											},
											tooltip: {
												callbacks: {
													label: function(context) {
														const label = context.label || '';
														const value = context.parsed || 0;
														const total = gatePassRequests.length;
														const percentage = ((value / total) * 100).toFixed(1);
														return `${label}: ${value} (${percentage}%)`;
													}
												}
											}
										}
									}} />
								) : (
									<div className="text-center text-gray-500">
										<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
											<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<p className="font-medium">No gate pass requests available</p>
										<p className="text-sm mt-1">Gate pass data will appear here</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</section>

				<div className="bg-gray-50 border border-gray-200 shadow-xl rounded-2xl mt-6 sm:mt-10 overflow-hidden min-h-[400px]">
					<div className="p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-xl flex items-center justify-center">
								<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h1 className="text-xl font-bold text-gray-800">Recent Activity</h1>
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full border-collapse text-sm sm:text-base">
							<thead className="bg-gradient-to-r from-red-700 to-red-800 text-white sticky top-0 z-10">
								<tr>
									<th className="px-3 sm:px-4 py-2 text-left border-b">Name</th>
									<th className="px-3 sm:px-4 py-2 text-left border-b">Employee Type</th>
									<th className="px-3 sm:px-4 py-2 text-left border-b">Time In</th>
									<th className="px-3 sm:px-4 py-2 text-left border-b">Time Out</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={4} className="text-center py-8">
											<div className="flex items-center justify-center gap-3">
												<div className="w-6 h-6 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></div>
												<span className="text-gray-600 font-medium">Loading recent activity...</span>
											</div>
										</td>
									</tr>
								) : recent.length > 0 ? (
									recent.map((r) => (
										<tr key={r.id} className="hover:bg-white/80 transition-all duration-200 group">
											<td className="px-3 sm:px-4 py-4 border-b border-gray-200">
												<span className="font-semibold text-gray-800">{r.users?.name || "Unknown"}</span>
											</td>
											<td className="px-3 sm:px-4 py-4 border-b border-gray-200">
												<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getEmployeeTypeColor(r.users?.role).split(' ').slice(2).join(' ')}`}>
													{r.users?.role || 'N/A'}
												</span>
											</td>
											<td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-medium text-gray-700">
												{r.time_in
														? formatPhilippineTime(r.time_in)
														: "-"}
											</td>
											<td className="px-3 sm:px-4 py-4 border-b border-gray-200 font-medium text-gray-700">
												{r.time_out
														? formatPhilippineTime(r.time_out)
														: "-"}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={4} className="text-center py-12">
											<div className="flex flex-col items-center gap-4">
												<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
													<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
												<div className="text-center">
													<h3 className="text-lg font-semibold text-gray-800 mb-1">No Activity Today</h3>
													<p className="text-gray-500">No attendance records found for today.</p>
													<button 
														onClick={fetchDashboardData}
														className="mt-3 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm font-medium"
													>
														Refresh Data
													</button>
												</div>
											</div>
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

export default ViceDashboard;


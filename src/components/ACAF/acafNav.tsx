// src/components/ACAF/acafNav.tsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "../../utils/supabase";
import { useState, useEffect } from "react";
import { Settings } from "../Settings/Settings";

export const AcafNav = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const [userEmail, setUserEmail] = useState<string>("");
	const [userProfilePicture, setUserProfilePicture] = useState<string>("");
	const [userName, setUserName] = useState<string>("");
	const [userPosition, setUserPosition] = useState<string>("");
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		const getUser = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (user?.email) {
				setUserEmail(user.email);
				supabase
					.from('users')
					.select('profile_picture, name, positions')
					.eq('auth_id', user.id)
					.single()
					.then(({ data: userData, error }) => {
						if (userData && !error) {
							setUserProfilePicture(userData.profile_picture || '');
							setUserName(userData.name || '');
							setUserPosition(userData.positions || '');
						}
					});
			}
		};
		getUser();
	}, []);

	const menu = [
		{ key: "dashboard", label: "Dashboard", link: "/ACAF/dashboard" },
		{ key: "approvals", label: "Approvals", link: "/ACAF/approvals" },
		{ key: "requests", label: "Requests", link: "/ACAF/requests" },
	];

	const getMenuIcon = (key: string) => {
		const iconClass = "w-5 h-5";
		switch (key) {
			case "dashboard":
				return (
					<svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
					</svg>
				);
			case "approvals":
				return (
					<svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				);
			case "requests":
				return (
					<svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				);
			default:
				return (
					<svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				);
		}
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		navigate("/");
	};

	return (
		<>
			{/* Hamburger button (mobile only) */}
			<div
				className="lg:hidden border border-gray-500/40 bg-white p-1 rounded-full fixed top-4 left-4 z-50"
				onClick={() => setMenuOpen(!menuOpen)}
			>
				<button className="relative w-5 h-5 flex flex-col justify-between items-center p-1">
					<span
						className={`block h-0.5 w-full bg-gray-800 transform transition-all duration-300 ease-in-out
							${menuOpen ? "rotate-45 translate-y-2" : ""}`}
					></span>
					<span
						className={`block h-0.5 w-full bg-gray-800 transition-all duration-300 ease-in-out
							${menuOpen ? "opacity-0" : ""}`}
					></span>
					<span
						className={`block h-0.5 w-full bg-gray-800 transform transition-all duration-300 ease-in-out
							${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
					></span>
				</button>
			</div>

			{/* Sidebar (desktop) */}
			<div className="hidden lg:flex w-70 min-h-screen fixed left-0 top-0 pr-2 py-6 flex-col justify-between bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 shadow-2xl z-30">
				<div>
					{/* Profile Section */}
					<div className="flex flex-col items-center justify-center px-4 py-4 mb-4">
						<div className="relative">
							<div className="relative">
								{userProfilePicture ? (
									<img 
										src={userProfilePicture} 
										alt="Profile" 
										className="h-20 w-20 rounded-full object-cover ring-4 ring-white/30 shadow-xl" 
									/>
								) : (
									<div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-white/30 shadow-xl">
										{userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
									</div>
								)}
							</div>
						</div>
						<div className="text-center mt-3">
							<p className="text-white text-lg font-bold">ACAF{userPosition && ` (${userPosition})`}</p>
						</div>
					</div>
          
					{/* Navigation */}
					<nav className="flex flex-col px-4 space-y-2">
						{menu.map((item) => (
							<Link
								key={item.key}
								to={item.link}
								className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
									location.pathname === item.link
										? "bg-white/20 border-white/30 text-white shadow-lg scale-[1.02]"
										: "bg-white/5 border-white/10 text-white/90 hover:text-white hover:bg-white/20"
								}`}
							>
								<span className="relative z-10 flex items-center gap-3">
									{getMenuIcon(item.key)}
									{item.label}
								</span>
								<div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							</Link>
						))}
					</nav>
				</div>
        
				{/* User Info Section at Bottom with Dropdown */}
				<div className="p-4">
					<div className="relative">
						<div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
							<div className="flex-1 min-w-0">
								<h2 className="text-white font-bold text-sm tracking-wide truncate">
									{userName || "ACAF"}
								</h2>
								{userEmail && <p className="text-white/70 text-xs font-medium truncate">{userEmail}</p>}
							</div>
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="ml-2 text-white hover:text-white/80 transition-colors duration-200"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
						{dropdownOpen && (
							<div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
								<button
									onClick={() => {
										setSettingsOpen(true);
										setDropdownOpen(false);
									}}
									className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<span className="font-medium">Settings</span>
								</button>
								<button
									onClick={() => {
										handleLogout();
										setDropdownOpen(false);
									}}
									className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 border-t border-gray-200"
								>
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
									</svg>
									<span className="font-medium">Logout</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Mobile overlay */}
			{menuOpen && (
				<div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-40 lg:hidden">
					<div className="fixed top-0 left-0 w-72 h-full bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 shadow-2xl flex flex-col justify-between">
						<div>
							<div className="flex flex-col items-center justify-center px-4 py-3 mb-3">
								<div className="relative">
									<div className="relative">
										{userProfilePicture ? (
											<img 
												src={userProfilePicture} 
												alt="Profile" 
												className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30 shadow-xl" 
											/>
										) : (
											<div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white/30 shadow-xl">
												{userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
								</div>
								<div className="text-center mt-2">
									<p className="text-white text-sm font-bold">ACAF{userPosition && ` (${userPosition})`}</p>
								</div>
							</div>
              
							{/* Mobile Navigation */}
							<nav className="flex flex-col px-4 space-y-2">
								{menu.map((item) => (
									<Link
										key={item.key}
										to={item.link}
										onClick={() => setMenuOpen(false)}
										className={`group relative overflow-hidden backdrop-blur-sm border block w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium ${
											location.pathname === item.link
												? "bg-white/20 border-white/30 text-white shadow-lg scale-[1.02]"
												: "bg-white/5 border-white/10 text-white/90 hover:text-white hover:bg-white/20"
										}`}
									>
										<span className="relative z-10 flex items-center gap-3">
											{getMenuIcon(item.key)}
											{item.label}
										</span>
										<div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
									</Link>
								))}
							</nav>
						</div>
            
						{/* Mobile User Info */}
						<div className="p-4">
							<div className="relative">
								<div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl">
									<div className="flex-1 min-w-0">
										<h2 className="text-white font-bold text-sm tracking-wide truncate">
											{userName || "ACAF"}
										</h2>
										{userEmail && <p className="text-white/70 text-xs font-medium truncate">{userEmail}</p>}
									</div>
									<button
										onClick={() => setDropdownOpen(!dropdownOpen)}
										className="ml-2 text-white hover:text-white/80 transition-colors duration-200"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
								</div>
								{dropdownOpen && (
									<div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
										<button
											onClick={() => {
												setSettingsOpen(true);
												setDropdownOpen(false);
												setMenuOpen(false);
											}}
											className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
										>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											<span className="font-medium">Settings</span>
										</button>
										<button
											onClick={() => {
												handleLogout();
												setDropdownOpen(false);
												setMenuOpen(false);
											}}
											className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 border-t border-gray-200"
										>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
											</svg>
											<span className="font-medium">Logout</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			<Settings
				isOpen={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				onUpdate={(updatedData: { name: string; profile_picture: string }) => {
					setUserName(updatedData.name);
					setUserProfilePicture(updatedData.profile_picture);
				}}
			/>
		</>
	);
};

import { useState, useEffect, useMemo } from "react";
import supabase from "../../../utils/supabase";
import toast from "react-hot-toast";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  positions?: string;
  age?: number;
  gender?: string;
  address?: string;
  contact_no?: string;
  status: string;
  created_at: string;
  hiredDate?: string;
  department?: string;
}

interface Scholarship {
  id: number;
  user_id: number;
  has_scholarship: boolean;
  scholarship_period?: string;
  school_year?: string;
  amount?: number;
  notes?: string;
}

interface EmployeeReportProps {
  onBack: () => void;
}

export const EmployeeReport = ({ onBack }: EmployeeReportProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [scholarshipFilter, setScholarshipFilter] = useState<string>("All");

  // Role color system - solid colors with visible text
  const getRoleColor = (role: string) => {
    switch (role) {
      case "Administrator":
        return "bg-purple-100 text-purple-800 border border-purple-300";
      case "HR Personnel":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "Accounting":
        return "bg-green-100 text-green-800 border border-green-300";
      case "Faculty":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Staff":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      case "SA":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Guard":
        return "bg-teal-100 text-teal-800 border border-teal-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employee data");
      } else {
        setEmployees(data || []);
      }

      // Fetch scholarship data for Faculty users
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from("scholarship")
        .select("*");

      if (scholarshipError) {
        console.error("Error fetching scholarships:", scholarshipError);
      } else {
        setScholarships(scholarshipData || []);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter((employee) => {
      const matchesRole = selectedRole === "All" || employee.role === selectedRole;
      const matchesSearch = 
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Scholarship filter
      let matchesScholarship = true;
      if (scholarshipFilter === "Active Scholarship") {
        const hasScholarship = scholarships.find(s => s.user_id === employee.id && s.has_scholarship);
        matchesScholarship = !!hasScholarship;
      } else if (scholarshipFilter === "No Scholarship") {
        const hasScholarship = scholarships.find(s => s.user_id === employee.id && s.has_scholarship);
        matchesScholarship = !hasScholarship;
      }
      
      return matchesRole && matchesSearch && matchesScholarship;
    });

    // Sort employees
    filtered.sort((a, b) => {
      // Regular sorting for fields
      let aValue: any = a[sortBy as keyof Employee];
      let bValue: any = b[sortBy as keyof Employee];

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [employees, selectedRole, searchTerm, sortBy, sortOrder, scholarships, scholarshipFilter]);

  // Get unique roles for filter dropdown
  const availableRoles = useMemo(() => {
    const roles = [...new Set(employees.map(emp => emp.role))].filter(Boolean);
    return ["All", ...roles.sort()];
  }, [employees]);

  // Get scholarship for employee
  const getScholarship = (userId: number) => {
    return scholarships.find(s => s.user_id === userId && s.has_scholarship);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredAndSortedEmployees.map(emp => {
      const scholarship = getScholarship(emp.id);
      return {
        Name: emp.name || "",
        Email: emp.email || "",
        Role: emp.role || "",
        Position: emp.positions || "",
        Department: emp.department || "",
        Age: emp.age || "",
        Gender: emp.gender || "",
        Address: emp.address || "",
        Contact: emp.contact_no || "",
        Status: emp.status || "",
        "Hired Date": emp.hiredDate ? new Date(emp.hiredDate).toLocaleDateString() : "",
        "Date Created": new Date(emp.created_at).toLocaleDateString(),
        ...(emp.role === "Faculty" && {
          "Has Scholarship": scholarship ? "Yes" : "No",
          "Scholarship Period": scholarship?.scholarship_period || "",
          "School Year": scholarship?.school_year || "",
          "Scholarship Amount": scholarship?.amount || ""
        })
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employee_report_${selectedRole}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Employee report exported successfully!");
  };

  // Print functionality (use filtered data)
  const handlePrint = async () => {
    // Use the already filtered and sorted employees
    const dataset = filteredAndSortedEmployees;
    const scholarshipDataset = scholarships;

    const printContent = `
      <html>
        <head>
          <title>Employee Report - All</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            h1 { color: #dc2626; text-align: center; margin-bottom: 30px; }
            .header { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .role-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; }
            .status-active { color: green; font-weight: bold; }
            .status-inactive { color: red; font-weight: bold; }
            .address-cell { max-width: 120px; word-wrap: break-word; }
            @media print {
              body { margin: 10px; }
              table { font-size: 10px; }
              th, td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <h1>Employee Report</h1>
          <div class="header">
            <p><strong>Role Filter:</strong> ${selectedRole}</p>
            <p><strong>Scholarship Filter:</strong> ${scholarshipFilter}</p>
            <p><strong>Total Employees:</strong> ${dataset.length}</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Position</th>
                <th>Department</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Hired Date</th>
                <th>Status</th>
                <th>Scholarship</th>
              </tr>
            </thead>
            <tbody>
              ${dataset.map(emp => {
                const scholarship = scholarshipDataset.find(s => s.user_id === emp.id && s.has_scholarship);
                return `
                <tr>
                  <td>${emp.name || "N/A"}</td>
                  <td>${emp.email || "N/A"}</td>
                  <td>${emp.role || "N/A"}</td>
                  <td>${emp.positions || "N/A"}</td>
                  <td>${emp.department || "N/A"}</td>
                  <td>${emp.age || "N/A"}</td>
                  <td>${emp.gender || "N/A"}</td>
                  <td class="address-cell">${emp.address || "N/A"}</td>
                  <td>${emp.contact_no || "N/A"}</td>
                  <td>${emp.hiredDate ? new Date(emp.hiredDate).toLocaleDateString() : "N/A"}</td>
                  <td class="status-${emp.status?.toLowerCase()}">${emp.status || "N/A"}</td>
                  <td>${emp.role === "Faculty" ? (scholarship ? `Yes (${scholarship.scholarship_period}, ${scholarship.school_year})` : "No") : "N/A"}</td>
                </tr>
              `;
              }).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast.success("Print dialog opened!");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-64 py-5 roboto bg-red-200 flex items-start justify-center">
        <main className="flex flex-col w-full max-w-6xl p-3 sm:p-4 bg-white border border-gray-200 shadow-2xl rounded-2xl mx-4">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading employee data...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-64 py-5 roboto bg-red-200 flex items-start justify-center">
      <main className="flex flex-col w-full max-w-6xl p-3 sm:p-4 bg-white border border-gray-200 shadow-2xl rounded-2xl mx-4">
        {/* Header */}
        <section className="flex-shrink-0 space-y-4">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Reports</h1>
            </div>
            <p className="text-gray-600">Comprehensive employee information and role-based filtering</p>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Employees</p>
                <p className="text-2xl font-bold">{employees.filter(emp => emp.status === "Active").length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Filtered Results</p>
                <p className="text-2xl font-bold">{filteredAndSortedEmployees.length}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Roles</p>
                <p className="text-2xl font-bold">{availableRoles.length - 1}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Role Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Scholarship Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scholarship Status</label>
              <select
                value={scholarshipFilter}
                onChange={(e) => setScholarshipFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="All">All Employees</option>
                <option value="Active Scholarship">Active Scholarship</option>
                <option value="No Scholarship">No Scholarship</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="name">Name</option>
                <option value="role">Role</option>
                <option value="email">Email</option>
                <option value="department">Department</option>
                <option value="gender">Gender</option>
                <option value="hiredDate">Hired Date</option>
                <option value="created_at">Date Created</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={exportToCSV}
              disabled={filteredAndSortedEmployees.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredAndSortedEmployees.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>

            <button
              onClick={fetchEmployees}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Hired</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Scholarship</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredAndSortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500">No employees found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{employee.name || "—"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{employee.email || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getRoleColor(employee.role)}`}>
                          {employee.role || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employee.positions || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employee.department || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          <div>{employee.age || "—"} • {employee.gender || "—"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          <div>{employee.contact_no || "—"}</div>
                          <div className="text-gray-400 max-w-xs truncate mt-0.5" title={employee.address}>
                            {employee.address || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employee.hiredDate ? new Date(employee.hiredDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          employee.status === "Active" 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {employee.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {employee.role === "Faculty" ? (
                          (() => {
                            const scholarship = getScholarship(employee.id);
                            return scholarship ? (
                              <div className="text-xs">
                                <span className="inline-flex px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
                                  Active
                                </span>
                                <div className="text-gray-500 mt-1">
                                  {scholarship.scholarship_period}
                                </div>
                                <div className="text-gray-400">
                                  {scholarship.school_year}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredAndSortedEmployees.length} of {employees.length} employees
              {selectedRole !== "All" && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  Role: {selectedRole}
                </span>
              )}
            </div>
            <div>
              Generated on {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeReport;

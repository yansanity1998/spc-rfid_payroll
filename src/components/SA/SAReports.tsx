// src/components/SA/SAReports.tsx
import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";

const SAReports = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<{
    totalStudents: number;
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    studentsByCourse: Array<{ course: string; count: number }>;
    studentsByYear: Array<{ year: string; count: number }>;
    eventsByType: Array<{ type: string; count: number }>;
    eventsByMonth: Array<{ month: string; count: number }>;
  }>({
    totalStudents: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    studentsByCourse: [],
    studentsByYear: [],
    eventsByType: [],
    eventsByMonth: []
  });

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch students data
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("course, year_level");

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      }

      // Fetch events data
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("event_type, status, event_date, created_at");

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
      }

      // Process data
      const totalStudents = students?.length || 0;
      const totalEvents = events?.length || 0;
      const upcomingEvents = events?.filter(event => 
        new Date(event.event_date) >= new Date() && event.status !== "Completed"
      ).length || 0;
      const completedEvents = events?.filter(event => event.status === "Completed").length || 0;

      // Group students by course
      const courseGroups = students?.reduce((acc: Record<string, number>, student: any) => {
        if (student.course) {
          acc[student.course] = (acc[student.course] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const studentsByCourse = Object.entries(courseGroups).map(([course, count]) => ({
        course,
        count: count as number
      }));

      // Group students by year level
      const yearGroups = students?.reduce((acc: Record<string, number>, student: any) => {
        if (student.year_level) {
          acc[student.year_level] = (acc[student.year_level] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const studentsByYear = Object.entries(yearGroups).map(([year, count]) => ({
        year,
        count: count as number
      }));

      // Group events by type
      const typeGroups = events?.reduce((acc: Record<string, number>, event: any) => {
        if (event.event_type) {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const eventsByType = Object.entries(typeGroups).map(([type, count]) => ({
        type,
        count: count as number
      }));

      // Group events by month (current year)
      const currentYear = new Date().getFullYear();
      const monthGroups = events?.filter(event => 
        event.event_date && new Date(event.event_date).getFullYear() === currentYear
      ).reduce((acc: Record<number, number>, event: any) => {
        const month = new Date(event.event_date).getMonth();
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {}) || {};

      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      const eventsByMonth = monthNames.map((month, index) => ({
        month,
        count: monthGroups[index] || 0
      }));

      setReportData({
        totalStudents,
        totalEvents,
        upcomingEvents,
        completedEvents,
        studentsByCourse: studentsByCourse as Array<{ course: string; count: number }>,
        studentsByYear: studentsByYear as Array<{ year: string; count: number }>,
        eventsByType: eventsByType as Array<{ type: string; count: number }>,
        eventsByMonth: eventsByMonth as Array<{ month: string; count: number }>
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => row[header]).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
        <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-red-700 font-medium">Loading reports...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:ml-70 py-5 roboto px-3 sm:px-5 bg-red-200">
      <main className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl">
        <section className="flex-shrink-0 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SA Reports & Analytics</h1>
          <p className="text-gray-600">Student Affairs reports and data insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.totalEvents}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.upcomingEvents}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Events</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.completedEvents}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Students by Course */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Students by Course</h3>
              <button
                onClick={() => exportToCSV(reportData.studentsByCourse, "students-by-course")}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-4">
              {reportData.studentsByCourse.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.course}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${reportData.totalStudents > 0 ? (item.count / reportData.totalStudents) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Students by Year Level */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Students by Year Level</h3>
              <button
                onClick={() => exportToCSV(reportData.studentsByYear, "students-by-year")}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-4">
              {reportData.studentsByYear.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.year}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${reportData.totalStudents > 0 ? (item.count / reportData.totalStudents) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Events by Type */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Events by Type</h3>
              <button
                onClick={() => exportToCSV(reportData.eventsByType, "events-by-type")}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-4">
              {reportData.eventsByType.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${reportData.totalEvents > 0 ? (item.count / reportData.totalEvents) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Events by Month */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Events by Month ({new Date().getFullYear()})</h3>
              <button
                onClick={() => exportToCSV(reportData.eventsByMonth, "events-by-month")}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-4">
              {reportData.eventsByMonth.map((item: any, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.month}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${Math.max(...reportData.eventsByMonth.map((m: any) => m.count)) > 0 ? 
                            (item.count / Math.max(...reportData.eventsByMonth.map((m: any) => m.count))) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export All Data */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Export All Data</h3>
          <div className="flex gap-4">
            <button
              onClick={() => exportToCSV(reportData.studentsByCourse, "students-by-course")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Export Students by Course
            </button>
            <button
              onClick={() => exportToCSV(reportData.studentsByYear, "students-by-year")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Export Students by Year
            </button>
            <button
              onClick={() => exportToCSV(reportData.eventsByType, "events-by-type")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Export Events by Type
            </button>
            <button
              onClick={() => exportToCSV(reportData.eventsByMonth, "events-by-month")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Export Events by Month
            </button>
          </div>
        </div>
        </section>
      </main>
    </div>
  );
};

export default SAReports;

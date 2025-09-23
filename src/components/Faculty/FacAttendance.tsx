import { useEffect, useState } from "react";
import supabase from "../../utils/supabase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PersonalAttendance = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("id", user.id)
        .order("att_date", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        console.log(data);
        setAttendance(data || []);
      }

      setLoading(false);
    };

    fetchAttendance();
  }, []);

  // --- Weekly work hours ---
  const weeklyData: { [key: string]: number } = {};
  attendance.forEach((record) => {
    if (!record.att_date) return;

    const d = new Date(record.att_date);
    const year = d.getFullYear();

    // Week number calculation
    const firstDay = new Date(year, 0, 1);
    const pastDays = Math.floor(
      (d.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

    const label = `Week ${weekNum} - ${year}`;
    weeklyData[label] = (weeklyData[label] || 0) + (record.hours_worked || 0);
  });

  const chartData = {
    labels: Object.keys(weeklyData),
    datasets: [
      {
        label: "Total Hours Worked (per week)",
        data: Object.values(weeklyData),
        backgroundColor: "rgba(220, 38, 38, 0.7)",
      },
    ],
  };

  if (loading) return <div>Loading attendance...</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">My Attendance</h1>

      {/* Chart */}
      <div className="bg-white p-4 rounded shadow-md">
        <h2 className="text-lg font-semibold mb-4">Weekly Work Hours</h2>
        <Bar data={chartData} />
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded shadow-md">
        <h2 className="text-lg font-semibold mb-4">Daily Logs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Time In</th>
                <th className="p-2 border">Time Out</th>
                <th className="p-2 border">Hours Worked</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((log, idx) => (
                <tr key={idx} className="text-center">
                  <td className="p-2 border">{log.att_date}</td>
                  <td className="p-2 border">{log.time_in || "-"}</td>
                  <td className="p-2 border">{log.time_out || "-"}</td>
                  <td className="p-2 border">
                    {log.hours_worked?.toFixed(1) || "-"}
                  </td>
                  <td className="p-2 border">{log.status}</td>
                  <td className="p-2 border">{log.remarks || "-"}</td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-gray-500">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PersonalAttendance;

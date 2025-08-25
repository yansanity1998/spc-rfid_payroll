import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { LogIn } from "./components/authAdmin/LogIn";
import { UserManagement } from "./components/HRAdmin/UserManagement";
import { Attendance } from "./components/HRAdmin/Attendance";
import { Payroll } from "./components/HRAdmin/Payroll";
import { Requests } from "./components/HRAdmin/Requests";
import Reports from "./components/HRAdmin/Reports";
import Dashboard from "./components/HRAdmin/Dashboard";

function AppContent() {
  const location = useLocation();

  const standalonePage = location.pathname === "/";

  return (
    <>
      <main className="flex bg-gray-50">
        {!standalonePage && <NavBar />}

        <Routes>
          <Route path="/" element={<LogIn />} />

          {/* HR ADMIN */}
          <Route path="/hrAdmin/dashboard" element={<Dashboard />} />
          <Route path="/hrAdmin/userManagement" element={<UserManagement />} />
          <Route path="/hrAdmin/attendance" element={<Attendance />} />
          <Route path="/hrAdmin/payroll" element={<Payroll />} />
          <Route path="/hrAdmin/requests" element={<Requests />} />
          <Route path="/hrAdmin/reports" element={<Reports />} />

          {/* ACCOUNTING */}
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

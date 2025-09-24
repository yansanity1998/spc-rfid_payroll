import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { NavBar } from "./components/HRAdmin/NavBar";
import { LogIn } from "./components/authAdmin/LogIn";
import { LandingPage } from "./components/LandingPage";
import { UserManagement } from "./components/HRAdmin/UserManagement";
import { Attendance } from "./components/HRAdmin/Attendance";
import { Payroll } from "./components/HRAdmin/Payroll";
import { Requests } from "./components/HRAdmin/Requests";
import Reports from "./components/HRAdmin/Reports";
import Dashboard from "./components/HRAdmin/Dashboard";
import AccDashboard from "./components/Accounting/Dashboard";
import { NavAccounting } from "./components/Accounting/NavAcc";
import { PayrollAcc } from "./components/Accounting/PayrollAcc";
import { NavGuard } from "./components/Guard/NavGuard";
import GuardDashboard from "./components/Guard/GuardDashboard";
import GuardReports from "./components/Guard/GuardReports";
import FacDashboard from "./components/Faculty/FacDashboard";
import { FacNav } from "./components/Faculty/FacNav";
import Scanner from "./components/authAdmin/Scanner";
import FacAttendance from "./components/Faculty/FacAttendance";
import { FacRequest } from "./components/Faculty/FacRequest";
import SADashboard from "./components/SA/SADashboard";
import SAAttendance from "./components/SA/SAAttendance";
import SAReports from "./components/SA/SAReports";
import SAEvents from "./components/SA/SAEvents";
import SARequest from "./components/SA/SARequest";
import { SANav } from "./components/SA/SANav";
import DiagnoseSARole from "./components/SA/DiagnoseSARole";

function AppContent() {
  const location = useLocation();

  const showNavBarHR = location.pathname.startsWith("/hrAdmin");
  const showNavBarACC = location.pathname.startsWith("/accounting");
  const showNavBarGuard = location.pathname.startsWith("/Guard");
  const showNavBarFaculty = location.pathname.startsWith("/Faculty");
  const showNavBarSA = location.pathname.startsWith("/SA");
  
  // Check if current route should show full-screen layout (no navigation bars)
  const isFullScreenRoute = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/scanner";

  return (
    <>
      <main className={isFullScreenRoute ? "" : "flex bg-gray-50"}>
        {!isFullScreenRoute && showNavBarHR && <NavBar />}
        {!isFullScreenRoute && showNavBarACC && <NavAccounting />}
        {!isFullScreenRoute && showNavBarGuard && <NavGuard />}
        {!isFullScreenRoute && showNavBarFaculty && <FacNav />}
        {!isFullScreenRoute && showNavBarSA && <SANav />}

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/scanner" element={<Scanner />}/>

          {/* HR ADMIN */}
          <Route path="/hrAdmin/dashboard" element={<Dashboard />} />
          <Route path="/hrAdmin/userManagement" element={<UserManagement />} />
          <Route path="/hrAdmin/attendance" element={<Attendance />} />
          <Route path="/hrAdmin/payroll" element={<Payroll />} />
          <Route path="/hrAdmin/requests" element={<Requests />} />
          <Route path="/hrAdmin/reports" element={<Reports />} />

          {/* ACCOUNTING */}
          <Route path="/accounting/dashboard" element={<AccDashboard />}/>
          <Route path="/accounting/payroll" element={<PayrollAcc />}/>

          {/* GUARD */}
          <Route path="/Guard/dashboard" element={<GuardDashboard />}/>
          <Route path="/Guard/reports" element={<GuardReports />}/>

          {/* FACULTY */}
          <Route path="/Faculty/dashboard" element={<FacDashboard />} />
          <Route path="/Faculty/attendance" element={<FacAttendance />} />
          <Route path="/Faculty/request" element={<FacRequest />} />

          {/* STUDENT AFFAIRS */}
          <Route path="/SA/dashboard" element={<SADashboard />} />
          <Route path="/SA/attendance" element={<SAAttendance />} />
          <Route path="/SA/events" element={<SAEvents />} />
          <Route path="/SA/request" element={<SARequest />} />
          <Route path="/SA/reports" element={<SAReports />} />

          {/* SA DIAGNOSTIC ROUTES */}
          <Route path="/diagnose-sa" element={<DiagnoseSARole />} />

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

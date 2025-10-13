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
import Schedule from "./components/HRAdmin/Schedule";

// HR Personnel Components
import { NavBar as HRNavBar } from "./components/HR/NavBar";
import HRDashboard from "./components/HR/Dashboard";
import { UserManagement as HRUserManagement } from "./components/HR/UserManagement";
import { Attendance as HRAttendance } from "./components/HR/Attendance";
import { Payroll as HRPayroll } from "./components/HR/Payroll";
import { Requests as HRRequests } from "./components/HR/Requests";
import HRReports from "./components/HR/Reports";
import HRSchedule from "./components/HR/Schedule";
import AccDashboard from "./components/Accounting/Dashboard";
import { NavAccounting } from "./components/Accounting/NavAcc";
import { PayrollAcc } from "./components/Accounting/PayrollAcc";
import { Reports as AccReports } from "./components/Accounting/Reports";
import AccSchedule from "./components/Accounting/AccSchedule";
import { NavGuard } from "./components/Guard/NavGuard";
import GuardDashboard from "./components/Guard/GuardDashboard";
import GuardReports from "./components/Guard/GuardReports";
import GuardScanner from "./components/Guard/GuardScanner";
import { GuardApproval } from "./components/Guard/GuardApproval";
import { DatabaseTest } from "./components/Debug/DatabaseTest";
import FacDashboard from "./components/Faculty/FacDashboard";
import { FacNav } from "./components/Faculty/FacNav";
import Scanner from "./components/authAdmin/Scanner";
import ScheduleScanner from "./components/ScheduleScanner/ScheduleScanner";
import FacAttendance from "./components/Faculty/FacAttendance";
import FacSchedule from "./components/Faculty/FacSchedule";
import { FacPayroll } from "./components/Faculty/FacPayroll";
import { FacRequest } from "./components/Faculty/FacRequest";
import { DeanApproval } from "./components/Faculty/DeanApproval";
import SADashboard from "./components/SA/SADashboard";
import SAAttendance from "./components/SA/SAAttendance";
import SASchedule from "./components/SA/SASchedule";
import { SAPayroll } from "./components/SA/SAPayroll";
import SAReports from "./components/SA/SAReports";
import SAEvents from "./components/SA/SAEvents";
import SARequest from "./components/SA/SARequest";
import { SANav } from "./components/SA/SANav";
import DiagnoseSARole from "./components/SA/DiagnoseSARole";
import DiagnoseGuardRole from "./components/Guard/DiagnoseGuardRole";
import StaffDashboard from "./components/Staff/StaffDashboard";
import StaffAttendance from "./components/Staff/StaffAttendance";
import StaffSchedule from "./components/Staff/StaffSchedule";
import { StaffPayroll } from "./components/Staff/StaffPayroll";
import StaffReports from "./components/Staff/StaffReports";
import { StaffNav } from "./components/Staff/StaffNav";
import DiagnoseStaffRole from "./components/Staff/DiagnoseStaffRole";


function AppContent() {
  const location = useLocation();

  const showNavBarHR = location.pathname.startsWith("/hrAdmin");
  const showNavBarHRPersonnel = location.pathname.startsWith("/HR");
  const showNavBarACC = location.pathname.startsWith("/accounting");
  const showNavBarGuard = location.pathname.startsWith("/Guard");
  const showNavBarFaculty = location.pathname.startsWith("/Faculty");
  const showNavBarSA = location.pathname.startsWith("/SA");
  const showNavBarStaff = location.pathname.startsWith("/Staff");

  
  // Check if current route should show full-screen layout (no navigation bars)
  const isFullScreenRoute = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/scanner" || location.pathname === "/schedule-scanner" || location.pathname === "/diagnose-sa" || location.pathname === "/diagnose-guard" || location.pathname === "/diagnose-staff";

  return (
    <>
      <main className={isFullScreenRoute ? "" : "flex bg-gray-50"}>
        {!isFullScreenRoute && showNavBarHR && <NavBar />}
        {!isFullScreenRoute && showNavBarHRPersonnel && <HRNavBar />}
        {!isFullScreenRoute && showNavBarACC && <NavAccounting />}
        {!isFullScreenRoute && showNavBarGuard && <NavGuard />}
        {!isFullScreenRoute && showNavBarFaculty && <FacNav />}
        {!isFullScreenRoute && showNavBarSA && <SANav />}
        {!isFullScreenRoute && showNavBarStaff && <StaffNav />}


        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/scanner" element={<Scanner />}/>
          <Route path="/schedule-scanner" element={<ScheduleScanner />}/>

          {/* HR ADMIN */}
          <Route path="/hrAdmin/dashboard" element={<Dashboard />} />
          <Route path="/hrAdmin/userManagement" element={<UserManagement />} />
          <Route path="/hrAdmin/attendance" element={<Attendance />} />
          <Route path="/hrAdmin/schedule" element={<Schedule />} />
          <Route path="/hrAdmin/payroll" element={<Payroll />} />
          <Route path="/hrAdmin/requests" element={<Requests />} />
          <Route path="/hrAdmin/reports" element={<Reports />} />

          {/* HR PERSONNEL */}
          <Route path="/HR/dashboard" element={<HRDashboard />} />
          <Route path="/HR/userManagement" element={<HRUserManagement />} />
          <Route path="/HR/attendance" element={<HRAttendance />} />
          <Route path="/HR/schedule" element={<HRSchedule />} />
          <Route path="/HR/payroll" element={<HRPayroll />} />
          <Route path="/HR/requests" element={<HRRequests />} />
          <Route path="/HR/reports" element={<HRReports />} />

          {/* ACCOUNTING */}
          <Route path="/accounting/dashboard" element={<AccDashboard />}/>
          <Route path="/accounting/schedule" element={<AccSchedule />}/>
          <Route path="/accounting/payroll" element={<PayrollAcc />}/>
          <Route path="/accounting/reports" element={<AccReports />}/>

          {/* GUARD */}
          <Route path="/Guard/dashboard" element={<GuardDashboard />}/>
          <Route path="/Guard/scanner" element={<GuardScanner />}/>
          <Route path="/Guard/reports" element={<GuardReports />}/>
          <Route path="/Guard/approvals" element={<GuardApproval />}/>

          {/* FACULTY */}
          <Route path="/Faculty/dashboard" element={<FacDashboard />} />
          <Route path="/Faculty/attendance" element={<FacAttendance />} />
          <Route path="/Faculty/schedule" element={<FacSchedule />} />
          <Route path="/Faculty/payroll" element={<FacPayroll />} />
          <Route path="/Faculty/request" element={<FacRequest />} />
          <Route path="/Faculty/dean-approval" element={<DeanApproval />} />

          {/* STUDENT AFFAIRS */}
          <Route path="/SA/dashboard" element={<SADashboard />} />
          <Route path="/SA/attendance" element={<SAAttendance />} />
          <Route path="/SA/schedule" element={<SASchedule />} />
          <Route path="/SA/payroll" element={<SAPayroll />} />
          <Route path="/SA/events" element={<SAEvents />} />
          <Route path="/SA/request" element={<SARequest />} />
          <Route path="/SA/reports" element={<SAReports />} />

          {/* STAFF */}
          <Route path="/Staff/dashboard" element={<StaffDashboard />} />
          <Route path="/Staff/attendance" element={<StaffAttendance />} />
          <Route path="/Staff/schedule" element={<StaffSchedule />} />
          <Route path="/Staff/payroll" element={<StaffPayroll />} />
          <Route path="/Staff/reports" element={<StaffReports />} />

          {/* DIAGNOSTIC ROUTES */}
          <Route path="/diagnose-sa" element={<DiagnoseSARole />} />
          <Route path="/diagnose-guard" element={<DiagnoseGuardRole />} />
          <Route path="/diagnose-staff" element={<DiagnoseStaffRole />} />
          <Route path="/database-test" element={<DatabaseTest />} />
  

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

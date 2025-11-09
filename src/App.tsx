import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./components/NotFound";
import { NavBar } from "./components/HRAdmin/NavBar";
import { LandingPage } from "./components/LandingPage";
import { UserManagement } from "./components/HRAdmin/UserManagement";
import { Attendance } from "./components/HRAdmin/Attendance";
import { Payroll } from "./components/HRAdmin/Payroll";
import { Requests } from "./components/HRAdmin/Requests";
import { Clearance } from "./components/HRAdmin/Clearance";
import { ClearanceDocuments } from "./components/HRAdmin/ClearanceDocuments";
import Reports from "./components/HRAdmin/Reports";
import Dashboard from "./components/HRAdmin/Dashboard";
import Schedule from "./components/HRAdmin/Schedule";
import { Holiday } from "./components/HRAdmin/Holiday";

// HR Personnel Components
import { NavBar as HRNavBar } from "./components/HR/NavBar";
import HRDashboard from "./components/HR/Dashboard";
import { UserManagement as HRUserManagement } from "./components/HR/UserManagement";
import { Attendance as HRAttendance } from "./components/HR/Attendance";
import { Payroll as HRPayroll } from "./components/HR/Payroll";
import { Requests as HRRequests } from "./components/HR/Requests";
import { Clearance as HRClearance } from "./components/HR/Clearance";
import { ClearanceDocuments as HRClearanceDocuments } from "./components/HR/ClearanceDocuments";
import HRReports from "./components/HR/Reports";
import HRSchedule from "./components/HR/Schedule";
import AccDashboard from "./components/Accounting/Dashboard";
import { NavAccounting } from "./components/Accounting/NavAcc";
import AccAttendance from "./components/Accounting/AccAttendance";
import { PayrollAcc } from "./components/Accounting/PayrollAcc";
import { Reports as AccReports } from "./components/Accounting/Reports";
import AccSchedule from "./components/Accounting/AccSchedule";
import GovContribution from "./components/Accounting/GovContribution";
import { NavGuard } from "./components/Guard/NavGuard";
import GuardDashboard from "./components/Guard/GuardDashboard";
import GuardReports from "./components/Guard/GuardReports";
import GuardScanner from "./components/Guard/GuardScanner";
import { GuardApproval } from "./components/Guard/GuardApproval";
import GuardGovContribution from "./components/Guard/GuardGovContribution";
import { DatabaseTest } from "./components/Debug/DatabaseTest";
import FacDashboard from "./components/Faculty/FacDashboard";
import { FacNav } from "./components/Faculty/FacNav";
import Scanner from "./components/authAdmin/Scanner";
import ScheduleScanner from "./components/ScheduleScanner/ScheduleScanner";
import FacAttendance from "./components/Faculty/FacAttendance";
import FacSchedule from "./components/Faculty/FacSchedule";
import { FacPayroll } from "./components/Faculty/FacPayroll";
import { FacRequest } from "./components/Faculty/FacRequest";
import { Clearance as FacClearance } from "./components/Faculty/FacClearance";
import { DeanApproval } from "./components/Faculty/DeanApproval";
import FacGovContribution from "./components/Faculty/FacGovContribution";
import SADashboard from "./components/SA/SADashboard";
import SAAttendance from "./components/SA/SAAttendance";
import SASchedule from "./components/SA/SASchedule";
import { SAPayroll } from "./components/SA/SAPayroll";
import SAReports from "./components/SA/SAReports";
import SAEvents from "./components/SA/SAEvents";
import SARequest from "./components/SA/SARequest";
import { SANav } from "./components/SA/SANav";
import SAGovContribution from "./components/SA/SAGovContribution";
import DiagnoseSARole from "./components/SA/DiagnoseSARole";
import DiagnoseGuardRole from "./components/Guard/DiagnoseGuardRole";
import StaffDashboard from "./components/Staff/StaffDashboard";
import StaffAttendance from "./components/Staff/StaffAttendance";
import StaffSchedule from "./components/Staff/StaffSchedule";
import { StaffPayroll } from "./components/Staff/StaffPayroll";
import StaffReports from "./components/Staff/StaffReports";
import { StaffNav } from "./components/Staff/StaffNav";
import DiagnoseStaffRole from "./components/Staff/DiagnoseStaffRole";
import StaffGovContribution from "./components/Staff/StaffGovContribution";


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
  // Includes landing page, scanners, diagnostic routes, and any unmatched routes (404)
  const isFullScreenRoute = 
    location.pathname === "/" || 
    location.pathname === "/scanner" || 
    location.pathname === "/schedule-scanner" || 
    location.pathname === "/diagnose-sa" || 
    location.pathname === "/diagnose-guard" || 
    location.pathname === "/diagnose-staff" ||
    location.pathname === "/database-test" ||
    // If no navbar is shown, it's a full-screen route (catches 404)
    (!showNavBarHR && !showNavBarHRPersonnel && !showNavBarACC && !showNavBarGuard && !showNavBarFaculty && !showNavBarSA && !showNavBarStaff && location.pathname !== "/");

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
          <Route path="/scanner" element={<Scanner />}/>
          <Route path="/schedule-scanner" element={<ScheduleScanner />}/>

          {/* HR ADMIN */}
          <Route path="/hrAdmin/dashboard" element={<ProtectedRoute allowedRoles={["Administrator"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/hrAdmin/userManagement" element={<ProtectedRoute allowedRoles={["Administrator"]}><UserManagement /></ProtectedRoute>} />
          <Route path="/hrAdmin/attendance" element={<ProtectedRoute allowedRoles={["Administrator"]}><Attendance /></ProtectedRoute>} />
          <Route path="/hrAdmin/schedule" element={<ProtectedRoute allowedRoles={["Administrator"]}><Schedule /></ProtectedRoute>} />
          <Route path="/hrAdmin/holiday" element={<ProtectedRoute allowedRoles={["Administrator"]}><Holiday /></ProtectedRoute>} />
          <Route path="/hrAdmin/payroll" element={<ProtectedRoute allowedRoles={["Administrator"]}><Payroll /></ProtectedRoute>} />
          <Route path="/hrAdmin/requests" element={<ProtectedRoute allowedRoles={["Administrator"]}><Requests /></ProtectedRoute>} />
          <Route path="/hrAdmin/clearance" element={<ProtectedRoute allowedRoles={["Administrator"]}><Clearance /></ProtectedRoute>} />
          <Route path="/hrAdmin/documents" element={<ProtectedRoute allowedRoles={["Administrator"]}><ClearanceDocuments /></ProtectedRoute>} />
          <Route path="/hrAdmin/reports" element={<ProtectedRoute allowedRoles={["Administrator"]}><Reports /></ProtectedRoute>} />

          {/* HR PERSONNEL */}
          <Route path="/HR/dashboard" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRDashboard /></ProtectedRoute>} />
          <Route path="/HR/userManagement" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRUserManagement /></ProtectedRoute>} />
          <Route path="/HR/attendance" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRAttendance /></ProtectedRoute>} />
          <Route path="/HR/schedule" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRSchedule /></ProtectedRoute>} />
          <Route path="/HR/payroll" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRPayroll /></ProtectedRoute>} />
          <Route path="/HR/requests" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRRequests /></ProtectedRoute>} />
          <Route path="/HR/clearance" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRClearance /></ProtectedRoute>} />
          <Route path="/HR/documents" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRClearanceDocuments /></ProtectedRoute>} />
          <Route path="/HR/reports" element={<ProtectedRoute allowedRoles={["HR Personnel"]}><HRReports /></ProtectedRoute>} />

          {/* ACCOUNTING */}
          <Route path="/accounting/dashboard" element={<ProtectedRoute allowedRoles={["Accounting"]}><AccDashboard /></ProtectedRoute>}/>
          <Route path="/accounting/attendance" element={<ProtectedRoute allowedRoles={["Accounting"]}><AccAttendance /></ProtectedRoute>}/>
          <Route path="/accounting/schedule" element={<ProtectedRoute allowedRoles={["Accounting"]}><AccSchedule /></ProtectedRoute>}/>
          <Route path="/accounting/payroll" element={<ProtectedRoute allowedRoles={["Accounting"]}><PayrollAcc /></ProtectedRoute>}/>
          <Route path="/accounting/contributions" element={<ProtectedRoute allowedRoles={["Accounting"]}><GovContribution /></ProtectedRoute>}/>
          <Route path="/accounting/reports" element={<ProtectedRoute allowedRoles={["Accounting"]}><AccReports /></ProtectedRoute>}/>

          {/* GUARD */}
          <Route path="/Guard/dashboard" element={<ProtectedRoute allowedRoles={["Guard"]}><GuardDashboard /></ProtectedRoute>}/>
          <Route path="/Guard/scanner" element={<ProtectedRoute allowedRoles={["Guard"]}><GuardScanner /></ProtectedRoute>}/>
          <Route path="/Guard/approvals" element={<ProtectedRoute allowedRoles={["Guard"]}><GuardApproval /></ProtectedRoute>}/>
          <Route path="/Guard/contributions" element={<ProtectedRoute allowedRoles={["Guard"]}><GuardGovContribution /></ProtectedRoute>}/>
          <Route path="/Guard/reports" element={<ProtectedRoute allowedRoles={["Guard"]}><GuardReports /></ProtectedRoute>}/>

          {/* FACULTY */}
          <Route path="/Faculty/dashboard" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacDashboard /></ProtectedRoute>} />
          <Route path="/Faculty/attendance" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacAttendance /></ProtectedRoute>} />
          <Route path="/Faculty/schedule" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacSchedule /></ProtectedRoute>} />
          <Route path="/Faculty/payroll" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacPayroll /></ProtectedRoute>} />
          <Route path="/Faculty/contributions" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacGovContribution /></ProtectedRoute>} />
          <Route path="/Faculty/clearance" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacClearance /></ProtectedRoute>} />
          <Route path="/Faculty/request" element={<ProtectedRoute allowedRoles={["Faculty"]}><FacRequest /></ProtectedRoute>} />
          <Route path="/Faculty/dean-approval" element={<ProtectedRoute allowedRoles={["Faculty"]}><DeanApproval /></ProtectedRoute>} />

          {/* STUDENT AFFAIRS */}
          <Route path="/SA/dashboard" element={<ProtectedRoute allowedRoles={["SA"]}><SADashboard /></ProtectedRoute>} />
          <Route path="/SA/attendance" element={<ProtectedRoute allowedRoles={["SA"]}><SAAttendance /></ProtectedRoute>} />
          <Route path="/SA/schedule" element={<ProtectedRoute allowedRoles={["SA"]}><SASchedule /></ProtectedRoute>} />
          <Route path="/SA/payroll" element={<ProtectedRoute allowedRoles={["SA"]}><SAPayroll /></ProtectedRoute>} />
          <Route path="/SA/contributions" element={<ProtectedRoute allowedRoles={["SA"]}><SAGovContribution /></ProtectedRoute>} />
          <Route path="/SA/events" element={<ProtectedRoute allowedRoles={["SA"]}><SAEvents /></ProtectedRoute>} />
          <Route path="/SA/request" element={<ProtectedRoute allowedRoles={["SA"]}><SARequest /></ProtectedRoute>} />
          <Route path="/SA/reports" element={<ProtectedRoute allowedRoles={["SA"]}><SAReports /></ProtectedRoute>} />

          {/* STAFF */}
          <Route path="/Staff/dashboard" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffDashboard /></ProtectedRoute>} />
          <Route path="/Staff/attendance" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffAttendance /></ProtectedRoute>} />
          <Route path="/Staff/schedule" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffSchedule /></ProtectedRoute>} />
          <Route path="/Staff/payroll" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffPayroll /></ProtectedRoute>} />
          <Route path="/Staff/contributions" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffGovContribution /></ProtectedRoute>} />
          <Route path="/Staff/reports" element={<ProtectedRoute allowedRoles={["Staff"]}><StaffReports /></ProtectedRoute>} />

          {/* DIAGNOSTIC ROUTES */}
          <Route path="/diagnose-sa" element={<DiagnoseSARole />} />
          <Route path="/diagnose-guard" element={<DiagnoseGuardRole />} />
          <Route path="/diagnose-staff" element={<DiagnoseStaffRole />} />
          <Route path="/database-test" element={<DatabaseTest />} />

          {/* 404 NOT FOUND - Catch all unmatched routes */}
          <Route path="*" element={<NotFound />} />

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

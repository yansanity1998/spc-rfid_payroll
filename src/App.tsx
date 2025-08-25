import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Hero from "./components/Hero";
import { NavBar } from "./components/NavBar";
import { LogIn } from "./components/authAdmin/LogIn";
import { UserManagement } from "./components/HRAdmin/UserManagement";
import { Attendance } from "./components/HRAdmin/Attendance";
import { Payroll } from "./components/HRAdmin/Payroll";
import { Requests } from "./components/HRAdmin/Requests";
import Reports from "./components/HRAdmin/Reports";

function AppContent() {
  const location = useLocation();

  const standalonePage = location.pathname === "/login";

  return (
    <>
      <main className="flex gap-2 justify-end relative bg-gray-50">
        {!standalonePage && <NavBar />}

        <Routes>
          <Route path="/dashboard" element={<Hero />} />
          <Route path="/userManagement" element={<UserManagement />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/reports" element={<Reports />} />

          
        </Routes>
      </main>

      <Routes>
        <Route path="/login" element={<LogIn />} />
      </Routes>
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

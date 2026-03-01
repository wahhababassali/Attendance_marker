import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Admin pages
import Dashboard from "./pages/admin/Dashboard.jsx";
import Login from "./pages/admin/Login.jsx";
import Print from "./pages/admin/Print.jsx";

// Student pages
import Register from "./pages/student/Register.jsx";
import Confirm from "./pages/student/Confirm.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Student routes - Default landing page */}
        <Route path="/" element={<Register />} />
        <Route path="/student/register" element={<Register />} />
        <Route path="/student/confirm" element={<Confirm />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/print" element={<Print />} />
      </Routes>
    </Router>
  );
}

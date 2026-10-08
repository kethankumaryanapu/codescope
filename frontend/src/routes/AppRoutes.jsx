import { Routes, Route, Navigate } from "react-router-dom";
import Requirement from "../pages/Requirement";
import Dashboard from "../pages/Dashboard";
import ImpactAnalysis from "../pages/ImpactAnalysis";
import CodeReview from "../pages/CodeReview";
import PRGenerator from "../pages/PRGenerator";
import Agents from "../pages/Agents";
import Analytics from "../pages/Analytics";
import Settings from "../pages/Settings";
import CodebaseFiles from "../pages/CodebaseFiles";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

      {/* Public routes — no AppLayout */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />

      {/* Authenticated routes — wrapped in AppLayout */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/files"
        element={isAuthenticated ? <AppLayout><CodebaseFiles /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/requirements"
        element={isAuthenticated ? <AppLayout><Requirement /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/impact-analysis"
        element={isAuthenticated ? <AppLayout><ImpactAnalysis /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/agents"
        element={isAuthenticated ? <AppLayout><Agents /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/code-review"
        element={isAuthenticated ? <AppLayout><CodeReview /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/pr-generator"
        element={isAuthenticated ? <AppLayout><PRGenerator /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/analytics"
        element={isAuthenticated ? <AppLayout><Analytics /></AppLayout> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <AppLayout><Settings /></AppLayout> : <Navigate to="/login" />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

export default AppRoutes;

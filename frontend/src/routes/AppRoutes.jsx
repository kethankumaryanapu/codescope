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
import AppShell from "../components/AppShell";
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
        element={isAuthenticated ? <AppShell><Dashboard /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/files"
        element={isAuthenticated ? <AppShell><CodebaseFiles /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/requirements"
        element={isAuthenticated ? <AppShell><Requirement /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/impact-analysis"
        element={isAuthenticated ? <AppShell><ImpactAnalysis /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/agents"
        element={isAuthenticated ? <AppShell><Agents /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/code-review"
        element={isAuthenticated ? <AppShell><CodeReview /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/pr-generator"
        element={isAuthenticated ? <AppShell><PRGenerator /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/analytics"
        element={isAuthenticated ? <AppShell><Analytics /></AppShell> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <AppShell><Settings /></AppShell> : <Navigate to="/login" />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

export default AppRoutes;

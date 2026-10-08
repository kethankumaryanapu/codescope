import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";

function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
          <AppRoutes />
        </div>
      </AnalysisProvider>
    </AuthProvider>
  );
}

export default App;

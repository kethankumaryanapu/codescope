import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { Settings, LogOut } from "lucide-react";
import NvidiaStatus from "./NvidiaStatus";

const Topbar = ({ mobileMenuSlot }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { repositories, selectedRepo, setSelectedRepo } = useAnalysis();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <header
      style={{
        height: "var(--topbar-h, 60px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        gap: "12px",
      }}
    >
      {/* ── Mobile menu toggle (rendered by AppLayout, hidden on desktop) ── */}
      {mobileMenuSlot}

      {/* ── Center: repository selector ── */}
      <div
        style={{
          flex: 1,
          maxWidth: "320px",
          margin: "0 auto",
        }}
      >
        <select
          value={selectedRepo?.id || ""}
          onChange={(e) => {
            const repo = repositories.find((r) => r.id === e.target.value);
            if (repo) setSelectedRepo(repo);
          }}
          style={{
            width: "100%",
            padding: "5px 10px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-2)",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {repositories.map((repo) => (
            <option key={repo.id} value={repo.id} style={{ background: "#1a1a1a" }}>
              {repo.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Right: NvidiaStatus + user avatar + dropdown ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <NvidiaStatus />

        {/* User avatar with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="User menu"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "#76b900",
              border: "none",
              color: "#000",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {userInitial}
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop to close on outside click */}
              <div
                onClick={() => setDropdownOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 149,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "38px",
                  width: "200px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  zIndex: 150,
                }}
              >
                {/* User info header */}
                <div
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: "4px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "10px", color: "var(--text-3)", letterSpacing: "0.05em" }}>
                    SIGNED IN AS
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "12px",
                      color: "var(--text)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.email || user?.name || "developer"}
                  </p>
                </div>

                {/* Settings link */}
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-2)",
                    fontSize: "12px",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Settings size={14} />
                  Settings
                </Link>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--error)",
                    fontSize: "12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

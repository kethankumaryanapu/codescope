import { CheckCircle2, Clock3, Loader2, AlertCircle, PlayCircle, Cpu } from "lucide-react";
import { useAnalysis } from "../context/AnalysisContext";

const AIStatus = () => {
  const { workflow } = useAnalysis();

  const getAgentConfig = (name, status) => {
    let icon;
    let statusColor;

    switch (status) {
      case "Completed":
        icon = <CheckCircle2 color="#76b900" size={16} />;
        statusColor = "#76b900";
        break;
      case "Running":
        icon = <Loader2 color="#76b900" size={16} style={{ animation: "spin 1s linear infinite" }} />;
        statusColor = "#76b900";
        break;
      case "Failed":
        icon = <AlertCircle color="#cc3333" size={16} />;
        statusColor = "#cc3333";
        break;
      case "Ready":
        icon = <PlayCircle color="#4a9eff" size={16} />;
        statusColor = "#4a9eff";
        break;
      default:
        icon = <Clock3 color="#606060" size={16} />;
        statusColor = "#606060";
    }

    return { name, status, icon, statusColor };
  };

  const agents = [
    getAgentConfig("Coordinator Agent", workflow.coordinator),
    getAgentConfig("Requirement Agent", workflow.requirement),
    getAgentConfig("Impact Agent", workflow.impact),
    getAgentConfig("Review Agent", workflow.review),
    getAgentConfig("PR Generator Agent", workflow.pr),
  ];

  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius)",
      padding: "20px",
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Cpu size={14} color="var(--nvidia)" />
        <h2 style={{ fontSize: "13px", margin: 0, color: "var(--text)", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          AI AGENT WORKFLOW
        </h2>
      </div>

      {agents.map((agent, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            paddingBottom: "10px",
            borderBottom: index !== agents.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {agent.icon}
            <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{agent.name}</span>
          </div>
          <span style={{ color: agent.statusColor, fontWeight: "700", fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {agent.status}
          </span>
        </div>
      ))}

      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ color: "var(--text-3)", fontSize: "11px", margin: 0, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            OVERALL PROGRESS
          </p>
          <p style={{
            color: workflow.progress === 100 ? "#76b900" : "var(--nvidia)",
            fontWeight: "700",
            fontSize: "11px",
            margin: 0,
            fontFamily: "var(--font-mono)",
          }}>
            {workflow.progress}%
          </p>
        </div>
        <div style={{ width: "100%", height: "4px", background: "var(--surface-2)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            width: `${workflow.progress}%`,
            height: "100%",
            background: workflow.progress === 100 ? "#76b900" : "var(--nvidia)",
            transition: "width 0.5s ease-in-out",
          }} />
        </div>
      </div>
    </div>
  );
};

export default AIStatus;

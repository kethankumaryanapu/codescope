import { useState } from "react";
import { Layers } from "lucide-react";

const DependencyGraph = ({ graphData }) => {
  const [activeNode, setActiveNode] = useState(null);

  const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];

  if (nodes.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius)",
          padding: "36px 20px",
          textAlign: "center",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        <Layers size={30} color="#76b900" style={{ margin: "0 auto 10px", display: "block", opacity: 0.5 }} />
        <h4 style={{ margin: "0 0 6px", color: "var(--text)", fontSize: "14px", fontWeight: 600 }}>
          No Dependency Graph Data
        </h4>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-3)" }}>
          Run an impact analysis with indexed files to visualize AST call chains and blast radius.
        </p>
      </div>
    );
  }

  const getNode = (id) => nodes.find((n) => n.id === id);

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)" }}>
          <Layers size={13} color="#76b900" /> Live AI Dependency Graph (Click node to inspect)
        </span>
        {activeNode && (
          <span style={{ fontSize: "12px", color: "#76b900", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
            Inspecting: {activeNode.name} ({activeNode.type})
          </span>
        )}
      </div>

      <svg width="100%" height="300" viewBox="0 0 650 300" style={{ overflow: "visible" }}>
        {/* Draw Edges */}
        {edges.map((edge, idx) => {
          const fromNode = getNode(edge.from);
          const toNode = getNode(edge.to);
          if (!fromNode || !toNode) return null;

          const isHighlighted = activeNode && (activeNode.id === edge.from || activeNode.id === edge.to);

          return (
            <line
              key={idx}
              x1={(fromNode.x || 60) + 60}
              y1={(fromNode.y || 150) + 20}
              x2={toNode.x || 280}
              y2={(toNode.y || 80) + 20}
              stroke={isHighlighted ? "#76b900" : "#2a2a2a"}
              strokeWidth={isHighlighted ? "2" : "1.5"}
              strokeDasharray={isHighlighted ? "none" : "4"}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isSelected = activeNode?.id === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x || 60}, ${node.y || 150})`}
              onClick={() => setActiveNode(isSelected ? null : node)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width="140"
                height="46"
                rx="6"
                fill={isSelected ? "rgba(118,185,0,0.12)" : "#141414"}
                stroke={isSelected ? "#76b900" : "#2a2a2a"}
                strokeWidth={isSelected ? "1.5" : "1"}
              />
              <circle cx="15" cy="23" r="4" fill={isSelected ? "#76b900" : node.color || "#76b900"} opacity={isSelected ? 1 : 0.5} />
              <text x="28" y="20" fill="var(--text, #e8e8e8)" fontSize="11" fontWeight="600" fontFamily="var(--font-mono, monospace)">
                {node.name.length > 14 ? node.name.substring(0, 13) + "…" : node.name}
              </text>
              <text x="28" y="34" fill="var(--text-3, #606060)" fontSize="10" fontFamily="var(--font-mono, monospace)">
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default DependencyGraph;

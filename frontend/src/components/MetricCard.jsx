import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const MetricCard = ({ title, value, subtitle, color = "var(--nvidia)", to, onClick, tooltip }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (to) {
      navigate(to);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  const isClickable = Boolean(onClick || to);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tooltip || (to ? `Open ${title}` : undefined)}
      style={{
        background: isHovered ? "var(--surface-2)" : "var(--surface)",
        border: isHovered
          ? `1px solid rgba(118,185,0,0.35)`
          : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "18px 18px 16px",
        transition: "all 0.2s ease",
        cursor: isClickable ? "pointer" : "default",
        boxShadow: isHovered ? "0 8px 24px rgba(0,0,0,0.3)" : "none",
        transform: isHovered && isClickable ? "translateY(-2px)" : "translateY(0)",
        position: "relative",
        userSelect: "none",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: isHovered ? "var(--text-2)" : "var(--text-3)", fontSize: "13px", margin: 0, fontWeight: 600, transition: "color 0.2s ease" }}>
          {title}
        </p>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-sm)",
            background: isHovered ? "rgba(118,185,0,0.12)" : "var(--surface-2)",
            border: isHovered ? "1px solid rgba(118,185,0,0.3)" : "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            transform: isHovered ? "scale(1.05) translate(1px, -1px)" : "scale(1)",
          }}
        >
          <ArrowUpRight
            color={isHovered ? "#76b900" : "var(--text-3)"}
            size={18}
            style={{
              transition: "transform 0.2s ease",
              transform: isHovered ? "translate(1px, -1px)" : "none",
            }}
          />
        </div>
      </div>

      <h2
        style={{
          marginTop: "12px",
          marginBottom: "8px",
          color,
          fontSize: "28px",
          fontWeight: 800,
          letterSpacing: "-0.5px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </h2>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small style={{ color: "var(--text-3)", fontSize: "12px" }}>{subtitle}</small>
        {isClickable && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--nvidia)",
              fontWeight: 600,
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? "translateX(0)" : "translateX(-4px)",
              transition: "all 0.2s ease",
            }}
          >
            Explore →
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;

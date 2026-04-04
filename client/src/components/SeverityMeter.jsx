import React from "react";

const levelMap = {
  SIGNIFICANT: 4,
  MODERATE: 3,
  MINOR: 2,
  CLEAN: 1,
  UNKNOWN: 2,
};

const colorMap = {
  SIGNIFICANT: "#ff6b6b",
  MODERATE: "#ffb347",
  MINOR: "#6aaa8a",
  CLEAN: "#5a9fd4",
  UNKNOWN: "#4a6478",
};

const labelColorMap = {
  SIGNIFICANT: "#ff6b6b",
  MODERATE: "#ffb347",
  MINOR: "#6aaa8a",
  CLEAN: "#5a9fd4",
  UNKNOWN: "#4a6478",
};

export default function SeverityMeter({ concernLevel }) {
  const raw = String(concernLevel || "CLEAN").toUpperCase();
  const level = levelMap[raw] ?? levelMap.MODERATE;
  const filledColor = colorMap[raw] ?? colorMap.MODERATE;

  return (
    <div style={{ display: "flex", alignItems: "center", margin: "6px 0 12px" }}>
      <div style={{ display: "flex", gap: 3, width: 200, height: 6 }}>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{
            flex: 1,
            borderRadius: 2,
            backgroundColor: level >= n ? filledColor : "#1c2a3a"
          }} />
        ))}
      </div>
      <span style={{
        marginLeft: 12,
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: labelColorMap[raw] || "#ffb347"
      }}>
        {raw}
      </span>
    </div>
  );
}

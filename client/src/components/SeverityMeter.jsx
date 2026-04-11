import React from "react";

const levelMap = {
  CRITICAL: 4,
  HIGH: 4,
  SIGNIFICANT: 4,
  MODERATE: 3,
  LOW: 2,
  MINOR: 2,
  CLEAN: 1,
  UNKNOWN: 2,
};

const colorMap = {
  CRITICAL: "#c92a2a",
  HIGH: "#ff6b6b",
  SIGNIFICANT: "#ff6b6b",
  MODERATE: "#ffb347",
  LOW: "#6aaa8a",
  MINOR: "#6aaa8a",
  CLEAN: "#5a9fd4",
  UNKNOWN: "#6a8a9a",
};

const labelColorMap = {
  CRITICAL: "#c92a2a",
  HIGH: "#ff6b6b",
  SIGNIFICANT: "#ff6b6b",
  MODERATE: "#ffb347",
  LOW: "#6aaa8a",
  MINOR: "#6aaa8a",
  CLEAN: "#5a9fd4",
  UNKNOWN: "#6a8a9a",
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

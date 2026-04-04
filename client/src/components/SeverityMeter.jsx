import React from "react";

const levelMap  = { SIGNIFICANT: 4, MODERATE: 3, MINOR: 2, CLEAN: 1 };
const colorMap  = { SIGNIFICANT: "#c8370a", MODERATE: "#bea028", MINOR: "#50a064", CLEAN: "#3c82c8" };

export default function SeverityMeter({ concernLevel }) {
  const upper       = (concernLevel || "CLEAN").toUpperCase();
  const level       = levelMap[upper] ?? 1;
  const filledColor = colorMap[upper];

  return (
    <div style={{ display: "flex", alignItems: "center", margin: "6px 0 12px" }}>
      <div style={{ display: "flex", gap: 3, width: 200, height: 6 }}>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{
            flex: 1,
            borderRadius: 2,
            backgroundColor: level >= n ? filledColor : "#2a2720"
          }} />
        ))}
      </div>
      <span style={{
        marginLeft: 12,
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#c9bfa8"
      }}>
        {upper}
      </span>
    </div>
  );
}

import React from "react";

const severityColor = {
  critical:    "#c8370a",
  significant: "#bea028",
  moderate:    "#6a6050",
  minor:       "#3a3228",
};

const severityBorder = {
  critical:    "3px solid #c8370a",
  significant: "3px solid #bea028",
  moderate:    "3px solid #6a6050",
  minor:       "3px solid #3a3228",
};

export default function Timeline({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <section style={{ margin: "32px 0 24px" }}>
      <h2 className="section-header">TIMELINE</h2>
      <div style={{ position: "relative", paddingLeft: 44 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: 20,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: "#2a2720"
        }} />

        {events.map((e, idx) => {
          const dotColor    = severityColor[e.severity]  || "#6a6050";
          const borderColor = severityBorder[e.severity] || "3px solid #3a3228";

          return (
            <div key={idx} style={{ position: "relative", marginBottom: 28 }}>
              {/* Dot */}
              <div style={{
                position: "absolute",
                left: -29,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: dotColor,
                border: `2px solid ${dotColor}`,
              }} />

              {/* Content */}
              <div>
                {/* Meta line */}
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "#c8370a",
                  textTransform: "uppercase",
                  marginBottom: 4,
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline"
                }}>
                  <span>{e.year}</span>
                  {e.category && (
                    <span style={{
                      padding: "2px 6px",
                      border: "1px solid #c8370a",
                      borderRadius: 999,
                      fontSize: 8
                    }}>
                      {e.category.toUpperCase()}
                    </span>
                  )}
                  {e.severity === "critical" && (
                    <span style={{ color: "#c8370a", fontSize: 8 }}>● CRITICAL</span>
                  )}
                </div>

                {/* Event text */}
                <div style={{
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "#c9bfa8",
                  paddingLeft: 6,
                  borderLeft: borderColor,
                  marginBottom: 4
                }}>
                  {e.event}
                </div>

                {/* Source link */}
                {e.source_url && (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      color: "#6a6050",
                      textDecoration: "underline",
                      display: "inline-block",
                      marginTop: 2
                    }}
                  >
                    Source ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

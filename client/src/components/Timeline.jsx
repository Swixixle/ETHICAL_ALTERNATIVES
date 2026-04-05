import React from "react";

const severityColor = {
  critical:    "#ff6b6b",
  significant: "#ffb347",
  moderate:    "#6aaa8a",
  minor:       "#6a8a9a",
};

const severityBorder = {
  critical:    "3px solid #ff6b6b",
  significant: "3px solid #ffb347",
  moderate:    "3px solid #6aaa8a",
  minor:       "3px solid #6a8a9a",
};

export default function Timeline({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <section style={{ margin: "20px 0 16px" }}>
      <h2
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "#a8c4d8",
          fontWeight: 600,
          margin: "0 0 12px",
          border: "none",
          padding: 0,
        }}
      >
        Timeline
      </h2>
      <div style={{ position: "relative", paddingLeft: 44 }}>
        <div style={{
          position: "absolute",
          left: 20,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: "var(--color-border-investigation, #344d62)"
        }} />

        {events.map((e, idx) => {
          const dotColor    = severityColor[e.severity]  || "#6a8a9a";
          const borderColor = severityBorder[e.severity] || "3px solid #6a8a9a";

          return (
            <div key={idx} style={{ position: "relative", marginBottom: 28 }}>
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

              <div>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  letterSpacing: 1,
                  color: "#6a8a9a",
                  textTransform: "none",
                  marginBottom: 4,
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}>
                  <span>{e.year}</span>
                  {e.category && (
                    <span className="timeline-category-badge" style={{
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontSize: 11,
                      textTransform: "none",
                    }}>
                      {e.category}
                    </span>
                  )}
                  {e.severity === "critical" && (
                    <span style={{ color: "#ff6b6b", fontSize: 11 }}>● Critical</span>
                  )}
                </div>

                <div style={{
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#e0e0e0",
                  paddingLeft: 6,
                  borderLeft: borderColor,
                  marginBottom: 4
                }}>
                  {e.event}
                </div>

                {e.source_url && (
                  <a
                    href={e.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      color: "#a8c4d8",
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

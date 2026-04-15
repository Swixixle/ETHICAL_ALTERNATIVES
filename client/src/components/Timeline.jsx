import React, { useMemo, useState } from "react";

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

const PREVIEW_COUNT = 3;

/**
 * @param {unknown[]} events
 * @returns {unknown[]}
 */
function buildPreviewEvents(events) {
  const indexed = events.map((e, i) => ({ e, i }));
  const byRecent = [...indexed].sort((a, b) => {
    const dy = (Number(b.e.year) || 0) - (Number(a.e.year) || 0);
    if (dy !== 0) return dy;
    const dm = (Number(b.e.month) || 0) - (Number(a.e.month) || 0);
    if (dm !== 0) return dm;
    return b.i - a.i;
  });
  const critical = byRecent.filter(({ e }) => e && e.severity === "critical");
  const nonCrit = byRecent.filter(({ e }) => !e || e.severity !== "critical");
  const picked = [];
  for (const x of critical) {
    if (picked.length >= PREVIEW_COUNT) break;
    picked.push(x);
  }
  for (const x of nonCrit) {
    if (picked.length >= PREVIEW_COUNT) break;
    picked.push(x);
  }
  picked.sort((a, b) => {
    const dy = (Number(a.e.year) || 0) - (Number(b.e.year) || 0);
    if (dy !== 0) return dy;
    const dm = (Number(a.e.month) || 0) - (Number(b.e.month) || 0);
    if (dm !== 0) return dm;
    return a.i - b.i;
  });
  return picked.map(({ e }) => e);
}

function TimelineEventRow({ e }) {
  const dotColor    = severityColor[e.severity]  || "#6a8a9a";
  const borderColor = severityBorder[e.severity] || "3px solid #6a8a9a";

  return (
    <div style={{ position: "relative", marginBottom: 28 }}>
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
            Source {'\u2197'}
          </a>
        )}
      </div>
    </div>
  );
}

export default function Timeline({ events, minEvents = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [expandAnimKey, setExpandAnimKey] = useState(0);

  const total = events?.length ?? 0;
  const useAccordion = total > PREVIEW_COUNT;

  const previewEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    if (!useAccordion) return events;
    return buildPreviewEvents(events);
  }, [events, useAccordion]);

  if (!events || events.length === 0) return null;
  if (minEvents > 0 && events.length < minEvents) return null;

  const rowsSource = useAccordion && !expanded ? previewEvents : events;

  const handleExpand = () => {
    setExpandAnimKey((k) => k + 1);
    setExpanded(true);
  };

  const handleCollapse = () => {
    setExpanded(false);
  };

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
      <div style={{ paddingLeft: 44 }}>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            left: 20,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: "var(--color-border-investigation, #344d62)"
          }} />

          <div
            key={useAccordion && expanded ? `full-${expandAnimKey}` : "preview-or-short"}
            className={
              useAccordion && expanded
                ? "investigation-card__timeline-reveal"
                : undefined
            }
          >
            {rowsSource.map((e, idx) => (
              <TimelineEventRow key={idx} e={e} />
            ))}
          </div>
        </div>

        {useAccordion && !expanded ? (
          <button
            type="button"
            onClick={handleExpand}
            aria-expanded={false}
            className="investigation-card__timeline-expand-btn"
          >
            Show full timeline ({total} events) {'\u2193'}
          </button>
        ) : null}

        {useAccordion && expanded ? (
          <button
            type="button"
            onClick={handleCollapse}
            aria-expanded
            className="investigation-card__timeline-collapse-btn"
          >
            Collapse {'\u2191'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

import React from "react";

const stroke = { stroke: "#c8370a", strokeWidth: 1.5, fill: "none" };

export function TaxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <rect x="3"   y="5" width="3" height="10" />
        <rect x="8.5" y="5" width="3" height="10" />
        <rect x="14"  y="5" width="3" height="10" />
      </g>
    </svg>
  );
}

export function LegalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <line x1="10" y1="3"  x2="10" y2="17" />
        <line x1="4"  y1="7"  x2="16" y2="7" />
        <circle cx="4"  cy="10" r="3" />
        <circle cx="16" cy="10" r="3" />
      </g>
    </svg>
  );
}

export function LaborIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <circle cx="10" cy="6"  r="3" />
        <rect   x="6"  y="11" width="8" height="7" rx="1" />
      </g>
    </svg>
  );
}

export function EnvironmentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <path d="M10 17 C10 17 4 13 4 8 C4 5 7 3 10 3 C13 3 16 5 16 8 C16 13 10 17 10 17Z" />
        <line x1="10" y1="11" x2="10" y2="17" />
      </g>
    </svg>
  );
}

export function PoliticalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <path d="M5 7 L15 4 L13 10 L5 13 Z" />
        <line x1="3" y1="16" x2="6" y2="12" />
      </g>
    </svg>
  );
}

export function ExecutivesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <circle cx="10" cy="6" r="3" />
        <line x1="7" y1="13" x2="13" y2="13" />
        <line x1="6" y1="16" x2="14" y2="16" />
      </g>
    </svg>
  );
}

export function HealthIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <g {...stroke}>
        <path d="M10 4 L18 16 L2 16 Z" />
        <line x1="10" y1="9"  x2="10" y2="12" />
        <circle cx="10" cy="14" r="0.5" fill="#c8370a" />
      </g>
    </svg>
  );
}

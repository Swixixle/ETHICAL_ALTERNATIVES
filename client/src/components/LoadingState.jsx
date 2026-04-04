import './LoadingState.css';

export default function LoadingState() {
  return (
    <div className="loading-state" aria-busy="true" aria-label="Loading analysis">
      <div className="loading-state__bar loading-state__bar--long" />
      <div className="loading-state__bar loading-state__bar--medium" />
      <div className="loading-state__bar loading-state__bar--short" />
      <p className="loading-state__caption">Tracing supply chain…</p>
    </div>
  );
}

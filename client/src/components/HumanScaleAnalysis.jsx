import { useEffect, useState } from 'react';
import './HumanScaleAnalysis.css';

/** @param {{ brandSlug: string }} props */
function humanScaleRequestUrl(brandSlug) {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const path = `/api/human-scale-analysis/${encodeURIComponent(brandSlug)}`;
  return base ? `${base}${path}` : path;
}

/**
 * Fetches and displays human-scale corporate penalty analysis from the EthicalAlt API.
 * @param {{ brandSlug: string }} props
 */
export default function HumanScaleAnalysis({ brandSlug }) {
  const [state, setState] = useState(/** @type {{ loading: boolean; error: string | null; payload: Record<string, unknown> | null }} */ ({
    loading: true,
    error: null,
    payload: null,
  }));

  useEffect(() => {
    if (!brandSlug || !String(brandSlug).trim()) {
      setState({ loading: false, error: null, payload: null });
      return;
    }
    const url = humanScaleRequestUrl(String(brandSlug).trim());
    let cancelled = false;
    setState({ loading: true, error: null, payload: null });
    fetch(url)
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err =
            (j && typeof j === 'object' && 'error' in j && j.error) ||
            (res.status === 404
              ? 'No human-scale model for this brand/category yet.'
              : `Request failed (${res.status})`);
          throw new Error(String(err));
        }
        return j;
      })
      .then((j) => {
        if (!cancelled) setState({ loading: false, error: null, payload: j });
      })
      .catch((e) => {
        if (!cancelled)
          setState({
            loading: false,
            error: e instanceof Error ? e.message : String(e),
            payload: null,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [brandSlug]);

  if (state.loading) {
    return <p className="human-scale__loading">Loading human-scale penalty analysis…</p>;
  }
  if (state.error) {
    return <p className="human-scale__error">{state.error}</p>;
  }
  const p = state.payload;
  if (!p || typeof p !== 'object') {
    return <p className="human-scale__muted">No data.</p>;
  }
  if (p.ok !== true) {
    return <p className="human-scale__muted">Analysis unavailable.</p>;
  }

  if (p.mode === 'heuristic' && p.analysis && typeof p.analysis === 'object') {
    return <HeuristicBlock analysis={/** @type {Record<string, unknown>} */ (p.analysis)} brandName={p.brand_name} />;
  }

  if (p.brief && typeof p.brief === 'object') {
    return (
      <BriefBlock
        brief={/** @type {Record<string, unknown>} */ (p.brief)}
        summaryText={typeof p.summary_text === 'string' ? p.summary_text : ''}
        mode={typeof p.mode === 'string' ? p.mode : ''}
      />
    );
  }

  return <p className="human-scale__muted">Unexpected response shape.</p>;
}

/** @param {{ analysis: Record<string, unknown>; brandName: unknown }} props */
function HeuristicBlock({ analysis, brandName }) {
  const h = analysis.human_scale_penalty;
  const d = analysis.disparity;
  const civ = analysis.civilian_analog;
  const op = analysis.operational_restriction;
  const out = analysis.actual_outcome;
  const hp = h && typeof h === 'object' ? h : null;
  const dp = d && typeof d === 'object' ? d : null;
  const ca = civ && typeof civ === 'object' ? civ : null;
  const opR = op && typeof op === 'object' ? op : null;
  const ao = out && typeof out === 'object' ? out : null;
  return (
    <div className="human-scale human-scale__heuristic">
      <p className="human-scale__heuristic-line" style={{ marginTop: 0 }}>
        <strong>What this is:</strong> a USSC-style, category-based model (median civilian sentence for the
        offense, scaled by how many board/C-suite roles could plausibly carry the decision). It is a
        structured estimate, not a court filing. A full line-item “sentencing brief” (lifetime $, every
        rubric) appears when the API has enforcement numbers or (for a reference demo) the Goldman
        Sachs slug without <code>simple=1</code>.
      </p>
      {typeof brandName === 'string' && brandName.trim() ? (
        <p className="human-scale__heuristic-line">
          Brand: <strong>{brandName}</strong>
        </p>
      ) : null}
      {ca ? (
        <p className="human-scale__heuristic-line">
          Civilian analog (USSC medians, comparable offense):{' '}
          <strong>{String(ca.median_sentence_years ?? '—')}</strong> yr per person
          {ca.sample_size != null ? ` · sample n=${String(ca.sample_size)}` : ''}
        </p>
      ) : null}
      {hp ? (
        <>
          <p className="human-scale__heuristic-line">
            <strong>Scaled to governance (aggregate):</strong> if each covered role bore that per-person
            exposure, <strong>{String(hp.total_custody_years ?? '—')}</strong> years custody in the aggregate
            (not “one person in prison for 12 years” unless the model says so).
          </p>
          <p className="human-scale__heuristic-line">
            Per role (median-weight): <strong>{String(hp.per_person_years ?? '—')}</strong> years ·
            roles modeled: <strong>{String(hp.decision_makers ?? '—')}</strong>
            {hp.interpretation ? <span> — {String(hp.interpretation)}</span> : null}
          </p>
        </>
      ) : null}
      {opR && opR.years_ineligible != null ? (
        <p className="human-scale__heuristic-line">
          Operational ineligibility (brief rubric): <strong>{String(opR.years_ineligible)}</strong> yr
          {opR.simple_comparison != null && String(opR.simple_comparison).trim()
            ? ` — ${String(opR.simple_comparison)}`
            : ''}
        </p>
      ) : null}
      {ao && ao.fine != null && Number(ao.fine) > 0 ? (
        <p className="human-scale__heuristic-line">
          Modeled corporate fine anchor in this run: <strong>${Number(ao.fine).toLocaleString('en-US')}</strong>
        </p>
      ) : null}
      {dp ? (
        <p className="human-scale__heuristic-line">
          Disparity (corporate vs civilian benchmark): <strong>{String(dp.severity ?? '—')}</strong>
          {dp.interpretation ? ` — ${String(dp.interpretation)}` : ''}
        </p>
      ) : null}
      {typeof analysis.thesis_statement === 'string' && analysis.thesis_statement.trim() ? (
        <p className="human-scale__thesis">{analysis.thesis_statement}</p>
      ) : null}
    </div>
  );
}

/** @param {{ brief: Record<string, unknown>; summaryText: string; mode: string }} props */
function BriefBlock({ brief, summaryText, mode }) {
  const hsa = brief.human_scale_analysis;
  const cca = brief.civilian_criminal_analog;
  const da = brief.disparity_analysis;
  const clc = brief.civilian_total_lifetime_cost;
  const hp = hsa && typeof hsa === 'object' ? hsa : null;
  const cc = cca && typeof cca === 'object' ? cca : null;
  const disp = da && typeof da === 'object' ? da : null;
  const fin = clc && typeof clc === 'object' && clc.financial && typeof clc.financial === 'object' ? clc.financial : null;
  const agg = fin && fin.aggregate && typeof fin.aggregate === 'object' ? fin.aggregate : null;
  const totalFin = agg && typeof agg.total_financial_impact === 'number' ? agg.total_financial_impact : null;

  const thesis =
    brief.disparity_visualization &&
    typeof brief.disparity_visualization === 'object' &&
    typeof brief.disparity_visualization.thesis_statement === 'string'
      ? brief.disparity_visualization.thesis_statement
      : '';

  return (
    <div className="human-scale">
      {mode ? (
        <p className="human-scale__muted" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
          Mode: {mode.replace(/_/g, ' ')}
        </p>
      ) : null}
      {thesis ? <p className="human-scale__thesis">{thesis}</p> : null}
      <div className="human-scale__grid">
        {hp ? (
          <p className="human-scale__stat">
            <span className="human-scale__stat-label">Aggregate human-scale penalty</span>
            <span className="human-scale__stat-value">{String(hp.total_custody_years ?? '—')} yr</span>
          </p>
        ) : null}
        {cc ? (
          <p className="human-scale__stat">
            <span className="human-scale__stat-label">Median sentence (per person)</span>
            <span className="human-scale__stat-value">
              {String(cc.median_sentence_per_person_years ?? '—')} yr · n={String(cc.sample_size ?? '—')}
            </span>
          </p>
        ) : null}
        {disp ? (
          <p className="human-scale__stat">
            <span className="human-scale__stat-label">Disparity</span>
            <span className="human-scale__stat-value human-scale__stat-value--sev">
              {String(disp.severity ?? '—')}
            </span>
          </p>
        ) : null}
        {totalFin != null ? (
          <p className="human-scale__stat">
            <span className="human-scale__stat-label">Aggregate lifetime financial impact (equiv.)</span>
            <span className="human-scale__stat-value">
              ${totalFin.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </p>
        ) : null}
      </div>
      {summaryText.trim() ? (
        <details className="human-scale__details">
          <summary>Full brief text</summary>
          <pre className="human-scale__pre">{summaryText}</pre>
        </details>
      ) : null}
    </div>
  );
}

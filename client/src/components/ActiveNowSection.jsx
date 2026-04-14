import { useEffect, useState } from 'react';
import './ActiveNowSection.css';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/** @param {string | undefined} iso */
function formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** @param {string} t */
function formatCaseType(t) {
  return String(t || 'other')
    .replace(/_/g, ' ')
    .toUpperCase();
}

/** @param {string} s */
function formatStatus(s) {
  return String(s || '')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function ActiveNowSkeleton({ variant = 'tap' }) {
  return (
    <div className={`active-now active-now--loading active-now--${variant}`} aria-busy="true">
      <div className="active-now__skeleton-head">
        <span className="active-now__skeleton-dot" />
        <span className="active-now__skeleton-line" />
      </div>
      <div className="active-now__skeleton-block" />
      <p className="active-now__skeleton-hint">Scanning recent filings and enforcement…</p>
    </div>
  );
}

/**
 * Live perimeter layer — polls GET /api/perimeter/:slug after static card loads.
 *
 * @param {{
 *   brandSlug: string;
 *   variant?: 'tap' | 'book';
 *   dossierListsOngoingMatters?: boolean;
 * }} props
 */
export default function ActiveNowSection({ brandSlug, variant = 'tap', dossierListsOngoingMatters = false }) {
  const [activity, setActivity] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const base = apiPrefix();

    const poll = async () => {
      const slug = String(brandSlug || '').trim().toLowerCase();
      if (!slug) {
        if (!cancelled) {
          setLoading(false);
          setTimedOut(true);
        }
        return;
      }

      const url = base ? `${base}/api/perimeter/${encodeURIComponent(slug)}` : `/api/perimeter/${encodeURIComponent(slug)}`;

      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 404) {
          setActivity(null);
          setLoading(false);
          setTimedOut(true);
          return;
        }

        if (data.status === 'pending' && attempts < 8) {
          attempts += 1;
          window.setTimeout(poll, 2000);
          return;
        }

        setActivity(data);
        setLoading(false);
        if (data.status === 'pending') setTimedOut(true);
      } catch {
        if (!cancelled) {
          setActivity({ activity_level: 'unknown', active_cases: [], perimeter_summary: '', generated_at: null });
          setLoading(false);
          setTimedOut(true);
        }
      }
    };

    setLoading(true);
    setTimedOut(false);
    setActivity(null);
    void poll();

    return () => {
      cancelled = true;
    };
  }, [brandSlug]);

  if (loading) return <ActiveNowSkeleton variant={variant} />;

  const level = activity && typeof activity.activity_level === 'string' ? activity.activity_level : 'unknown';
  const cases = activity && Array.isArray(activity.active_cases) ? activity.active_cases : [];
  const summary =
    activity && typeof activity.perimeter_summary === 'string' ? activity.perimeter_summary.trim() : '';
  const generatedAt = activity && typeof activity.generated_at === 'string' ? activity.generated_at : null;
  const dotClass =
    level === 'high'
      ? 'active-now__dot active-now__dot--high'
      : level === 'moderate'
        ? 'active-now__dot active-now__dot--moderate'
        : level === 'quiet'
          ? 'active-now__dot active-now__dot--quiet'
          : 'active-now__dot active-now__dot--unknown';

  if (!cases.length) {
    const defaultQuiet =
      timedOut && !summary
        ? 'Live check did not finish in time — open again in a moment.'
        : 'No active legal or regulatory cases verified in the scanned window (last ~24 months).';

    const quietMessage =
      !summary && !timedOut && dossierListsOngoingMatters
        ? 'Live perimeter scan found no additional active-case hits in the last ~24 months; indexed research may still list ongoing regulatory actions, recalls, or civil allegations.'
        : defaultQuiet;

    return (
      <div className={`active-now active-now--quiet active-now--${variant}`}>
        <div className="active-now__head">
          <span className={dotClass} aria-hidden />
          <span className="active-now__label">ACTIVE NOW</span>
          {generatedAt ? (
            <span className="active-now__ts">checked {formatRelative(generatedAt)}</span>
          ) : null}
        </div>
        <p className="active-now__summary active-now__summary--muted">
          {summary || quietMessage}
        </p>
        {activity?.signature ? (
          <div className="active-now__meta">
            <span className="active-now__signed">Signed receipt</span>
          </div>
        ) : null}
      </div>
    );
  }

  const sig = activity?.signature;

  return (
    <div className={`active-now active-now--${variant}`}>
      <div className="active-now__head">
        <span className={dotClass} aria-hidden />
        <span className="active-now__label">ACTIVE NOW</span>
        {generatedAt ? <span className="active-now__ts">updated {formatRelative(generatedAt)}</span> : null}
      </div>

      {summary ? <p className="active-now__summary">{summary}</p> : null}

      <ul className="active-now__cases">
        {cases.map((c, i) => {
          if (!c || typeof c !== 'object') return null;
          const ct = typeof c.case_type === 'string' ? c.case_type : 'other';
          const badgeClass = `active-now__badge active-now__badge--${ct.replace(/[^a-z_]/g, '') || 'other'}`;
          const url = typeof c.source_url === 'string' ? c.source_url : '';
          const conf = typeof c.confidence === 'number' ? Math.round(c.confidence * 100) : null;
          return (
            <li key={`${url || i}-${i}`} className="active-now__case">
              <div className="active-now__case-head">
                <span className={badgeClass}>{formatCaseType(ct)}</span>
                <span className="active-now__status">
                  {formatStatus(typeof c.status === 'string' ? c.status : '')}
                </span>
                {c.jurisdiction ? (
                  <span className="active-now__jur">{String(c.jurisdiction)}</span>
                ) : null}
                {conf != null ? <span className="active-now__conf">{conf}%</span> : null}
              </div>
              {c.case_description ? (
                <p className="active-now__desc">{String(c.case_description)}</p>
              ) : null}
              {c.alleged_conduct ? (
                <p className="active-now__conduct">{String(c.alleged_conduct)}</p>
              ) : null}
              {url && /^https?:\/\//i.test(url) ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="active-now__source">
                  Source ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="active-now__meta">
        <span>
          Sensors: Perplexity + Claude
          {activity?.sensor_status && activity.sensor_status.gemini === 'ok' ? ' + Gemini' : ''}
        </span>
        {sig ? <span className="active-now__signed">✓ Signed</span> : null}
      </div>
    </div>
  );
}

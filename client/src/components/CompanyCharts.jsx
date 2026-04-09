import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BG = '#0f1520';
const AMBER = '#f0a820';
const MEDIAN_BLUE = '#4a90d9';
const RATIO_GREY = '#9aa5b8';
const MUTED_RED = '#c0392b';
const TEXT = '#e2e8f0';
const AXIS = '#8a9aac';
const GRID = '#1c2838';

function apiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/** @param {number} n */
function formatUsdCompact(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(abs >= 10e9 ? 0 : 1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(abs >= 10e6 ? 0 : 1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function secEdgarSearchUrl(companyName) {
  const q = encodeURIComponent(String(companyName || '').trim() || 'company');
  return `https://www.sec.gov/edgar/search/#/q=${q}`;
}

function secDef14aBrowseUrl(companyName) {
  const c = encodeURIComponent(String(companyName || '').trim() || 'company');
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${c}&type=DEF+14A&owner=exclude&count=40`;
}

/** @param {string} event */
function settlementDollarsFromEvent(event) {
  const t = String(event || '');
  let sum = 0;
  for (const m of t.matchAll(/\$?\s*~?\s*([\d,]+(?:\.\d+)?)\s*billion/gi)) {
    sum += parseFloat(m[1].replace(/,/g, '')) * 1e9;
  }
  for (const m of t.matchAll(/\$?\s*~?\s*([\d,]+(?:\.\d+)?)\s*million/gi)) {
    sum += parseFloat(m[1].replace(/,/g, '')) * 1e6;
  }
  for (const m of t.matchAll(/\$\s*([\d,]+(?:\.\d+)?)\s*B\b/gi)) {
    sum += parseFloat(m[1].replace(/,/g, '')) * 1e9;
  }
  for (const m of t.matchAll(/\$\s*([\d,]+(?:\.\d+)?)\s*M\b/gi)) {
    sum += parseFloat(m[1].replace(/,/g, '')) * 1e6;
  }
  return sum;
}

const DOLLARISH = /(\$|[\d,]+(?:\.\d+)?\s*(million|billion|\bM\b|\bB\b))/i;

/** @param {import('react').CSSProperties | undefined} style */
function sectionTitle(style) {
  return {
    fontFamily: '"Space Mono", monospace',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: AMBER,
    margin: '0 0 0.75rem',
    ...style,
  };
}

export default function CompanyCharts({ profile }) {
  const [paySeries, setPaySeries] = useState(null);
  const [payMeta, setPayMeta] = useState({
    loading: false,
    error: null,
    source_note: '',
    data_available: false,
  });

  const companyLabel =
    profile?.brand_name ||
    profile?.parent_company ||
    profile?.ultimate_parent ||
    'Company';

  const disparityRows = useMemo(() => {
    if (!Array.isArray(paySeries) || paySeries.length === 0) return [];
    return paySeries.map((r) => {
      const ceo = r.ceo_total_comp_usd;
      const med = r.median_employee_usd;
      const ratio =
        typeof ceo === 'number' &&
        typeof med === 'number' &&
        med > 0 &&
        Number.isFinite(ceo) &&
        Number.isFinite(med)
          ? ceo / med
          : null;
      return {
        year: String(r.year),
        ceo,
        median: med,
        ratio,
      };
    });
  }, [paySeries]);

  const settlementChartData = useMemo(() => {
    const tl = profile?.timeline;
    if (!Array.isArray(tl)) return [];
    const filtered = tl.filter(
      (e) =>
        e &&
        (e.severity === 'critical' || e.severity === 'high') &&
        typeof e.event === 'string' &&
        DOLLARISH.test(e.event)
    );
    /** @type {Map<number, { total: number, events: string[] }>} */
    const byYear = new Map();
    for (const e of filtered) {
      const y = typeof e.year === 'number' ? e.year : null;
      if (y == null) continue;
      const amt = settlementDollarsFromEvent(e.event);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      const cur = byYear.get(y) || { total: 0, events: [] };
      cur.total += amt;
      cur.events.push(e.event);
      byYear.set(y, cur);
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, v]) => ({
        year: String(year),
        total: v.total,
        events: v.events,
      }));
  }, [profile?.timeline]);

  const costBenefited = profile?.cost_absorption?.who_benefited;
  const costPaid = profile?.cost_absorption?.who_paid;

  const fetchPaySeries = useCallback(async () => {
    const base = apiBase();
    if (!base) {
      setPayMeta({
        loading: false,
        error: null,
        source_note: '',
        data_available: false,
      });
      setPaySeries(null);
      return;
    }
    setPayMeta((m) => ({
      ...m,
      loading: true,
      error: null,
      data_available: false,
    }));
    try {
      const res = await fetch(`${base}/api/executive-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyLabel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setPaySeries(Array.isArray(data.series) ? data.series : []);
      setPayMeta({
        loading: false,
        error: null,
        source_note: typeof data.source_note === 'string' ? data.source_note : '',
        data_available: Boolean(data.data_available),
      });
    } catch (e) {
      setPaySeries(null);
      setPayMeta({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
        source_note: '',
        data_available: false,
      });
    }
  }, [companyLabel]);

  useEffect(() => {
    setPaySeries(null);
    setPayMeta({
      loading: false,
      error: null,
      source_note: '',
      data_available: false,
    });
    fetchPaySeries();
  }, [fetchPaySeries]);

  const containerStyle = {
    fontFamily: '"Space Mono", monospace',
    background: BG,
    color: TEXT,
    padding: '1.25rem',
    borderRadius: 8,
    border: `1px solid ${GRID}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  };

  const SettlementTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
      <div
        style={{
          background: '#161d2c',
          border: `1px solid ${AMBER}`,
          borderRadius: 6,
          padding: '0.65rem 0.75rem',
          maxWidth: 320,
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        <div style={{ color: AMBER, fontWeight: 700, marginBottom: 6 }}>{row.year}</div>
        <div style={{ color: TEXT, marginBottom: 8 }}>
          {formatUsdCompact(row.total)} (parsed from events)
        </div>
        {row.events?.map((ev, i) => (
          <div key={i} style={{ color: '#b8c5d6', marginTop: 4 }}>
            {ev}
          </div>
        ))}
      </div>
    );
  };

  const PayDisparityTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
      <div
        style={{
          background: '#161d2c',
          border: `1px solid ${AMBER}`,
          borderRadius: 6,
          padding: '0.65rem 0.75rem',
          fontSize: 11,
          fontFamily: '"Space Mono", monospace',
        }}
      >
        <div style={{ color: AMBER, fontWeight: 700, marginBottom: 6 }}>{row.year}</div>
        <div style={{ color: AMBER }}>CEO total: {formatUsdCompact(row.ceo)}</div>
        <div style={{ color: MEDIAN_BLUE }}>Median employee: {formatUsdCompact(row.median)}</div>
        {row.ratio != null && (
          <div style={{ color: RATIO_GREY, marginTop: 4 }}>
            Pay ratio: {row.ratio >= 100 ? Math.round(row.ratio) : row.ratio.toFixed(1)}×
          </div>
        )}
      </div>
    );
  };

  const showProxyFallback =
    !payMeta.loading &&
    !payMeta.error &&
    apiBase() &&
    paySeries !== null &&
    !payMeta.data_available;

  const showNoApiFallback = !payMeta.loading && !payMeta.error && !apiBase();

  if (!profile) {
    return (
      <div style={{ ...containerStyle, opacity: 0.7 }}>
        <p style={{ margin: 0 }}>No profile loaded.</p>
      </div>
    );
  }

  return (
    <div className="company-charts" style={containerStyle}>
      <section>
        <h3 style={sectionTitle()}>PAY DISPARITY OVER TIME</h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: 10, color: AXIS, lineHeight: 1.5 }}>
          CEO total compensation vs median employee pay (USD), from DEF 14A disclosures where
          available (2018–present). Grey line: pay ratio (right axis).
        </p>

        {payMeta.data_available && disparityRows.length > 0 && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart
                data={disparityRows}
                margin={{ top: 8, right: 52, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis
                  dataKey="year"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 9 }}
                  tickFormatter={(v) => formatUsdCompact(v)}
                  width={56}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={RATIO_GREY}
                  tick={{ fill: RATIO_GREY, fontSize: 9 }}
                  tickFormatter={(v) => `${v}×`}
                  width={44}
                />
                <Tooltip content={<PayDisparityTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  formatter={(value) => (
                    <span style={{ color: TEXT, fontFamily: '"Space Mono", monospace' }}>{value}</span>
                  )}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ceo"
                  name="CEO total comp"
                  stroke={AMBER}
                  strokeWidth={2}
                  dot={{ r: 3, fill: AMBER }}
                  connectNulls={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="median"
                  name="Median employee"
                  stroke={MEDIAN_BLUE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: MEDIAN_BLUE }}
                  connectNulls={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ratio"
                  name="Pay ratio (CEO ÷ median)"
                  stroke={RATIO_GREY}
                  strokeWidth={1.75}
                  dot={{ r: 2, fill: RATIO_GREY }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {(showProxyFallback || showNoApiFallback) && (
          <div
            style={{
              border: `1px solid ${GRID}`,
              borderRadius: 6,
              padding: '1rem',
              background: 'rgba(154,165,184,0.06)',
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: TEXT, lineHeight: 1.55 }}>
              Proxy data unavailable — check SEC EDGAR DEF 14A filings.
            </p>
            <p style={{ margin: '0.75rem 0 0', fontSize: 11 }}>
              <a
                href={secEdgarSearchUrl(companyLabel)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: MEDIAN_BLUE }}
              >
                SEC EDGAR full-text search: {companyLabel}
              </a>
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: 11 }}>
              <a
                href={secDef14aBrowseUrl(companyLabel)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: MEDIAN_BLUE }}
              >
                Browse DEF 14A filings (company name lookup)
              </a>
            </p>
            {showNoApiFallback && (
              <p style={{ margin: '0.75rem 0 0', fontSize: 10, color: AXIS }}>
                Set VITE_API_URL to your API origin to enable live proxy lookup (Perplexity on the
                server).
              </p>
            )}
          </div>
        )}

        {payMeta.loading && (
          <p style={{ margin: '0.5rem 0 0', fontSize: 11, color: AXIS }}>
            Loading DEF 14A pay series via Perplexity (server proxy)…
          </p>
        )}
        {payMeta.error && (
          <div style={{ margin: '0.5rem 0 0' }}>
            <p style={{ margin: 0, fontSize: 11, color: MUTED_RED }}>
              Live pay lookup: {payMeta.error}
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: 11 }}>
              <a
                href={secEdgarSearchUrl(companyLabel)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: MEDIAN_BLUE }}
              >
                SEC EDGAR search: {companyLabel}
              </a>
            </p>
          </div>
        )}
        {payMeta.source_note && payMeta.data_available && (
          <p style={{ margin: '0.5rem 0 0', fontSize: 10, color: AXIS, lineHeight: 1.45 }}>
            {payMeta.source_note}
          </p>
        )}
      </section>

      <section>
        <h3 style={sectionTitle()}>SETTLEMENT TIMELINE (HIGH / CRITICAL + $)</h3>
        {settlementChartData.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: AXIS }}>
            No qualifying timeline events (high severity with dollar amounts).
          </p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={settlementChartData} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis
                  dataKey="year"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 10 }}
                />
                <YAxis
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickFormatter={(v) => formatUsdCompact(v)}
                />
                <Tooltip content={<SettlementTooltip />} />
                <Bar dataKey="total" fill={AMBER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h3 style={sectionTitle({ textAlign: 'center', marginBottom: '1rem' })}>
          WHO CAPTURED VALUE / WHO ABSORBED COST
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          <div>
            <h4
              style={{
                ...sectionTitle({ marginBottom: '0.5rem', color: AMBER }),
              }}
            >
              Who benefited
            </h4>
            {Array.isArray(costBenefited) && costBenefited.length > 0 ? (
              costBenefited.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: `1px solid rgba(240,168,32,0.35)`,
                    background: 'rgba(240,168,32,0.06)',
                    borderRadius: 6,
                    padding: '0.65rem 0.75rem',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ color: AMBER, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                    {item.group}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT, lineHeight: 1.45 }}>{item.how}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: AXIS, margin: 0 }}>No data.</p>
            )}
          </div>
          <div>
            <h4
              style={{
                ...sectionTitle({ marginBottom: '0.5rem', color: MUTED_RED }),
              }}
            >
              Who paid
            </h4>
            {Array.isArray(costPaid) && costPaid.length > 0 ? (
              costPaid.map((item, i) => (
                <div
                  key={i}
                  style={{
                    border: `1px solid rgba(192, 57, 43, 0.4)`,
                    background: 'rgba(192, 57, 43, 0.08)',
                    borderRadius: 6,
                    padding: '0.65rem 0.75rem',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      color: MUTED_RED,
                      fontWeight: 700,
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    {item.group}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT, lineHeight: 1.45 }}>{item.how}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: AXIS, margin: 0 }}>No data.</p>
            )}
          </div>
        </div>
        {profile?.cost_absorption?.the_gap && (
          <p
            style={{
              margin: '1rem 0 0',
              fontSize: 11,
              color: AXIS,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {profile.cost_absorption.the_gap}
          </p>
        )}
      </section>
    </div>
  );
}

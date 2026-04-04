import { useEffect, useRef } from 'react';

const CEO_WORKER_RATIO = [
  { year: 1965, ratio: 21 },
  { year: 1973, ratio: 22 },
  { year: 1978, ratio: 30 },
  { year: 1989, ratio: 59 },
  { year: 1995, ratio: 122 },
  { year: 2000, ratio: 376 },
  { year: 2005, ratio: 261 },
  { year: 2010, ratio: 243 },
  { year: 2015, ratio: 302 },
  { year: 2019, ratio: 320 },
  { year: 2020, ratio: 351 },
  { year: 2021, ratio: 399 },
  { year: 2022, ratio: 344 },
  { year: 2023, ratio: 290 },
];

const TOP_1_PCT_INCOME = [
  { year: 1980, share: 10.7 },
  { year: 1985, share: 12.4 },
  { year: 1990, share: 13.9 },
  { year: 1995, share: 15.0 },
  { year: 2000, share: 20.8 },
  { year: 2005, share: 18.3 },
  { year: 2010, share: 18.1 },
  { year: 2015, share: 20.2 },
  { year: 2019, share: 19.1 },
  { year: 2021, share: 18.8 },
  { year: 2022, share: 19.0 },
];

function loadChartJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Chart) return Promise.resolve();
  const w = window;
  if (w.__eaChartJsPromise) return w.__eaChartJsPromise;
  w.__eaChartJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Chart.js load failed'));
    document.head.appendChild(s);
  });
  return w.__eaChartJsPromise;
}

/** Structural inequality context — shown on significant-profile investigations. */
export default function WealthChart() {
  const canvasCeoRef = useRef(null);
  const canvasTopRef = useRef(null);
  const chartsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    loadChartJs()
      .then(() => {
        if (cancelled || typeof window === 'undefined' || !window.Chart) return;
        chartsRef.current.forEach((c) => {
          try {
            c.destroy();
          } catch {
            /* ignore */
          }
        });
        chartsRef.current = [];

        const Chart = window.Chart;
        const axisColor = '#6a8a9a';
        const gridColor = '#1c2a3a';

        if (canvasCeoRef.current) {
          const ch = new Chart(canvasCeoRef.current, {
            type: 'line',
            data: {
              labels: CEO_WORKER_RATIO.map((d) => d.year),
              datasets: [
                {
                  label: 'CEO-to-worker pay ratio',
                  data: CEO_WORKER_RATIO.map((d) => d.ratio),
                  borderColor: '#ff6b6b',
                  backgroundColor: 'rgba(255,107,107,0.05)',
                  borderWidth: 2,
                  pointRadius: 2,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `CEO earns ${ctx.raw}x the median worker (approx.)`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { color: axisColor, font: { family: 'monospace', size: 9 } },
                  grid: { color: gridColor },
                },
                y: {
                  ticks: {
                    color: axisColor,
                    font: { family: 'monospace', size: 9 },
                    callback: (v) => `${v}×`,
                  },
                  grid: { color: gridColor },
                },
              },
            },
          });
          chartsRef.current.push(ch);
        }

        if (canvasTopRef.current) {
          const ch2 = new Chart(canvasTopRef.current, {
            type: 'line',
            data: {
              labels: TOP_1_PCT_INCOME.map((d) => d.year),
              datasets: [
                {
                  label: 'Top 1% income share',
                  data: TOP_1_PCT_INCOME.map((d) => d.share),
                  borderColor: '#f0a820',
                  backgroundColor: 'rgba(240, 168, 32, 0.08)',
                  borderWidth: 2,
                  pointRadius: 2,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.raw}% of pre-tax income`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { color: axisColor, font: { family: 'monospace', size: 9 } },
                  grid: { color: gridColor },
                },
                y: {
                  ticks: {
                    color: axisColor,
                    font: { family: 'monospace', size: 9 },
                    callback: (v) => `${v}%`,
                  },
                  grid: { color: gridColor },
                },
              },
            },
          });
          chartsRef.current.push(ch2);
        }
      })
      .catch(() => {
        /* silent — decorative context only */
      });

    return () => {
      cancelled = true;
      chartsRef.current.forEach((c) => {
        try {
          c.destroy();
        } catch {
          /* ignore */
        }
      });
      chartsRef.current = [];
    };
  }, []);

  return (
    <div style={{ margin: '32px 0' }}>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#f0a820',
          borderBottom: '1px solid #2a3f52',
          paddingBottom: 8,
          marginBottom: 16,
        }}
      >
        CEO pay vs. median worker — US 1965–2023
      </div>

      <div style={{ position: 'relative', height: 200 }}>
        <canvas ref={canvasCeoRef} />
      </div>

      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 16,
          color: '#6a8a9a',
          marginTop: 10,
          lineHeight: 1.5,
        }}
      >
        In 1965, the average CEO earned about 21× the typical worker. By 2021, estimates exceeded 350–400×
        before moderating. Source: Economic Policy Institute / executive compensation literature (illustrative
        series).
      </div>

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#f0a820',
            borderBottom: '1px solid #2a3f52',
            paddingBottom: 8,
            marginBottom: 16,
          }}
        >
          Top 1% share of US income — 1980–2022
        </div>

        <div style={{ position: 'relative', height: 180 }}>
          <canvas ref={canvasTopRef} />
        </div>

        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 18,
            color: '#a8c4d8',
            lineHeight: 1.7,
            marginTop: 12,
          }}
        >
          In 1980 the top 1% earned about 10.7% of all US pre-tax income. By 2022 that share was near roughly
          19%. The bottom half of earners split a comparable fraction across vastly more people. Source: World
          Inequality Database directionally; exact shares vary by definition year.
        </div>
      </div>

      <div
        style={{
          background: 'rgba(240, 168, 32, 0.07)',
          border: '1px solid rgba(240, 168, 32, 0.2)',
          borderLeft: '3px solid #f0a820',
          padding: '14px 18px',
          marginTop: 16,
          borderRadius: '0 4px 4px 0',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#f0a820',
            marginBottom: 6,
          }}
        >
          What this means for every company you tap
        </div>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 20,
            color: '#f0e8d0',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Every corporate investigation card exists inside this context. The tax avoidance, the wage suppression,
          the executive pay — these are not isolated events. They are the mechanism by which the gap above widens
          every year.
        </p>
      </div>
    </div>
  );
}

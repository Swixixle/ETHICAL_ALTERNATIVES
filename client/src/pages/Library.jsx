import { useCallback, useEffect, useMemo, useState } from 'react';
import DossierCard from '../components/DossierCard.jsx';
import './Library.css';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function concernDotClass(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'significant') return 'bb-concern-dot bb-concern-dot--significant';
  if (l === 'moderate') return 'bb-concern-dot bb-concern-dot--moderate';
  return 'bb-concern-dot bb-concern-dot--other';
}

/** @param {{ onBack: () => void }} props */
export default function Library({ onBack }) {
  const [profiles, setProfiles] = useState(/** @type {any[]} */ ([]));
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [search, setSearch] = useState('');
  const [concernFilter, setConcernFilter] = useState('all');
  const [sort, setSort] = useState('az');
  const [selectedSlug, setSelectedSlug] = useState(/** @type {string | null} */ (null));
  const [detail, setDetail] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState(/** @type {string | null} */ (null));
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiPrefix()}/api/library`);
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error || `HTTP ${r.status}`);
          setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
          setTotal(typeof data.total === 'number' ? data.total : 0);
          setLoading(false);
          return;
        }
        setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        setTotal(typeof data.total === 'number' ? data.total : data.profiles?.length || 0);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load library');
          setProfiles([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSorted = useMemo(() => {
    let rows = profiles.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          (p.name && String(p.name).toLowerCase().includes(q)) ||
          (p.slug && String(p.slug).toLowerCase().includes(q)) ||
          (p.parent && String(p.parent).toLowerCase().includes(q))
      );
    }
    if (concernFilter === 'significant') {
      rows = rows.filter((p) => String(p.concern_level || '').toLowerCase() === 'significant');
    }
    rows.sort((a, b) => {
      if (sort === 'za') {
        return String(b.name || b.slug).localeCompare(String(a.name || a.slug), 'en', {
          sensitivity: 'base',
        });
      }
      if (sort === 'recent') {
        const ta = new Date(a.updated_at || 0).getTime();
        const tb = new Date(b.updated_at || 0).getTime();
        return tb - ta;
      }
      return String(a.name || a.slug).localeCompare(String(b.name || b.slug), 'en', {
        sensitivity: 'base',
      });
    });
    return rows;
  }, [profiles, search, concernFilter, sort]);

  const grouped = useMemo(() => {
    const letters = new Map();
    for (const p of filteredSorted) {
      const name = String(p.name || p.slug || '?');
      const letter = name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!letters.has(key)) letters.set(key, []);
      letters.get(key).push(p);
    }
    return [...letters.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSorted]);

  /** Full A→Z order for prev/next (physical “adjacent page” in the book). */
  const navOrder = useMemo(() => {
    return profiles
      .slice()
      .sort((a, b) =>
        String(a.name || a.slug).localeCompare(String(b.name || b.slug), 'en', { sensitivity: 'base' })
      );
  }, [profiles]);

  const alphaFirstSlug = useMemo(() => navOrder[0]?.slug ?? null, [navOrder]);

  const readSlugFromLocation = useCallback(() => {
    try {
      const raw = (window.location.pathname || '/').replace(/\/$/, '') || '/';
      const m = raw.match(/^\/library(?:\/([^/]+))?$/);
      if (!m) return null;
      return m[1] ? decodeURIComponent(m[1]) : null;
    } catch {
      return null;
    }
  }, []);

  const syncSelectionFromLocation = useCallback(() => {
    if (!profiles.length) return;
    const seg = readSlugFromLocation();
    const valid = seg && profiles.some((p) => p.slug === seg);
    if (valid) {
      setSelectedSlug(seg);
      return;
    }
    if (isDesktop && alphaFirstSlug) {
      setSelectedSlug(alphaFirstSlug);
      try {
        window.history.replaceState({}, '', `/library/${encodeURIComponent(alphaFirstSlug)}`);
      } catch {
        /* ignore */
      }
    } else {
      setSelectedSlug(null);
    }
  }, [profiles, isDesktop, alphaFirstSlug, readSlugFromLocation]);

  useEffect(() => {
    syncSelectionFromLocation();
  }, [syncSelectionFromLocation]);

  useEffect(() => {
    const onPop = () => syncSelectionFromLocation();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [syncSelectionFromLocation]);

  const navigateToSlug = useCallback((slug) => {
    const s = String(slug || '').trim();
    if (!s) return;
    setSelectedSlug(s);
    try {
      window.history.pushState({}, '', `/library/${encodeURIComponent(s)}`);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!selectedSlug) {
      setDetail(null);
      setDetailErr(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailErr(null);
    (async () => {
      try {
        const r = await fetch(`${apiPrefix()}/api/library/${encodeURIComponent(selectedSlug)}`);
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setDetail(null);
          setDetailErr(data.error || `HTTP ${r.status}`);
          return;
        }
        setDetail(data.profile && typeof data.profile === 'object' ? data.profile : null);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setDetailErr(e?.message || 'Failed to load dossier');
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const navIdx = useMemo(
    () => navOrder.findIndex((p) => p.slug === selectedSlug),
    [navOrder, selectedSlug]
  );
  const prevMeta =
    navIdx > 0
      ? {
          slug: navOrder[navIdx - 1].slug,
          name: navOrder[navIdx - 1].name || navOrder[navIdx - 1].slug,
        }
      : null;
  const nextMeta =
    navIdx >= 0 && navIdx < navOrder.length - 1
      ? {
          slug: navOrder[navIdx + 1].slug,
          name: navOrder[navIdx + 1].name || navOrder[navIdx + 1].slug,
        }
      : null;

  const showMobileDetail = !isDesktop && selectedSlug;

  return (
    <div className="bb-page">
      <header className="bb-page__top">
        <div className="bb-page__head-row">
          <button type="button" className="bb-page__back-home" onClick={onBack}>
            ← Home
          </button>
          <h1 className="bb-page__title">Black Book</h1>
          <span className="bb-page__count">{total} companies</span>
        </div>
        <div className="bb-page__controls">
          <input
            type="search"
            className="bb-page__search"
            placeholder="Search names…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter companies"
          />
          <select
            className="bb-page__select"
            value={concernFilter}
            onChange={(e) => setConcernFilter(e.target.value)}
            aria-label="Concern filter"
          >
            <option value="all">All concerns</option>
            <option value="significant">Significant only</option>
          </select>
          <select
            className="bb-page__select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort order"
          >
            <option value="az">Sort A→Z</option>
            <option value="za">Sort Z→A</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
      </header>

      {loading ? (
        <p className="bb-page__error" style={{ color: '#888' }}>
          Loading index…
        </p>
      ) : null}
      {error && !loading ? (
        <p className="bb-page__error">{error}</p>
      ) : null}

      <div className={`bb-layout${showMobileDetail ? ' bb-layout--detail' : ''}`}>
        <aside className="bb-index" aria-label="Alphabetical index">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <h2 className="bb-index__letter">{letter}</h2>
              {items.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  data-concern={p.concern_level || ''}
                  className={`library-index-item bb-index-item${selectedSlug === p.slug ? ' bb-index-item--active' : ''}`}
                  onClick={() => navigateToSlug(p.slug)}
                >
                  <span className="company-name bb-index-item__name">{p.name || p.slug}</span>
                  <span className={`concern-dot ${concernDotClass(p.concern_level)}`} aria-hidden />
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="bb-detail-col">
          {showMobileDetail ? (
            <button
              type="button"
              className="bb-back"
              onClick={() => {
                setSelectedSlug(null);
                try {
                  window.history.pushState({}, '', '/library');
                } catch {
                  /* ignore */
                }
              }}
            >
              ← Index
            </button>
          ) : null}

          {!selectedSlug && !isDesktop ? (
            <p className="bb-dossier__muted" style={{ padding: '24px 12px' }}>
              Choose a company from the list.
            </p>
          ) : null}

          {detailLoading ? (
            <p className="bb-dossier__muted">Opening dossier…</p>
          ) : null}
          {detailErr ? <p className="bb-page__error">{detailErr}</p> : null}
          {detail && !detailLoading ? (
            <DossierCard
              profile={detail}
              prev={prevMeta}
              next={nextMeta}
              onNavigate={navigateToSlug}
              compact={!isDesktop}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

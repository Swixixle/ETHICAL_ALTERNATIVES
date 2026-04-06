import { useState, useEffect, useMemo } from 'react';
import './DirectoryPage.css';

const CONCERN_LABEL = {
  significant: 'Significant',
  moderate:    'Moderate',
  minor:       'Minor',
  clean:       'Clean',
  unknown:     'Unknown',
};

const CONCERN_CLASS = {
  significant: 'badge-significant',
  moderate:    'badge-moderate',
  minor:       'badge-minor',
  clean:       'badge-clean',
  unknown:     'badge-unknown',
};

export default function DirectoryPage({ setMode, investigateByBrand }) {
  const [profiles, setProfiles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [activeSector, setActiveSector] = useState('All');

  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${apiBase}/api/profiles/index`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProfiles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiBase]);

  const sectors = useMemo(() => {
    const s = new Set(profiles.map((p) => p.sector).filter(Boolean));
    return ['All', ...[...s].sort()];
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return profiles
      .filter((p) => {
        const matchSector = activeSector === 'All' || p.sector === activeSector;
        const matchSearch =
          !q ||
          p.display_name?.toLowerCase().includes(q) ||
          p.brand_slug?.toLowerCase().includes(q) ||
          p.sector?.toLowerCase().includes(q);
        return matchSector && matchSearch;
      })
      .sort((a, b) =>
        (a.display_name || a.brand_slug).localeCompare(
          b.display_name || b.brand_slug
        )
      );
  }, [profiles, search, activeSector]);

  function handleRowClick(slug) {
    window.history.pushState({}, '', `/profile/${slug}`);
    if (investigateByBrand) investigateByBrand(slug);
    if (setMode) setMode('deep');
  }

  function handleBack() {
    window.history.pushState({}, '', '/');
    if (setMode) setMode('home');
  }

  return (
    <div className="dir-page">
      <div className="dir-header">
        <button className="dir-back" onClick={handleBack}>← Back</button>
        <div className="dir-label">EthicalAlt · Investigation Index</div>
        <div className="dir-headline">
          {loading ? 'Loading…' : `${filtered.length} profile${filtered.length !== 1 ? 's' : ''}`}
        </div>
        <div className="dir-sub">
          Public record investigations. Tap any company to load its dossier.
        </div>
      </div>

      <input
        className="dir-search"
        type="text"
        placeholder="Search companies, sectors, slugs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="dir-filters">
        {sectors.map((s) => (
          <button
            key={s}
            className={`dir-filter-btn${activeSector === s ? ' active' : ''}`}
            onClick={() => setActiveSector(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="dir-error">Failed to load profiles: {error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="dir-empty">No profiles match that filter.</div>
      )}

      {!error && (
        <div className="dir-table-wrap">
          <table className="dir-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="hide-mobile">Sector</th>
                <th className="hide-small">Slug</th>
                <th>Concern</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="dir-skeleton-row">
                      <td><div className="skeleton" style={{ width: '60%' }} /></td>
                      <td className="hide-mobile"><div className="skeleton" style={{ width: '50%' }} /></td>
                      <td className="hide-small"><div className="skeleton" style={{ width: '40%' }} /></td>
                      <td><div className="skeleton" style={{ width: 50 }} /></td>
                    </tr>
                  ))
                : filtered.map((p) => (
                    <tr
                      key={p.brand_slug}
                      className="dir-row"
                      onClick={() => handleRowClick(p.brand_slug)}
                    >
                      <td>
                        <span className="company-name">
                          {p.display_name || p.brand_slug}
                        </span>
                        {p.generated_headline && (
                          <span className="company-headline">
                            {p.generated_headline.length > 72
                              ? p.generated_headline.slice(0, 72) + '…'
                              : p.generated_headline}
                          </span>
                        )}
                      </td>
                      <td className="hide-mobile">
                        <span className="sector-tag">{p.sector || '—'}</span>
                      </td>
                      <td className="hide-small">
                        <span className="slug-tag">{p.brand_slug}</span>
                      </td>
                      <td>
                        <span className={`badge ${CONCERN_CLASS[p.overall_concern_level] || 'badge-unknown'}`}>
                          {CONCERN_LABEL[p.overall_concern_level] || p.overall_concern_level || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dir-footer">
        Nikodemus Systems · EthicalAlt · All data sourced from public records
      </div>
    </div>
  );
}

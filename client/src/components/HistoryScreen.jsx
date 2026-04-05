import { useCallback, useEffect, useState } from 'react';
import InvestigationCard from './InvestigationCard.jsx';
import HealthCallout from './HealthCallout.jsx';
import ShareCard from './ShareCard.jsx';
import { getInvestigationRecordPresentation } from '../utils/investigationConfidence.js';
import QuickAlternatives from './QuickAlternatives.jsx';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function historyListUrl(sessionId) {
  const q = new URLSearchParams({ session_id: sessionId });
  return apiBase ? `${apiBase}/api/history?${q}` : `/api/history?${q}`;
}

function historyDetailUrl(id, sessionId) {
  const q = new URLSearchParams({ session_id: sessionId });
  return apiBase ? `${apiBase}/api/history/${id}?${q}` : `/api/history/${id}?${q}`;
}

function getSessionId() {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    let id = sessionStorage.getItem('ea_session_id');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ea-${Date.now()}`;
      sessionStorage.setItem('ea_session_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

function concernBadgeColor(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'significant') return { bg: 'rgba(255,107,107,0.15)', text: '#ff6b6b', border: '#ff6b6b' };
  if (l === 'minor' || l === 'clean') return { bg: 'rgba(106,170,138,0.15)', text: '#6aaa8a', border: '#6aaa8a' };
  return { bg: 'rgba(240,168,32,0.1)', text: '#f0a820', border: '#f0a820' };
}

/**
 * @param {{ onBack: () => void }} props
 */
export default function HistoryScreen({ onBack }) {
  const [sessionId] = useState(() => getSessionId());
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(/**  @type {string | null} */ (null));
  const [selectedId, setSelectedId] = useState(/** @type {number | null} */ (null));
  const [detail, setDetail] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [detailLoading, setDetailLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const loadList = useCallback(async () => {
    if (!sessionId) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(historyListUrl(sessionId));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(data.error || 'Could not load history');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Network error');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = useCallback(
    async (id) => {
      setSelectedId(id);
      setDetail(null);
      setDetailLoading(true);
      try {
        const res = await fetch(historyDetailUrl(id, sessionId));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setDetail(null);
          return;
        }
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [sessionId]
  );

  const investigation = detail?.investigation && typeof detail.investigation === 'object' ? detail.investigation : null;
  const identification =
    detail?.identification && typeof detail.identification === 'object' ? detail.identification : null;

  const headline =
    investigation?.generated_headline && String(investigation.generated_headline).trim()
      ? String(investigation.generated_headline).trim()
      : identification?.object
        ? String(identification.object)
        : detail?.brand_name
          ? String(detail.brand_name)
          : 'Saved investigation';

  if (selectedId != null) {
    return (
      <div style={{ background: '#0f1520', minHeight: '100vh', color: '#f0e8d0' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: '#0f1520',
            borderBottom: '1px solid #2a3f52',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
            }}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid #2a3f52',
              color: '#a8c4d8',
              padding: '8px 14px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 2,
              color: '#6a8a9a',
              textTransform: 'uppercase',
            }}
          >
            History
          </span>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 18px 48px' }}>
          {detailLoading ? (
            <p style={{ fontFamily: "'Crimson Pro', serif", color: '#6a8a9a' }}>Loading…</p>
          ) : investigation && identification ? (
            <>
              <QuickAlternatives registryResults={[]} localResults={[]} />
              <HealthCallout investigation={investigation} />
              <InvestigationCard
                investigation={investigation}
                identification={identification}
                result={null}
                recordPresentation={getInvestigationRecordPresentation(identification, investigation, {})}
                headline={headline}
                onShare={() => setShowShare(true)}
              />
            </>
          ) : (
            <p style={{ fontFamily: "'Crimson Pro', serif", color: '#6a8a9a' }}>
              Could not load this record.
            </p>
          )}
        </div>

        {showShare && investigation && identification ? (
          <ShareCard
            investigation={investigation}
            identification={identification}
            onClose={() => setShowShare(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ background: '#0f1520', minHeight: '100vh', color: '#f0e8d0' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#0f1520',
          borderBottom: '1px solid #2a3f52',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px solid #2a3f52',
            color: '#a8c4d8',
            padding: '8px 14px',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          ← Home
        </button>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 3,
            color: '#f0a820',
            textTransform: 'uppercase',
          }}
        >
          History
        </span>
        <span style={{ width: 72 }} />
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 18px 48px' }}>
        <p
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            color: '#6a8a9a',
            lineHeight: 1.55,
            margin: '0 0 20px',
          }}
        >
          Your recent investigations on this device.
        </p>

        {listLoading ? (
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6a8a9a' }}>Loading…</p>
        ) : null}
        {listError ? (
          <p style={{ fontFamily: "'Crimson Pro', serif", color: '#ff6b6b' }}>{listError}</p>
        ) : null}

        {!listLoading && !items.length ? (
          <p style={{ fontFamily: "'Crimson Pro', serif", color: '#6a8a9a' }}>No saved investigations yet.</p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((row) => {
            const id = Number(row.id);
            const colors = concernBadgeColor(row.overall_concern_level);
            const created = row.created_at ? String(row.created_at).slice(0, 10) : '';
            const hl =
              row.generated_headline && String(row.generated_headline).trim()
                ? String(row.generated_headline).trim()
                : row.object_name
                  ? String(row.object_name)
                  : row.brand_name
                    ? String(row.brand_name)
                    : 'Investigation';
            return (
              <button
                key={id}
                type="button"
                onClick={() => void openDetail(id)}
                style={{
                  textAlign: 'left',
                  background: '#162030',
                  border: '1px solid #2a3f52',
                  borderRadius: 4,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  color: '#f0e8d0',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 20,
                    letterSpacing: 1,
                    marginBottom: 8,
                    lineHeight: 1.15,
                  }}
                >
                  {hl}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  {row.brand_name ? (
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: '#a8c4d8',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                      }}
                    >
                      {String(row.brand_name)}
                    </span>
                  ) : null}
                  {row.overall_concern_level ? (
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: `1px solid ${colors.border}`,
                        background: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {String(row.overall_concern_level)}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 13,
                    color: '#5a6a78',
                    fontStyle: 'italic',
                  }}
                >
                  {created}
                  {row.city ? ` · ${String(row.city)}` : ''}
                </div>
                {Array.isArray(row.verdict_tags) && row.verdict_tags.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {row.verdict_tags.slice(0, 5).map((t) => (
                      <span
                        key={String(t)}
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          letterSpacing: 0.75,
                          textTransform: 'uppercase',
                          color: '#6aaa8a',
                          border: '1px solid rgba(106,170,138,0.35)',
                          borderRadius: 999,
                          padding: '2px 8px',
                        }}
                      >
                        {String(t).replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

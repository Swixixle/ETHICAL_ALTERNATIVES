import { useCallback, useEffect, useRef, useState } from 'react';
import { getImpactFetchHeaders } from '../lib/impactConsent.js';

const NAVY = '#0A1F3D';
const AMBER = '#D4A017';
const BODY = '#E0E0E0';

function documentaryUrl() {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base ? `${base}/api/documentary` : '/api/documentary';
}

async function consumeSseLines(response, onData, signal) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let sep;
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        onData(parsed);
        if (parsed === '[DONE]') return;
      }
    }
  }
}

/**
 * Full-viewport “field report” while investigation streams. Typewriter + SSE from POST /api/documentary.
 */
export default function LocalDocumentary({
  city,
  state,
  brandName,
  brandSlug,
  investigationReady,
  onRelease,
  runKey,
}) {
  const [shown, setShown] = useState('');
  const [progress, setProgress] = useState(0);
  const [streamComplete, setStreamComplete] = useState(false);

  const fullTextRef = useRef('');
  const displayIdxRef = useRef(0);
  const streamDoneRef = useRef(false);
  const invEarlyRef = useRef(false);
  const invEarlyPosRef = useRef(0);
  const startMsRef = useRef(Date.now());
  const releasedRef = useRef(false);
  const abortRef = useRef(null);
  const typeTimerRef = useRef(null);
  const progressRafRef = useRef(null);
  const progressStartRef = useRef(null);
  const invReadyRef = useRef(false);

  invReadyRef.current = investigationReady;

  const tryRelease = useCallback(() => {
    if (releasedRef.current) return;
    const minOk = Date.now() - startMsRef.current >= 8000;
    const inv = invReadyRef.current;
    const streamOk = streamDoneRef.current;
    let sentenceOk = streamOk;
    if (invEarlyRef.current && !streamDoneRef.current) {
      const target = invEarlyPosRef.current;
      sentenceOk = displayIdxRef.current >= target;
    }
    if (minOk && inv && sentenceOk) {
      releasedRef.current = true;
      if (abortRef.current) abortRef.current.abort();
      onRelease?.();
    }
  }, [onRelease]);

  useEffect(() => {
    releasedRef.current = false;
    streamDoneRef.current = false;
    setStreamComplete(false);
    invEarlyRef.current = false;
    invEarlyPosRef.current = 0;
    fullTextRef.current = '';
    displayIdxRef.current = 0;
    setShown('');
    setProgress(0);
    startMsRef.current = Date.now();
    progressStartRef.current = Date.now();

    const ac = new AbortController();
    abortRef.current = ac;

    const cityUse = (city && String(city).trim()) || 'your area';
    const stateUse = state != null ? String(state).trim() : '';

    void (async () => {
      try {
        const res = await fetch(documentaryUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
          body: JSON.stringify({
            city: cityUse,
            state: stateUse,
            brand_name: brandName,
            brand_slug: brandSlug,
          }),
          signal: ac.signal,
        });
        if (!res.ok) {
          fullTextRef.current =
            'We could not load the local field report. Your investigation will appear when ready.';
          streamDoneRef.current = true;
          setStreamComplete(true);
          return;
        }
        await consumeSseLines(
          res,
          (data) => {
            if (data === '[DONE]') {
              streamDoneRef.current = true;
              setStreamComplete(true);
              return;
            }
            if (typeof data === 'string') {
              fullTextRef.current += data;
            }
          },
          ac.signal
        );
        if (!streamDoneRef.current) {
          streamDoneRef.current = true;
          setStreamComplete(true);
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        fullTextRef.current =
          'The field report could not be reached. Your investigation will appear when ready.';
        streamDoneRef.current = true;
        setStreamComplete(true);
      }
    })();

    typeTimerRef.current = window.setInterval(() => {
      const full = fullTextRef.current;
      let idx = displayIdxRef.current;
      if (idx < full.length) {
        const chunk = Math.min(3, full.length - idx);
        idx += chunk;
        displayIdxRef.current = idx;
        setShown(full.slice(0, idx));
      }
      tryRelease();
    }, 42);

    const tickProgress = () => {
      if (ac.signal.aborted) return;
      const elapsed = Date.now() - (progressStartRef.current || Date.now());
      if (invReadyRef.current) {
        setProgress(100);
        progressRafRef.current = requestAnimationFrame(tickProgress);
        tryRelease();
        return;
      }
      const p = Math.min(100, (elapsed / 25000) * 100);
      setProgress(p);
      progressRafRef.current = requestAnimationFrame(tickProgress);
    };
    progressRafRef.current = requestAnimationFrame(tickProgress);

    return () => {
      ac.abort();
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current);
    };
  }, [runKey, city, state, brandName, brandSlug, tryRelease]);

  useEffect(() => {
    if (investigationReady && !invEarlyRef.current && !streamDoneRef.current) {
      invEarlyRef.current = true;
      const full = fullTextRef.current;
      const cur = displayIdxRef.current;
      const rest = full.slice(cur);
      const dot = rest.search(/[.\n]/);
      invEarlyPosRef.current = dot >= 0 ? cur + dot + 1 : full.length;
    }
    if (investigationReady) setProgress(100);
    tryRelease();
  }, [investigationReady, tryRelease]);

  const labelCity = (city && String(city).trim()) || 'your area';
  const labelState = state != null && String(state).trim() ? String(state).trim() : '';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!streamComplete}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: NAVY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px 32px',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color: AMBER,
          margin: '0 0 24px',
        }}
      >
        FIELD REPORT · {labelCity.toUpperCase()}
        {labelState ? `, ${labelState.toUpperCase()}` : ''}
      </p>
      <div
        style={{
          maxWidth: 320,
          width: '100%',
          flex: '0 1 auto',
          fontFamily: "'Crimson Text', serif",
          fontSize: 14,
          lineHeight: 1.8,
          color: BODY,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
        }}
      >
        {shown}
      </div>
      <div
        style={{
          marginTop: 'auto',
          width: 'min(320px, 100%)',
          height: 3,
          background: 'rgba(212,160,23,0.2)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: AMBER,
            transition: investigationReady ? 'width 0.35s ease-out' : 'none',
          }}
        />
      </div>
    </div>
  );
}

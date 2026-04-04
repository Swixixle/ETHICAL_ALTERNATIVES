import { useCallback, useEffect, useState } from 'react';

const SKILLS = [
  'Moving & hauling',
  'Cleaning',
  'Painting',
  'Landscaping & yard work',
  'General labor',
  'Delivery & errands',
  'Childcare',
  'Elder care',
  'Pet care',
  'Cooking & meal prep',
  'Tutoring',
  'Tech help',
  'Construction & repair',
  'Electrical (unlicensed assist)',
  'Plumbing (unlicensed assist)',
  'Event setup & breakdown',
  'Other',
];

function formatTime(t) {
  if (t == null) return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** @param {{ post: Record<string, unknown> }} props */
function BoardPost({ post }) {
  const contact = typeof post.contact === 'string' ? post.contact : '';
  const isEmail = contact.includes('@');

  return (
    <div
      style={{
        background: '#162030',
        border: '1px solid #2a3f52',
        borderLeft: post.post_type === 'offer' ? '3px solid #6aaa8a' : '3px solid #f0a820',
        borderRadius: '0 4px 4px 0',
        padding: '14px 16px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: post.post_type === 'offer' ? '#6aaa8a' : '#f0a820',
              marginBottom: 4,
            }}
          >
            {post.post_type === 'offer' ? 'Available Today' : 'Help Needed'}
            {post.distance_miles != null && post.distance_miles !== ''
              ? ` · ${post.distance_miles} mi`
              : ''}
          </div>

          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: 1,
              color: '#f0e8d0',
              marginBottom: 4,
            }}
          >
            {post.title}
          </div>

          {post.name || contact ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#a8c4d8',
                marginBottom: 6,
              }}
            >
              {post.name ? <span>{post.name}</span> : null}
              {contact ? (
                <>
                  {post.name ? ' · ' : null}
                  <a
                    href={
                      isEmail ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`
                    }
                    style={{ color: '#f0a820' }}
                  >
                    {contact}
                  </a>
                </>
              ) : null}
            </div>
          ) : null}

          {post.description ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 14,
                color: '#a8c4d8',
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              {post.description}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {Array.isArray(post.skills) &&
              post.skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#6a8a9a',
                    border: '1px solid #2a3f52',
                    borderRadius: 999,
                    padding: '2px 6px',
                  }}
                >
                  {skill}
                </span>
              ))}
          </div>

          {post.rate ? (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#f0a820',
                letterSpacing: 1,
              }}
            >
              {post.rate}
            </div>
          ) : null}
        </div>

        {post.available_from ? (
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginLeft: 12,
              flexShrink: 0,
              textAlign: 'right',
            }}
          >
            {formatTime(post.available_from)}–{formatTime(post.available_until)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** @param {{ onSubmit: () => void; location: Record<string, unknown> | null }} props */
function PostForm({ onSubmit, location }) {
  const [type, setType] = useState('offer');
  const [name, setName] = useState('');
  const [contactVal, setContactVal] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [selectedSkills, setSkills] = useState([]);
  const [rate, setRate] = useState('');
  const [from, setFrom] = useState('08:00');
  const [until, setUntil] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(null);

  function apiPrefix() {
    return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  }

  function toggleSkill(skill) {
    setSkills((s) => (s.includes(skill) ? s.filter((x) => x !== skill) : [...s, skill]));
  }

  async function handleSubmit() {
    if (!name || !contactVal || !title) {
      setError('Name, contact info, and title are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = apiPrefix();
      const url = base ? `${base}/api/board` : '/api/board';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: type,
          name,
          contact: contactVal,
          title,
          description,
          skills: selectedSkills,
          rate,
          available_from: from,
          available_until: until,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          city: location?.city ?? null,
          state_province: location?.state ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Post failed');
      setDone(data.message);
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#0f1520',
    border: '1px solid #2a3f52',
    borderRadius: 2,
    padding: '8px 12px',
    fontFamily: "'Crimson Pro', serif",
    fontSize: 16,
    color: '#f0e8d0',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: 12,
  };
  const labelStyle = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#6a8a9a',
    display: 'block',
    marginBottom: 4,
  };

  if (done) {
    return (
      <div
        style={{
          background: 'rgba(106,170,138,0.1)',
          border: '1px solid #6aaa8a',
          borderLeft: '3px solid #6aaa8a',
          padding: '16px 20px',
          borderRadius: '0 4px 4px 0',
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            color: '#6aaa8a',
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          You&apos;re on the board.
        </div>
        <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 18, color: '#a8c4d8', margin: 0 }}>{done}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { value: 'offer', label: "I'm available to work" },
          { value: 'need', label: 'I need help' },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            style={{
              flex: 1,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              padding: '10px 8px',
              borderRadius: 2,
              cursor: 'pointer',
              border: type === opt.value ? '1px solid #f0a820' : '1px solid #2a3f52',
              background: type === opt.value ? 'rgba(240, 168, 32,0.1)' : 'transparent',
              color: type === opt.value ? '#f0a820' : '#6a8a9a',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label style={labelStyle} htmlFor="cb-name">
        Your name
      </label>
      <input
        id="cb-name"
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="First name is fine"
      />

      <label style={labelStyle} htmlFor="cb-contact">
        Contact (phone or email — shared with your match)
      </label>
      <input
        id="cb-contact"
        style={inputStyle}
        value={contactVal}
        onChange={(e) => setContactVal(e.target.value)}
        placeholder="317-555-0100 or you@email.com"
      />

      <label style={labelStyle} htmlFor="cb-title">
        {type === 'offer' ? 'What can you do today?' : 'What do you need done?'}
      </label>
      <input
        id="cb-title"
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={
          type === 'offer'
            ? 'e.g. Available for moving, yard work, delivery'
            : 'e.g. Need help moving a couch, 2 hours'
        }
      />

      <label style={labelStyle} htmlFor="cb-desc">
        More details (optional)
      </label>
      <textarea
        id="cb-desc"
        style={{ ...inputStyle, height: 70, resize: 'vertical' }}
        value={description}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Anything else they should know"
      />

      <label style={labelStyle}>Skills / categories</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {SKILLS.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => toggleSkill(skill)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 999,
              cursor: 'pointer',
              border: selectedSkills.includes(skill) ? '1px solid #f0a820' : '1px solid #2a3f52',
              background: selectedSkills.includes(skill) ? 'rgba(240, 168, 32,0.1)' : 'transparent',
              color: selectedSkills.includes(skill) ? '#f0a820' : '#6a8a9a',
            }}
          >
            {skill}
          </button>
        ))}
      </div>

      <label style={labelStyle} htmlFor="cb-rate">
        Rate or pay
      </label>
      <input
        id="cb-rate"
        style={inputStyle}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        placeholder="e.g. $20/hr, $100 flat, make an offer"
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle} htmlFor="cb-from">
            Available from
          </label>
          <input id="cb-from" type="time" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle} htmlFor="cb-until">
            Until
          </label>
          <input id="cb-until" type="time" style={inputStyle} value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>

      {error ? (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: '#ff6b6b',
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading}
        style={{
          width: '100%',
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          background: '#f0a820',
          color: '#0f1520',
          border: 'none',
          padding: '12px',
          borderRadius: 2,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Posting...' : "Post to Today's Board →"}
      </button>
    </div>
  );
}

/** @param {{ location: Record<string, unknown> | null }} props */
export default function CommunityBoard({ location }) {
  const [view, setView] = useState('board');
  const [board, setBoard] = useState(
    /** @type {{ offers: unknown[]; needs: unknown[]; count?: number } | null} */ (null)
  );
  const [loading, setLoading] = useState(true);

  function apiPrefix() {
    return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  }

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (location?.lat != null && Number.isFinite(Number(location.lat))) {
        params.set('lat', String(location.lat));
      }
      if (location?.lng != null && Number.isFinite(Number(location.lng))) {
        params.set('lng', String(location.lng));
      }
      const base = apiPrefix();
      const url = base ? `${base}/api/board?${params}` : `/api/board?${params}`;
      const res = await fetch(url);
      const data = await res.json();
      setBoard(data);
    } catch (err) {
      console.error('[board]', err instanceof Error ? err.message : err);
      setBoard({ offers: [], needs: [], count: 0 });
    } finally {
      setLoading(false);
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const count =
    board?.count ??
    (Array.isArray(board?.offers) && Array.isArray(board?.needs)
      ? board.offers.length + board.needs.length
      : 0);

  return (
    <div style={{ padding: '0 16px 40px' }}>
      <div style={{ borderBottom: '2px solid #f0a820', paddingBottom: 8, marginBottom: 20 }}>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28,
            letterSpacing: 3,
            color: '#f0a820',
            textTransform: 'uppercase',
          }}
        >
          Community Board
        </div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            color: '#6a8a9a',
            textTransform: 'uppercase',
          }}
        >
          {today} · Resets at midnight
        </div>
      </div>

      <p
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 18,
          color: '#a8c4d8',
          lineHeight: 1.7,
          marginBottom: 20,
        }}
      >
        Daily labor board. Post by 10am, work starts at noon. EthicalAlt connects you — the work happens
        between people, not platforms. No cut taken. No reviews. No algorithm.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setView('board')}
          style={{
            flex: 1,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '8px',
            borderRadius: 2,
            cursor: 'pointer',
            border: view === 'board' ? '1px solid #f0a820' : '1px solid #2a3f52',
            background: view === 'board' ? 'rgba(240, 168, 32,0.1)' : 'transparent',
            color: view === 'board' ? '#f0a820' : '#6a8a9a',
          }}
        >
          Today&apos;s Board
        </button>
        <button
          type="button"
          onClick={() => setView('post')}
          style={{
            flex: 1,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '8px',
            borderRadius: 2,
            cursor: 'pointer',
            border: view === 'post' ? '1px solid #f0a820' : '1px solid #2a3f52',
            background: view === 'post' ? 'rgba(240, 168, 32,0.1)' : 'transparent',
            color: view === 'post' ? '#f0a820' : '#6a8a9a',
          }}
        >
          + Post to Board
        </button>
      </div>

      {view === 'board' ? (
        <div>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 0',
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                color: '#6a8a9a',
                textTransform: 'uppercase',
              }}
            >
              Loading today&apos;s board...
            </div>
          ) : null}

          {!loading && count === 0 ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 16,
                color: '#6a8a9a',
                lineHeight: 1.7,
                textAlign: 'center',
                padding: '32px 0',
              }}
            >
              Nothing posted yet today.
              <br />
              Be the first on the board.
              <br />
              <br />
              <button
                type="button"
                onClick={() => setView('post')}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  background: 'transparent',
                  border: '1px solid #f0a820',
                  padding: '8px 16px',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                Post to Today&apos;s Board
              </button>
            </div>
          ) : null}

          {!loading && Array.isArray(board?.offers) && board.offers.length > 0 ? (
            <>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#6aaa8a',
                  marginBottom: 10,
                }}
              >
                Available Today ({board.offers.length})
              </div>
              {board.offers.map((post) => (
                <BoardPost key={String(post && post.id)} post={post} />
              ))}
            </>
          ) : null}

          {!loading && Array.isArray(board?.needs) && board.needs.length > 0 ? (
            <>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  marginBottom: 10,
                  marginTop: 20,
                }}
              >
                Help Needed Today ({board.needs.length})
              </div>
              {board.needs.map((post) => (
                <BoardPost key={String(post && post.id)} post={post} />
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      {view === 'post' ? <PostForm location={location} onSubmit={() => void loadBoard()} /> : null}
    </div>
  );
}

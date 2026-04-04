/**
 * Local feed trust: registry = VERIFIED INDEPENDENT (green); OSM / map = LOCAL (amber, no border).
 * @param {{ trustTier?: string; chainFootnote?: boolean; customLabel?: string }} props
 */
export default function TrustStrip({ trustTier, chainFootnote = false, customLabel }) {
  if (chainFootnote) {
    return (
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#ff6b6b',
          marginBottom: 6,
        }}
      >
        Chain · reference only
      </div>
    );
  }

  const trimmed = typeof customLabel === 'string' ? customLabel.trim() : '';
  if (trimmed) {
    return (
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#f0a820',
          marginBottom: 8,
        }}
      >
        {trimmed}
      </div>
    );
  }

  const raw = trustTier || 'local';
  const tier =
    raw === 'verified_independent'
      ? 'verified_independent'
      : raw === 'chain' || raw === 'chain_candidate'
        ? 'chain_label'
        : 'local';

  if (tier === 'verified_independent') {
    return (
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#6aaa8a',
          border: '1px solid rgba(106,170,138,0.45)',
          background: 'rgba(106,170,138,0.1)',
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 2,
          marginBottom: 8,
        }}
      >
        VERIFIED INDEPENDENT
      </div>
    );
  }

  if (tier === 'chain_label') {
    return (
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#ff6b6b',
          border: '1px solid rgba(255,107,107,0.35)',
          background: 'rgba(255,107,107,0.06)',
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 2,
          marginBottom: 8,
        }}
      >
        CHAIN
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: '#f0a820',
        marginBottom: 8,
      }}
    >
      LOCAL
    </div>
  );
}

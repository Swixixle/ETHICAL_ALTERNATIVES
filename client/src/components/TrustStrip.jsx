/**
 * Mandatory trust label for local feed and alternatives cards.
 * @param {{ trustTier?: string; chainFootnote?: boolean }} props
 */
export default function TrustStrip({ trustTier, chainFootnote = false }) {
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

  const tier = trustTier || 'local_unvetted';
  const styles = {
    verified_independent: { color: '#6aaa8a', border: '1px solid rgba(106,170,138,0.45)', bg: 'rgba(106,170,138,0.1)' },
    local_unvetted: { color: '#f0a820', border: '1px solid rgba(240,168,32,0.35)', bg: 'rgba(240,168,32,0.08)' },
    not_verified: { color: '#6a8a9a', border: '1px solid #344d62', bg: 'rgba(52,77,98,0.2)' },
    chain: { color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.35)', bg: 'rgba(255,107,107,0.06)' },
    chain_candidate: { color: '#c9a227', border: '1px solid rgba(201,162,39,0.4)', bg: 'rgba(201,162,39,0.08)' },
  };
  const labels = {
    verified_independent: 'VERIFIED INDEPENDENT',
    local_unvetted: 'LOCAL UNVETTED',
    not_verified: 'NOT VERIFIED',
    chain: 'CHAIN',
    chain_candidate: 'NOT VERIFIED',
  };
  const s = styles[tier] || styles.local_unvetted;
  const label = labels[tier] || labels.local_unvetted;

  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: s.color,
        border: s.border,
        background: s.bg,
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 2,
        marginBottom: 8,
      }}
    >
      {label}
    </div>
  );
}

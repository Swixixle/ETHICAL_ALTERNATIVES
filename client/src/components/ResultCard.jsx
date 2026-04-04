import './ResultCard.css';

function truncate(str, n) {
  if (!str) return '';
  return str.length <= n ? str : `${str.slice(0, n - 1)}…`;
}

/**
 * @param {{ result: Record<string, unknown> }} props
 */
export default function ResultCard({ result }) {
  const title = truncate(String(result?.title || 'Listing'), 60);
  const price = result?.price_usd != null ? Number(result.price_usd).toFixed(2) : '—';
  const currency = result?.currency ? String(result.currency) : 'USD';
  const shop = String(result?.shop_name || '');
  const loc = [result?.shop_city, result?.shop_state, result?.shop_country].filter(Boolean).join(', ');
  const href = String(result?.url || '#');
  const img = result?.image_url ? String(result.image_url) : null;
  const label = String(result?.provenance_label || 'Independent');

  return (
    <article className="result-card">
      <div className="result-card__media">
        {img ? (
          <img className="result-card__img" src={img} alt="" loading="lazy" />
        ) : (
          <div className="result-card__placeholder" aria-hidden />
        )}
      </div>
      <div className="result-card__body">
        <span className="result-card__pill">{label}</span>
        <h3 className="result-card__title">{title}</h3>
        <p className="result-card__price">
          {currency} {price}
        </p>
        <p className="result-card__shop">{shop}</p>
        {loc ? <p className="result-card__loc">{loc}</p> : null}
        <a className="result-card__link" href={href} target="_blank" rel="noreferrer">
          View on Etsy →
        </a>
      </div>
    </article>
  );
}

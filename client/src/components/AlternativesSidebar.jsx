import RegistryCard from './RegistryCard.jsx';
import TrustStrip from './TrustStrip.jsx';
import ListYourShop from './ListYourShop.jsx';
import SecondhandLinks from './SecondhandLinks.jsx';
import DiySection from './DiySection.jsx';
import { getGoogleMapsUrl, getStreetAddressLine } from '../utils/localBusinessMaps.js';

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: '#a8c4d8',
        borderBottom: '1px solid #2a3f52',
        paddingBottom: 6,
        marginBottom: 14,
        marginTop: 28,
      }}
    >
      {children}
    </div>
  );
}

function LocalCard({ place }) {
  const trustTier =
    typeof place.trust_tier === 'string' && place.trust_tier.trim()
      ? place.trust_tier.trim()
      : 'local';
  const provenance =
    typeof place.provenance_label === 'string' && place.provenance_label.trim()
      ? place.provenance_label.trim()
      : undefined;
  const name = place.name || 'Independent Business';
  const website = place.website ? String(place.website) : null;
  const phone = place.phone ? String(place.phone) : null;
  const addr = place.address ? String(place.address) : '';
  const streetLine = getStreetAddressLine(place);
  const coordishAddr = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr.trim());
  const displayAddr = streetLine || (!coordishAddr && addr.trim() ? addr.trim() : '');
  const mapsHref = getGoogleMapsUrl(place);
  const distance_mi =
    typeof place.distance_miles === 'number' ? place.distance_miles.toFixed(1) : null;

  const websiteHref = website
    ? website.startsWith('http')
      ? website
      : `https://${website}`
    : null;

  const directionsLinkStyle = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 9,
    color: '#f0a820',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    padding: 0,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '12px 16px',
        marginBottom: 10,
      }}
    >
      <TrustStrip trustTier={trustTier} customLabel={provenance} />
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          letterSpacing: 1,
          color: '#f0e8d0',
          marginBottom: 2,
        }}
      >
        {name}
      </div>

      {distance_mi != null ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            color: '#6a8a9a',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {distance_mi} mi away
        </div>
      ) : null}

      {displayAddr ? (
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 14,
            color: '#6a8a9a',
            marginBottom: 6,
          }}
        >
          {displayAddr}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {website ? (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#f0a820',
              padding: '4px 10px',
              borderRadius: 2,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Visit ↗
          </a>
        ) : null}
        {mapsHref ? (
          <a href={mapsHref} target="_blank" rel="noreferrer" style={directionsLinkStyle}>
            GET DIRECTIONS ↗
          </a>
        ) : null}
        {phone ? (
          <a
            href={`tel:${phone}`}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#a8c4d8',
              border: '1px solid #2a3f52',
              padding: '4px 10px',
              borderRadius: 2,
              textDecoration: 'none',
            }}
          >
            Call
          </a>
        ) : null}
      </div>
    </div>
  );
}

function EtsyCard({ listing }) {
  if (!listing) return null;
  const title = listing.title ? String(listing.title) : 'Etsy listing';
  const url = listing.url ? String(listing.url) : '#';
  const shop_name = listing.shop_name ? String(listing.shop_name) : '';
  const price =
    listing.price_usd != null
      ? `${listing.currency ? String(listing.currency) : 'USD'} ${Number(listing.price_usd).toFixed(2)}`
      : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '12px 16px',
        marginBottom: 10,
        textDecoration: 'none',
      }}
    >
      <TrustStrip trustTier="local" />
      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 15,
          color: '#f0e8d0',
          lineHeight: 1.4,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {shop_name ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            color: '#f0a820',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {shop_name}
        </div>
      ) : null}
      {price ? (
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: '#a8c4d8',
          }}
        >
          {price}
        </div>
      ) : null}
    </a>
  );
}

/**
 * @param {{
 *   registryResults?: Array<Record<string, unknown>>;
 *   localResults?: Array<Record<string, unknown>>;
 *   etsyResults?: Array<Record<string, unknown>>;
 *   identification?: Record<string, unknown> | null;
 *   investigation?: Record<string, unknown> | null;
 * }} props
 */
export default function AlternativesSidebar({
  registryResults,
  localResults,
  etsyResults,
  identification,
  investigation,
}) {
  const hasRegistry = Array.isArray(registryResults) && registryResults.length > 0;
  const hasLocal = Array.isArray(localResults) && localResults.length > 0;
  const hasEtsy = Array.isArray(etsyResults) && etsyResults.length > 0;

  const object = identification?.object ? String(identification.object) : '';
  const keywords = identification?.search_keywords ? String(identification.search_keywords) : '';
  const category = identification?.category ? String(identification.category) : '';

  return (
    <div>
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 26,
          letterSpacing: 3,
          color: '#f0e8d0',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Alternatives
      </div>
      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 14,
          color: '#6a8a9a',
          lineHeight: 1.5,
          marginBottom: 20,
        }}
      >
        Independent, local, and ethical options for what you tapped.
      </div>

      {hasRegistry ? (
        <>
          <SectionLabel>Independent Sellers</SectionLabel>
          {registryResults.map((seller) => (
            <RegistryCard key={String(seller.id)} seller={seller} />
          ))}
        </>
      ) : null}

      {hasLocal ? (
        <>
          <SectionLabel>Near You</SectionLabel>
          {localResults.slice(0, 6).map((place) => (
            <LocalCard key={String(place.osm_id ?? place.name)} place={place} />
          ))}
        </>
      ) : null}

      {hasEtsy ? (
        <>
          <SectionLabel>Indie Makers — Ships to You</SectionLabel>
          {etsyResults.slice(0, 5).map((listing) => (
            <EtsyCard key={String(listing.listing_id)} listing={listing} />
          ))}
        </>
      ) : null}

      <SectionLabel>Secondhand</SectionLabel>
      <SecondhandLinks keywords={keywords} object={object} />

      <SectionLabel>Make It Yourself</SectionLabel>
      <DiySection
        object={object}
        category={category}
        keywords={keywords}
        investigation={investigation}
      />

      {!hasRegistry && !hasLocal && !hasEtsy ? (
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 15,
            color: '#6a8a9a',
            lineHeight: 1.7,
            padding: '16px 0',
          }}
        >
          No alternatives found near you yet for this category.
          <br />
          <br />
          Know an independent maker or local shop that belongs here?
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <ListYourShop />
      </div>
    </div>
  );
}

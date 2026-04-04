import { hasDocumentedHealthConcerns } from '../utils/investigationHealth.js';

const CATEGORY_RESOURCES = {
  clothing: {
    repair: [
      {
        label: 'iFixit Clothing Repair',
        url: 'https://www.ifixit.com/Wiki/Clothing_Repair',
        note: 'Free repair guides',
      },
      {
        label: 'Ravelry — Knitting Patterns',
        url: 'https://www.ravelry.com',
        note: 'Free and paid patterns, huge community',
      },
      {
        label: 'Mending community — r/Visible Mending',
        url: 'https://www.reddit.com/r/VisibleMending',
        note: 'Repair as craft',
      },
    ],
    make: [
      {
        label: 'Closet Core Patterns',
        url: 'https://closetcorepatterns.com',
        note: 'Independent sewing patterns',
      },
      {
        label: 'Seamwork',
        url: 'https://www.seamwork.com',
        note: 'Sewing patterns + community',
      },
    ],
    community: [
      {
        label: 'Find a Repair Cafe near you',
        url: 'https://repaircafe.org/en/visit/',
        note: 'Free community repair events worldwide',
      },
      {
        label: 'Find a Makerspace',
        url: 'https://www.makerspaces.com/makerspace-directory/',
        note: 'Local workshops with sewing machines, tools',
      },
      {
        label: 'Clothing Swap events',
        url: 'https://swaporamarama.org',
        note: 'Community clothing exchanges',
      },
    ],
  },
  food: {
    make: [
      {
        label: 'Local Harvest — Find a CSA',
        url: 'https://www.localharvest.org/csa.jsp',
        note: 'Community Supported Agriculture near you',
      },
      {
        label: 'Find a Farmers Market',
        url: 'https://www.ams.usda.gov/local-food-directories/farmersmarkets',
        note: 'USDA farmers market directory',
      },
      {
        label: 'Find a Food Co-op',
        url: 'https://www.strongertogether.coop/find-a-co-op/',
        note: 'Member-owned grocery stores',
      },
    ],
    community: [
      {
        label: 'Grow your own — RHS',
        url: 'https://www.rhs.org.uk/vegetables',
        note: 'Vegetable growing guides',
      },
      {
        label: 'Community Gardens',
        url: 'https://communitygarden.org/resources/',
        note: 'Find a community garden',
      },
      {
        label: 'Seed Library Network',
        url: 'https://www.seedlibraries.net',
        note: 'Free seeds from your library',
      },
    ],
  },
  coffee: {
    make: [
      {
        label: "Home Roasting Guide — Sweet Maria's",
        url: 'https://www.sweetmarias.com/learn',
        note: 'Roast your own beans at home',
      },
      {
        label: 'Direct Trade Green Beans',
        url: 'https://www.sweetmarias.com',
        note: 'Buy green coffee direct from farmers',
      },
    ],
    community: [
      {
        label: 'Find a Coffee Co-op',
        url: 'https://equalexchange.coop/coffee',
        note: 'Equal Exchange worker-owned cooperative',
      },
      {
        label: 'Local roasters near you',
        url: 'https://www.beanscene.com.au/find-a-roaster',
        note: 'Independent roaster directory',
      },
    ],
  },
  personal_care: {
    make: [
      {
        label: 'DIY Natural — Recipes',
        url: 'https://www.diynatural.com',
        note: 'Make your own soap, shampoo, skincare',
      },
      {
        label: 'Brambleberry — Soap Supplies',
        url: 'https://www.brambleberry.com',
        note: 'Independent soap making supplier',
      },
    ],
    health: [
      {
        label: 'EWG Skin Deep Database',
        url: 'https://www.ewg.org/skindeep/',
        note: 'Check ingredients for safety concerns',
      },
      {
        label: 'Think Dirty App',
        url: 'https://www.thinkdirtyapp.com',
        note: 'Scan product barcodes for ingredient concerns',
      },
    ],
    community: [
      {
        label: 'r/DIYBeauty',
        url: 'https://www.reddit.com/r/DIYBeauty',
        note: 'Community formulation and recipes',
      },
    ],
  },
  electronics: {
    repair: [
      {
        label: 'iFixit Repair Guides',
        url: 'https://www.ifixit.com',
        note: "The world's free repair manual",
      },
      {
        label: 'Find a Repair Cafe',
        url: 'https://repaircafe.org/en/visit/',
        note: 'Community electronics repair events',
      },
    ],
    community: [
      {
        label: 'Find a Makerspace',
        url: 'https://www.makerspaces.com/makerspace-directory/',
        note: 'Local electronics workshop and tools',
      },
      {
        label: 'r/fixit — Repair tips',
        url: 'https://www.reddit.com/r/fixit',
        note: 'Repair tips and community',
      },
    ],
  },
  home_goods: {
    make: [
      {
        label: 'Instructables — Home Projects',
        url: 'https://www.instructables.com/home/',
        note: 'Free DIY guides for everything',
      },
      {
        label: 'Ana White — Free Furniture Plans',
        url: 'https://www.ana-white.com',
        note: 'Free woodworking plans',
      },
    ],
    community: [
      {
        label: 'Find a Tool Library',
        url: 'https://www.localtools.org',
        note: 'Borrow tools instead of buying',
      },
      {
        label: 'Freecycle Network',
        url: 'https://www.freecycle.org',
        note: 'Free local goods in your community',
      },
      {
        label: 'Buy Nothing Groups',
        url: 'https://buynothingproject.org',
        note: 'Hyperlocal gifting communities',
      },
    ],
  },
  default: {
    repair: [
      {
        label: 'iFixit — Repair Anything',
        url: 'https://www.ifixit.com',
        note: 'Free repair guides for almost everything',
      },
      {
        label: 'Find a Repair Cafe near you',
        url: 'https://repaircafe.org/en/visit/',
        note: 'Community repair events worldwide',
      },
    ],
    community: [
      {
        label: 'Buy Nothing Project',
        url: 'https://buynothingproject.org',
        note: 'Hyperlocal gifting — get it free locally',
      },
      {
        label: 'Freecycle',
        url: 'https://www.freecycle.org',
        note: 'Free local goods',
      },
      {
        label: 'Find a Makerspace',
        url: 'https://www.makerspaces.com/makerspace-directory/',
        note: 'Local workshops and community tools',
      },
      {
        label: 'Local Facebook Marketplace',
        url: 'https://www.facebook.com/marketplace',
        note: 'Secondhand local',
      },
    ],
  },
};

function ResourceLink({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        background: '#162030',
        border: '1px solid #2a3f52',
        borderRadius: 4,
        padding: '10px 14px',
        marginBottom: 8,
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#f0e8d0',
              marginBottom: 3,
            }}
          >
            {item.label}
          </div>
          {item.note ? (
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 13,
                color: '#6a8a9a',
                lineHeight: 1.4,
              }}
            >
              {item.note}
            </div>
          ) : null}
        </div>
        <span style={{ color: '#f0a820', fontSize: 14, marginLeft: 10, flexShrink: 0 }}>↗</span>
      </div>
    </a>
  );
}

function SubLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: '#6a8a9a',
        marginBottom: 8,
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   object?: string;
 *   category?: string;
 *   keywords?: string;
 *   investigation?: Record<string, unknown> | null;
 * }} props
 */
export default function DiySection({ object, category, keywords, investigation }) {
  const cat = category ? String(category) : '';
  const resources = CATEGORY_RESOURCES[cat] || CATEGORY_RESOURCES.default;
  const showHealthExtras =
    hasDocumentedHealthConcerns(investigation) &&
    Array.isArray(resources.health) &&
    resources.health.length > 0;

  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`DIY ${object || keywords || ''}`)}`;

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to make ${object || keywords || ''} DIY`)}`;

  const ifixitUrl = `https://www.ifixit.com/Search?query=${encodeURIComponent(object || keywords || '')}`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#f0e8d0',
            background: '#1c2a3a',
            border: '1px solid #2a3f52',
            borderRadius: 4,
            padding: '10px 12px',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Pinterest DIY ↗
        </a>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#f0e8d0',
            background: '#1c2a3a',
            border: '1px solid #2a3f52',
            borderRadius: 4,
            padding: '10px 12px',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          YouTube How-To ↗
        </a>
      </div>

      <a
        href={ifixitUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          background: 'rgba(240, 168, 32, 0.07)',
          border: '1px solid rgba(240, 168, 32, 0.25)',
          borderLeft: '3px solid #f0a820',
          borderRadius: '0 4px 4px 0',
          padding: '10px 14px',
          marginBottom: 16,
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#f0a820',
          }}
        >
          iFixit — Repair Guide ↗
        </div>
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 13,
            color: '#a8c4d8',
            marginTop: 3,
          }}
        >
          Free repair manuals. Fix what you have before replacing it.
        </div>
      </a>

      {resources.repair?.length > 0 ? (
        <>
          <SubLabel>Repair</SubLabel>
          {resources.repair.map((item, i) => (
            <ResourceLink key={i} item={item} />
          ))}
        </>
      ) : null}

      {resources.make?.length > 0 ? (
        <>
          <SubLabel>Make It Yourself</SubLabel>
          {resources.make.map((item, i) => (
            <ResourceLink key={i} item={item} />
          ))}
        </>
      ) : null}

      {showHealthExtras ? (
        <>
          <SubLabel>Healthier Alternatives</SubLabel>
          {resources.health.map((item, i) => (
            <ResourceLink key={i} item={item} />
          ))}
        </>
      ) : null}

      {resources.community?.length > 0 ? (
        <>
          <SubLabel>Community Connections</SubLabel>
          {resources.community.map((item, i) => (
            <ResourceLink key={i} item={item} />
          ))}
        </>
      ) : null}

      <SubLabel>Connect Locally</SubLabel>
      {[
        {
          label: 'Find a Repair Cafe',
          url: 'https://repaircafe.org/en/visit/',
          note: "Community repair events — bring what's broken, fix it together",
        },
        {
          label: 'Buy Nothing Project',
          url: 'https://buynothingproject.org',
          note: 'Hyperlocal gifting — someone near you probably has one',
        },
        {
          label: 'Mutual Aid Hub',
          url: 'https://www.mutualaidhub.org',
          note: 'Find mutual aid networks near you',
        },
        {
          label: 'Find a Tool Library',
          url: 'https://www.localtools.org',
          note: 'Borrow tools, share resources, meet your neighbors',
        },
        {
          label: 'Time Banking — hOurworld',
          url: 'https://hourworld.org',
          note: 'Trade skills with your community — no money needed',
        },
      ].map((item, i) => (
        <ResourceLink key={i} item={item} />
      ))}
    </div>
  );
}

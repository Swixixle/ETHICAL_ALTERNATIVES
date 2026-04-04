export default function SecondhandLinks({ keywords, object }) {
  const q = encodeURIComponent(keywords || object || '');

  const links = [
    {
      name: 'Depop',
      url: `https://www.depop.com/search/?q=${q}`,
      description: 'Fashion & clothing resale',
    },
    {
      name: 'Vinted',
      url: `https://www.vinted.com/catalog?search_text=${q}`,
      description: 'Secondhand clothing',
    },
    {
      name: 'Poshmark',
      url: `https://poshmark.com/search?query=${q}`,
      description: 'Fashion resale marketplace',
    },
    {
      name: 'eBay',
      url: `https://www.ebay.com/sch/i.html?_nkw=${q}`,
      description: 'General secondhand',
    },
    {
      name: 'Facebook Marketplace',
      url: `https://www.facebook.com/marketplace/search/?query=${q}`,
      description: 'Local secondhand',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#162030',
            border: '1px solid #2a3f52',
            borderRadius: 4,
            padding: '10px 14px',
            textDecoration: 'none',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#e8dfc8',
              }}
            >
              {link.name}
            </div>
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 13,
                color: '#4a6478',
                marginTop: 2,
              }}
            >
              {link.description}
            </div>
          </div>
          <span style={{ color: '#e8a020', fontSize: 14 }}>↗</span>
        </a>
      ))}
    </div>
  );
}

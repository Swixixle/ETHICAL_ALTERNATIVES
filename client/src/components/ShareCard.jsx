import { useCallback, useEffect, useMemo, useState } from 'react';
import { getImpactFetchHeaders } from '../lib/impactConsent.js';
import ShareSheet from './Civic/ShareSheet.jsx';
import {
  WITNESS_LEGAL_NOTICE,
  WITNESS_LEGAL_NOTICE_COMPACT,
  ETHICALALT_CONTACT,
} from '../constants/witnessLegalNotice.js';
import { methodologyPageUrl } from '../lib/methodologyUrl.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function tweetUrl(text) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function facebookShareUrl(pageUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

const REGULATOR_CHECKLIST_ACTION = {
  FTC: 'Open complaint form',
  SEC: 'Open tips portal',
  IRS: 'Open whistleblower information',
  NLRB: 'Open complaint form',
  DOL: 'Open complaint form',
  OSHA: 'Open complaint form',
  EPA: 'Open report form',
  FDA: 'Open report form',
};

function checklistLabelForRegulator(reg) {
  const action = REGULATOR_CHECKLIST_ACTION[reg.agency] || 'Open form';
  return `${reg.agency} — ${action}`;
}

function pressRowId(handle) {
  const h = String(handle || '').replace(/^@+/, '');
  return `press_${h}`;
}

function composeTwitterWithPress(shareData, outlets, variant) {
  const cd = shareData.card_data || {};
  const concern = String(cd.concern_level || 'unknown');
  const emoji =
    { significant: '🔴', moderate: '🟡', minor: '🟢', clean: '✅' }[concern] || '⚪';
  const topTags = (cd.top_tags || [])
    .slice(0, 3)
    .map((t) => String(t).replace(/_/g, ' ').toUpperCase());
  const site =
    typeof shareData.share_url === 'string' && shareData.share_url
      ? shareData.share_url
      : 'https://ethicalalt-client.onrender.com';
  const companyTag = typeof shareData.company_tag === 'string' ? shareData.company_tag : '';
  const brandName =
    typeof shareData.brand_name === 'string' && shareData.brand_name.trim()
      ? shareData.brand_name.trim()
      : 'Company';
  const headline = String(cd.headline || brandName)
    .replace(/\s+/g, ' ')
    .trim();
  const excerpt = headline.length > 200 ? `${headline.slice(0, 200)}…` : headline;
  const tagStr = outlets.map((o) => o.handle).join(' ');
  const intro = `${emoji} Investigated ${brandName}. ${excerpt}${tagStr ? `. ${tagStr}` : ''}`;
  if (variant === 'company') {
    return `${intro}\n\n${topTags.join(' · ')}\n\n${companyTag} — documented public record (primary sources in thread context).\n\n#EthicalAlt\n${site}`;
  }
  return `${intro}\n\n${topTags.join(' · ')}\n\nSourced public record · #EthicalAlt\n${companyTag}\n\n${site}`;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

function stateName(code) {
  const c = String(code || '').toUpperCase();
  return US_STATES.find((s) => s.code === c)?.name || c;
}

/** @param {{ title: string; selectedCount: number; open: boolean; onToggle: () => void; children: React.ReactNode }} props */
function CollapseSection({ title, selectedCount, open, onToggle, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: '#f0e8d0',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#a8c4d8',
            flex: 1,
          }}
        >
          {title}{' '}
          <span style={{ color: '#d4a017' }}>
            ({selectedCount} selected)
          </span>
        </span>
        <span style={{ color: '#6a8a9a', fontSize: 14 }} aria-hidden>
          {open ? '▼' : '›'}
        </span>
      </button>
      {open ? <div style={{ paddingBottom: 10 }}>{children}</div> : null}
    </div>
  );
}

const DEFAULT_OPEN = {
  social: false,
  press: false,
  regulators: false,
  state_ag: false,
  institutional: false,
  labor: false,
  ir: false,
};

/**
 * @param {{
 *   investigation: Record<string, unknown> | null;
 *   identification: Record<string, unknown> | null;
 *   onClose: () => void;
 * }} props
 */
export default function ShareCard({ investigation, identification, onClose, hireDirectShareFooter }) {
  const [witnessStep, setWitnessStep] = useState('prompt');
  const [witnessName, setWitnessName] = useState('');
  const [witnessCity, setWitnessCity] = useState('');
  const [witnessMsg, setWitnessMsg] = useState('');
  const [witnessId, setWitnessId] = useState(null);
  const [witnessBusy, setWitnessBusy] = useState(false);

  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSentConfirm, setShowSentConfirm] = useState(false);
  const [sentItems, setSentItems] = useState([]);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [userStateCode, setUserStateCode] = useState(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ea_user_state') || '' : ''
  );
  const [openSections, setOpenSections] = useState(() => ({ ...DEFAULT_OPEN }));
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('ea_session')) {
      sessionStorage.setItem(
        'ea_session',
        `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      );
    }
  }, []);

  const loadShareData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const st = userStateCode.trim().toUpperCase().length === 2 ? userStateCode.trim().toUpperCase() : '';
      const res = await fetch(`${apiPrefix()}/api/share-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
        body: JSON.stringify({
          investigation,
          identification,
          user_state: st || null,
        }),
      });
      if (!res.ok) throw new Error('share_card_http');
      const data = await res.json();
      setShareData(data);
    } catch {
      setErr('Could not load share data. Try again.');
    } finally {
      setLoading(false);
    }
  }, [investigation, identification, userStateCode]);

  useEffect(() => {
    loadShareData();
  }, [loadShareData]);

  useEffect(() => {
    if (!shareData) return;
    const tiktokOk = !shareData.tiktok_export_blocked;
    const next = {
      twitter_feed: true,
      twitter_tag: true,
      instagram: true,
      tiktok: tiktokOk,
      facebook: true,
    };
    for (const reg of shareData.relevant_regulators || []) {
      next[`reg_${reg.agency}`] = true;
    }
    for (const o of shareData.press_outlets || []) {
      next[pressRowId(o.handle)] = true;
    }
    if (shareData.state_ag) next.state_ag = true;
    for (const e of shareData.esg_raters || []) {
      next[`esg_${e.id}`] = true;
    }
    for (const p of shareData.pension_funds || []) {
      next[`pension_${p.id}`] = true;
    }
    if (shareData.union) next.union = true;
    if (shareData.ir_contact?.url) next.ir = true;
    setSelected(next);
    setShowSentConfirm(false);
    setSentItems([]);
  }, [shareData]);

  const toggle = (id) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const flipSection = (k) => {
    setOpenSections((o) => ({ ...o, [k]: !o[k] }));
  };

  const brandLabel =
    identification && typeof identification.brand === 'string' && identification.brand.trim()
      ? identification.brand.trim()
      : investigation && typeof investigation.brand === 'string'
        ? investigation.brand.trim()
        : 'this company';

  const slugForWitness =
    (investigation && typeof investigation.brand_slug === 'string' && investigation.brand_slug.trim()) ||
    (shareData && typeof shareData.brand_slug === 'string' && shareData.brand_slug.trim()) ||
    '';

  const submitWitness = async () => {
    if (!witnessName.trim() || !slugForWitness) return;
    setWitnessBusy(true);
    try {
      const res = await fetch(`${apiPrefix()}/api/witness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
        body: JSON.stringify({
          session_id: sessionStorage.getItem('ea_session') || Date.now().toString(),
          display_name: witnessName.trim(),
          brand_slug: slugForWitness,
          brand_name: brandLabel,
          investigation_headline:
            typeof investigation?.generated_headline === 'string'
              ? investigation.generated_headline
              : null,
          city: witnessCity.trim() || null,
          public_message: witnessMsg.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWitnessId(data.witness_id);
        setWitnessStep('confirmed');
      } else {
        setWitnessStep('skip');
      }
    } catch {
      setWitnessStep('skip');
    } finally {
      setWitnessBusy(false);
    }
  };

  const selectedTotal = useMemo(() => {
    if (!shareData) return 0;
    let n = 0;
    const s = selected;
    if (s.twitter_feed) n += 1;
    if (s.twitter_tag) n += 1;
    if (s.instagram) n += 1;
    if (s.tiktok) n += 1;
    if (s.facebook) n += 1;
    for (const o of shareData.press_outlets || []) {
      if (s[pressRowId(o.handle)]) n += 1;
    }
    for (const reg of shareData.relevant_regulators || []) {
      if (s[`reg_${reg.agency}`]) n += 1;
    }
    if (shareData.state_ag && s.state_ag) n += 1;
    for (const e of shareData.esg_raters || []) {
      if (s[`esg_${e.id}`]) n += 1;
    }
    for (const p of shareData.pension_funds || []) {
      if (s[`pension_${p.id}`]) n += 1;
    }
    if (shareData.union && s.union) n += 1;
    if (shareData.ir_contact?.url && s.ir) n += 1;
    return n;
  }, [shareData, selected]);

  const sectionCounts = useMemo(() => {
    if (!shareData) {
      return { social: 0, press: 0, regulators: 0, state_ag: 0, institutional: 0, labor: 0, ir: 0 };
    }
    const s = selected;
    let social = 0;
    if (s.twitter_feed) social += 1;
    if (s.twitter_tag) social += 1;
    if (s.instagram) social += 1;
    if (s.tiktok) social += 1;
    if (s.facebook) social += 1;

    let press = 0;
    for (const o of shareData.press_outlets || []) {
      if (s[pressRowId(o.handle)]) press += 1;
    }

    let regulators = 0;
    for (const reg of shareData.relevant_regulators || []) {
      if (s[`reg_${reg.agency}`]) regulators += 1;
    }

    const state_ag = shareData.state_ag && s.state_ag ? 1 : 0;

    let institutional = 0;
    for (const e of shareData.esg_raters || []) {
      if (s[`esg_${e.id}`]) institutional += 1;
    }
    for (const p of shareData.pension_funds || []) {
      if (s[`pension_${p.id}`]) institutional += 1;
    }

    const labor = shareData.union && s.union ? 1 : 0;
    const ir = shareData.ir_contact?.url && s.ir ? 1 : 0;

    return { social, press, regulators, state_ag, institutional, labor, ir };
  }, [shareData, selected]);

  const anyChecked = selectedTotal > 0;

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 0',
    margin: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  };

  const handleSendAll = async () => {
    if (!shareData || sending || !anyChecked) return;
    setSending(true);
    setToast(null);
    const completed = [];
    const sel = selected;
    const s = shareData;
    const site = typeof s.share_url === 'string' && s.share_url ? s.share_url : 'https://ethicalalt-client.onrender.com';

    const copyEmail = async () => {
      const t = s.share_texts || {};
      const body = typeof t.email_body === 'string' ? t.email_body : '';
      if (body) {
        try {
          await navigator.clipboard.writeText(body);
        } catch {
          /* ignore */
        }
      }
    };

    try {
      const pressPicked = (s.press_outlets || []).filter((o) => sel[pressRowId(o.handle)]);
      const hireDirectFoot =
        typeof hireDirectShareFooter === 'string' && hireDirectShareFooter.trim()
          ? `\n\n${hireDirectShareFooter.trim()}`
          : '';
      const twitterFeedText =
        (pressPicked.length > 0 ? composeTwitterWithPress(s, pressPicked, 'feed') : s.share_texts.twitter) +
        hireDirectFoot;
      const twitterCompanyText =
        (pressPicked.length > 0
          ? composeTwitterWithPress(s, pressPicked, 'company')
          : s.share_texts.twitter_company) + hireDirectFoot;

      if (sel.twitter_feed) {
        window.open(tweetUrl(twitterFeedText), '_blank', 'noopener,noreferrer');
        completed.push({ id: 'twitter_feed', label: 'X — Post to feed' });
      }
      if (sel.twitter_tag) {
        await sleep(sel.twitter_feed ? 500 : 0);
        window.open(tweetUrl(twitterCompanyText), '_blank', 'noopener,noreferrer');
        completed.push({ id: 'twitter_tag', label: `X — Tag company (${s.company_tag})` });
      }

      if (sel.instagram && sel.tiktok && !s.tiktok_export_blocked) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('Caption copied — paste in Instagram and TikTok');
        completed.push({ id: 'instagram', label: 'Instagram — caption copied' });
        completed.push({ id: 'tiktok', label: 'TikTok — caption copied' });
      } else if (sel.instagram && sel.tiktok && s.tiktok_export_blocked) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('Instagram caption copied (TikTok export disabled for this record)');
        completed.push({ id: 'instagram', label: 'Instagram — caption copied' });
      } else if (sel.instagram) {
        await navigator.clipboard.writeText(s.share_texts.instagram);
        setToast('Instagram caption copied');
        completed.push({ id: 'instagram', label: 'Instagram — caption copied' });
      } else if (sel.tiktok) {
        if (s.tiktok_export_blocked) {
          setToast('TikTok export is disabled for this investigation classification.');
        } else {
          await navigator.clipboard.writeText(s.share_texts.instagram);
          setToast('TikTok caption copied');
          completed.push({ id: 'tiktok', label: 'TikTok — caption copied' });
        }
      }

      if (sel.instagram || sel.tiktok) await sleep(600);
      setToast(null);

      if (sel.facebook) {
        window.open(facebookShareUrl(site), '_blank', 'noopener,noreferrer');
        completed.push({ id: 'facebook', label: 'Facebook — share link' });
      }

      const regs = (s.relevant_regulators || []).filter((r) => sel[`reg_${r.agency}`]);
      if (regs.length) {
        try {
          await navigator.clipboard.writeText(s.share_texts.regulator_pack);
        } catch {
          /* ignore */
        }
        for (let i = 0; i < regs.length; i++) {
          const reg = regs[i];
          window.open(reg.url, '_blank', 'noopener,noreferrer');
          completed.push({ id: `reg_${reg.agency}`, label: checklistLabelForRegulator(reg) });
          if (i < regs.length - 1) await sleep(800);
        }
      }

      if (s.state_ag && sel.state_ag && s.state_ag.url) {
        await copyEmail();
        window.open(s.state_ag.url, '_blank', 'noopener,noreferrer');
        completed.push({ id: 'state_ag', label: `${s.state_ag.name} — complaint portal` });
        await sleep(600);
      }

      const subj = s.share_texts?.email_subject || 'Documented investigation';
      const bod = s.share_texts?.email_body || '';

      for (const e of s.esg_raters || []) {
        if (!sel[`esg_${e.id}`]) continue;
        try {
          await navigator.clipboard.writeText(bod);
        } catch {
          /* ignore */
        }
        const mail = `mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(bod.slice(0, 1800))}`;
        window.open(mail, '_blank', 'noopener,noreferrer');
        if (e.contact) window.open(e.contact, '_blank', 'noopener,noreferrer');
        completed.push({ id: `esg_${e.id}`, label: `${e.name} — email + portal` });
        await sleep(700);
      }

      for (const p of s.pension_funds || []) {
        if (!sel[`pension_${p.id}`]) continue;
        try {
          await navigator.clipboard.writeText(bod);
        } catch {
          /* ignore */
        }
        window.open(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(bod.slice(0, 1800))}`, '_blank', 'noopener,noreferrer');
        if (p.contact) window.open(p.contact, '_blank', 'noopener,noreferrer');
        completed.push({ id: `pension_${p.id}`, label: `${p.name} — email + stewardship` });
        await sleep(700);
      }

      if (s.union && sel.union && s.union.contact) {
        try {
          await navigator.clipboard.writeText(bod);
        } catch {
          /* ignore */
        }
        window.open(s.union.contact, '_blank', 'noopener,noreferrer');
        completed.push({ id: 'union', label: `${s.union.name} — documented record` });
        await sleep(600);
      }

      if (s.ir_contact?.url && sel.ir) {
        try {
          await navigator.clipboard.writeText(bod);
        } catch {
          /* ignore */
        }
        window.open(
          `mailto:?subject=${encodeURIComponent(`Documented corporate investigation: ${s.brand_name}`)}&body=${encodeURIComponent(bod.slice(0, 1800))}`,
          '_blank',
          'noopener,noreferrer'
        );
        window.open(s.ir_contact.url, '_blank', 'noopener,noreferrer');
        completed.push({ id: 'ir', label: 'Investor relations — email + IR portal' });
      }

      setSentItems(completed);
      setShowSentConfirm(true);
    } finally {
      setSending(false);
      setToast(null);
    }
  };

  if (!investigation || !identification) return null;

  const staticRows = shareData
    ? [
        { id: 'twitter_feed', primary: 'X / Twitter — Post to my feed' },
        { id: 'twitter_tag', primary: `X / Twitter — Tag the company (${shareData.company_tag})` },
        { id: 'instagram', primary: 'Instagram — Copy caption to clipboard' },
        ...(shareData.tiktok_export_blocked
          ? []
          : [{ id: 'tiktok', primary: 'TikTok — Copy caption to clipboard' }]),
        { id: 'facebook', primary: 'Facebook — Share link' },
      ]
    : [];

  const regRows =
    shareData?.relevant_regulators?.map((reg) => ({
      id: `reg_${reg.agency}`,
      primary: checklistLabelForRegulator(reg),
    })) || [];

  const pressOutlets = shareData?.press_outlets || [];
  const cd = shareData?.card_data;
  const previewHeadline =
    cd?.headline ||
    (typeof investigation?.generated_headline === 'string' ? investigation.generated_headline : null) ||
    brandLabel;

  if (showSentConfirm) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 21, 32, 0.96)',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '24px 20px 48px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Record sent"
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              letterSpacing: 3,
              color: '#6aaa8a',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            RECORD SENT
          </div>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#6a8a9a',
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            Opened or prepared {sentItems.length} destination(s)
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
            {sentItems.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 16,
                  color: '#f0e8d0',
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}
              >
                <span style={{ color: '#6aaa8a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#f0a820',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 3,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const showDestinationList = witnessStep === 'skip' || witnessStep === 'confirmed';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 21, 32, 0.97)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Send this record"
    >
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 18px 10px',
          minHeight: 44,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            letterSpacing: 1,
            color: '#f0e8d0',
          }}
        >
          Send
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setShareSheetOpen(true)}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#0f1520',
              background: '#6aaa8a',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Share sheet
          </button>
          <button
            type="button"
            aria-label="About sending"
            onClick={() => setInfoModalOpen(true)}
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1,
              color: '#a8c4d8',
              background: 'transparent',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: 999,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ⓘ
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        investigation={investigation}
        identification={identification}
      />

      {infoModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 15, 25, 0.85)',
            zIndex: 1002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          role="presentation"
          onClick={() => setInfoModalOpen(false)}
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#1c2a3a',
              border: '1px solid #344d62',
              borderRadius: 6,
              padding: '20px 22px',
            }}
          >
            <p
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 15,
                color: '#e0e0e0',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}
            >
              When you send, EthicalAlt opens the platforms and destinations you selected. Some steps copy text
              to your clipboard to paste into forms or social apps. Nothing is posted automatically — you confirm
              each step.
            </p>
            <p style={{ fontSize: 13, color: '#a8c4d8', lineHeight: 1.55, margin: '0 0 16px' }}>
              <a href={methodologyPageUrl()} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a017' }}>
                How investigations work
              </a>
              {' — '}layers, scoring, share limits, and how to challenge a record.
            </p>
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 13,
                lineHeight: 1.65,
                color: '#a8c4d8',
                whiteSpace: 'pre-wrap',
                marginBottom: 16,
              }}
            >
              {WITNESS_LEGAL_NOTICE}
            </div>
            <p style={{ fontSize: 12, color: '#6a8a9a', marginBottom: 12 }}>{WITNESS_LEGAL_NOTICE_COMPACT}</p>
            <button
              type="button"
              onClick={() => setInfoModalOpen(false)}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: '#0a1f3d',
                background: '#d4a017',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          padding: '0 18px 12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {witnessStep === 'prompt' ? (
          <div style={{ padding: '8px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                color: '#a8c4d8',
                marginBottom: 12,
              }}
            >
              Civic witness registry
            </div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: '#e0e0e0', marginBottom: 8 }}>
              Add your name to the public record.
            </div>
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 12,
                color: '#6a8a9a',
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              The Civic Witness Registry is a voluntary public ledger. By adding your name you state that you have
              reviewed this documented investigation and choose to be on record. This is not a legal filing. Your
              name and message become public. Removal: {ETHICALALT_CONTACT}.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setWitnessStep('form')}
                style={{
                  flex: 1,
                  background: '#d4a017',
                  color: '#0a1f3d',
                  border: 'none',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Add my name
              </button>
              <button
                type="button"
                onClick={() => setWitnessStep('skip')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#6a8a9a',
                  border: '1px solid #6a8a9a',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Share anonymously
              </button>
            </div>
          </div>
        ) : null}

        {witnessStep === 'form' ? (
          <div style={{ padding: '8px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: 1.5,
                color: '#a8c4d8',
                marginBottom: 12,
              }}
            >
              Your public witness entry
            </div>
            <input
              placeholder="Your name (as it will appear publicly)"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              maxLength={80}
              style={{
                width: '100%',
                marginBottom: 10,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <input
              placeholder="City, State (optional)"
              value={witnessCity}
              onChange={(e) => setWitnessCity(e.target.value)}
              maxLength={60}
              style={{
                width: '100%',
                marginBottom: 10,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="Optional: why this matters to you (280 chars, public)"
              value={witnessMsg}
              onChange={(e) => setWitnessMsg(e.target.value.slice(0, 280))}
              rows={3}
              style={{
                width: '100%',
                marginBottom: 8,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: '#e0e0e0',
                fontSize: 13,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 11,
                color: '#6a8a9a',
                marginBottom: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {WITNESS_LEGAL_NOTICE}
            </div>
            <button
              type="button"
              onClick={() => void submitWitness()}
              disabled={!witnessName.trim() || witnessBusy}
              style={{
                width: '100%',
                background: witnessName.trim() && !witnessBusy ? '#d4a017' : '#333',
                color: witnessName.trim() && !witnessBusy ? '#0a1f3d' : '#666',
                border: 'none',
                padding: 13,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: witnessName.trim() && !witnessBusy ? 'pointer' : 'not-allowed',
              }}
            >
              {witnessBusy ? 'Saving…' : 'Enter my name in the public record'}
            </button>
          </div>
        ) : null}

        {witnessStep === 'confirmed' ? (
          <div
            style={{
              padding: '16px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>⬡</div>
            <div style={{ fontSize: 14, color: '#d4a017', fontWeight: 700, marginBottom: 4 }}>
              You are on the record
            </div>
            <div style={{ fontSize: 12, color: '#6a8a9a', lineHeight: 1.6 }}>
              {witnessName} has been added to the public {brandLabel} witness ledger.
              {witnessId != null ? ` Witness #${witnessId}.` : ''} Now share the investigation.
            </div>
          </div>
        ) : null}

        {showDestinationList && (previewHeadline || cd) ? (
          <div
            style={{
              margin: '12px 0',
              padding: '12px 14px',
              background: '#121a24',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 17,
                letterSpacing: 0.5,
                color: '#fff',
                lineHeight: 1.1,
              }}
            >
              {previewHeadline}
            </div>
            {cd?.top_tags ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {(cd.top_tags || []).slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: 0.5,
                      color: '#d4a017',
                      background: 'rgba(212,160,23,0.12)',
                      borderRadius: 999,
                      padding: '3px 8px',
                    }}
                  >
                    {String(tag).replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}
            {shareData?.disclaimer ? (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 4,
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#a8c4d8',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {shareData.disclaimer}
              </div>
            ) : null}
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: '#6a8a9a', margin: '12px 0 0', lineHeight: 1.55 }}>
              <a href={methodologyPageUrl()} target="_blank" rel="noopener noreferrer" style={{ color: '#a8c4d8' }}>
                How investigations work
              </a>
              {' — '}what this record is (and is not).
            </p>
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 24,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6a8a9a',
            }}
          >
            Building share card…
          </div>
        ) : null}

        {err ? (
          <p style={{ color: '#ff6b6b', fontFamily: "'Crimson Pro', serif", marginBottom: 16 }}>{err}</p>
        ) : null}

        {showDestinationList && shareData && !loading ? (
          <div style={{ marginTop: 8 }}>
            <CollapseSection
              title="Social"
              selectedCount={sectionCounts.social}
              open={openSections.social}
              onToggle={() => flipSection('social')}
            >
              {shareData.tiktok_export_blocked ? (
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: '#d4a017',
                    margin: '0 0 10px',
                    lineHeight: 1.5,
                  }}
                >
                  TikTok export is disabled for this record (high-risk classification). Other social
                  options remain available. Your photo is never included in any share payload.
                </p>
              ) : null}
              {staticRows.map((row) => (
                <label key={row.id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[row.id])}
                    onChange={() => toggle(row.id)}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div
                    style={{
                      fontFamily: "'Crimson Pro', serif",
                      fontSize: 14,
                      color: '#e0e0e0',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {row.primary}
                  </div>
                  <span style={{ color: '#6a8a9a' }} aria-hidden>
                    ›
                  </span>
                </label>
              ))}
            </CollapseSection>

            {pressOutlets.length > 0 ? (
              <CollapseSection
                title="Press"
                selectedCount={sectionCounts.press}
                open={openSections.press}
                onToggle={() => flipSection('press')}
              >
                {pressOutlets.map((o) => {
                  const pid = pressRowId(o.handle);
                  return (
                    <label key={pid} style={{ ...rowStyle, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[pid])}
                        onChange={() => toggle(pid)}
                        style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                          {o.name}
                        </div>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: '#6a8a9a' }}>
                          {o.beat}
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#a8c4d8' }}>
                        {o.handle}
                      </span>
                    </label>
                  );
                })}
              </CollapseSection>
            ) : null}

            {regRows.length > 0 ? (
              <CollapseSection
                title="Regulators"
                selectedCount={sectionCounts.regulators}
                open={openSections.regulators}
                onToggle={() => flipSection('regulators')}
              >
                {regRows.map((row) => (
                  <label key={row.id} style={rowStyle}>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[row.id])}
                      onChange={() => toggle(row.id)}
                      style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0', flex: 1 }}>
                      {row.primary}
                    </div>
                    <span style={{ color: '#6a8a9a' }} aria-hidden>
                      ›
                    </span>
                  </label>
                ))}
              </CollapseSection>
            ) : null}

            <CollapseSection
              title="State attorney general"
              selectedCount={sectionCounts.state_ag}
              open={openSections.state_ag}
              onToggle={() => flipSection('state_ag')}
            >
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: '#6a8a9a', marginBottom: 10 }}>
                Your state AG has direct jurisdiction to investigate {shareData.brand_name} in{' '}
                {userStateCode ? stateName(userStateCode) : 'your state'}.
              </div>
              <label style={{ ...rowStyle, display: 'block', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#a8c4d8', display: 'block', marginBottom: 6 }}>
                  Your state
                </span>
                <select
                  value={userStateCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUserStateCode(v);
                    sessionStorage.setItem('ea_user_state', v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    fontSize: 14,
                  }}
                >
                  <option value="">Select state…</option>
                  {US_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </label>
              {shareData.state_ag ? (
                <label style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected.state_ag)}
                    onChange={() => toggle('state_ag')}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ marginRight: 6 }} aria-hidden>
                      📍
                    </span>
                    <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                      {shareData.state_ag.name} — consumer complaint
                    </span>
                  </div>
                </label>
              ) : (
                <p style={{ fontSize: 12, color: '#6a8a9a', margin: 0 }}>Select your state to load the AG portal.</p>
              )}
            </CollapseSection>

            <CollapseSection
              title="Institutional — ESG + pensions"
              selectedCount={sectionCounts.institutional}
              open={openSections.institutional}
              onToggle={() => flipSection('institutional')}
            >
              <div style={{ fontSize: 12, color: '#6a8a9a', marginBottom: 10 }}>
                Send to investors who control this company&apos;s capital.
              </div>
              {(shareData.esg_raters || []).map((e) => (
                <label key={e.id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[`esg_${e.id}`])}
                    onChange={() => toggle(`esg_${e.id}`)}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                      {e.name} {e.handle ? `· ${e.handle}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#6a8a9a' }}>{e.description}</div>
                  </div>
                </label>
              ))}
              {(shareData.pension_funds || []).map((p) => (
                <label key={p.id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[`pension_${p.id}`])}
                    onChange={() => toggle(`pension_${p.id}`)}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                      {p.name} {p.handle ? `· ${p.handle}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#6a8a9a' }}>{p.description}</div>
                  </div>
                </label>
              ))}
            </CollapseSection>

            {shareData.union ? (
              <CollapseSection
                title="Labor"
                selectedCount={sectionCounts.labor}
                open={openSections.labor}
                onToggle={() => flipSection('labor')}
              >
                <p style={{ fontSize: 12, color: '#6a8a9a', margin: '0 0 10px', lineHeight: 1.5 }}>
                  {shareData.union.name} ({shareData.union.handle}) represents workers in this sector. Send them the
                  documented public record.
                </p>
                <label style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected.union)}
                    onChange={() => toggle('union')}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                    Open union contact + copy summary
                  </span>
                </label>
              </CollapseSection>
            ) : null}

            {shareData.ir_contact?.url ? (
              <CollapseSection
                title="Investor relations"
                selectedCount={sectionCounts.ir}
                open={openSections.ir}
                onToggle={() => flipSection('ir')}
              >
                <p style={{ fontSize: 12, color: '#6a8a9a', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Send directly to {shareData.brand_name}&apos;s investor relations team. IR groups routinely review
                  material concerns raised with documentation.
                </p>
                <label style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected.ir)}
                    onChange={() => toggle('ir')}
                    style={{ width: 18, height: 18, accentColor: '#d4a017', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e0e0e0' }}>
                    Email + open IR portal
                  </span>
                </label>
              </CollapseSection>
            ) : null}
          </div>
        ) : null}

        {toast ? (
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: '#6aaa8a',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {toast}
          </p>
        ) : null}

        {showDestinationList && shareData && !loading ? (
          <div
            style={{
              marginTop: 20,
              paddingTop: 12,
              borderTop: '1px solid #2a3f52',
              fontSize: 11,
              color: '#5a6a7a',
              lineHeight: 1.5,
              fontFamily: "'Crimson Pro', serif",
            }}
          >
            {typeof shareData.legal_notice === 'string' ? shareData.legal_notice : WITNESS_LEGAL_NOTICE}
          </div>
        ) : null}
      </div>

      {showDestinationList && shareData && !loading ? (
        <div
          style={{
            flex: '0 0 auto',
            padding: '12px 18px calc(12px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(180deg, transparent 0%, #0f1520 18%)',
          }}
        >
          <button
            type="button"
            disabled={!anyChecked || sending}
            onClick={() => void handleSendAll()}
            style={{
              width: '100%',
              height: 52,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: !anyChecked || sending ? '#6a8a9a' : '#0a1f3d',
              background: !anyChecked || sending ? '#2a3f52' : '#d4a017',
              border: 'none',
              borderRadius: 4,
              cursor: !anyChecked || sending ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {sending ? 'Sending…' : `Send to ${selectedTotal} selected destination${selectedTotal === 1 ? '' : 's'} ›`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

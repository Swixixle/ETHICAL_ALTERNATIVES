import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { getImpactFetchHeaders } from '../lib/impactConsent.js';
import ShareSheet from './Civic/ShareSheet.jsx';
import { WITNESS_LEGAL_NOTICE, WITNESS_LEGAL_NOTICE_COMPACT } from '../constants/witnessLegalNotice.js';
import { methodologyPageUrl } from '../lib/methodologyUrl.js';

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

class ShareCardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ShareCard] render or child error', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const { onClose } = this.props;
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0f1520',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
          }}
          role="alert"
        >
          <p
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 17,
              color: '#a8c4d8',
              lineHeight: 1.5,
              maxWidth: 360,
              margin: '0 0 24px',
            }}
          >
            Something went wrong loading share options.
          </p>
          <button
            type="button"
            onClick={() => onClose?.()}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              background: '#f0a820',
              color: '#0f1520',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
function ShareCardContent({ investigation, identification, onClose }) {
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
  const [reportEmail, setReportEmail] = useState('');
  const [reportEmailBusy, setReportEmailBusy] = useState(false);
  const [reportEmailStatus, setReportEmailStatus] = useState(/** @type {string | null} */ (null));

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
    const next = {};
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

  const permalinkSlug = useMemo(() => {
    const a = investigation?.brand_slug;
    if (typeof a === 'string' && a.trim()) return a.trim().toLowerCase();
    const b = identification?.resolved_incumbent_slug;
    if (typeof b === 'string' && b.trim()) return b.trim().toLowerCase();
    return '';
  }, [investigation, identification]);

  const reportCompanyName =
    shareData && typeof shareData.brand_name === 'string' && shareData.brand_name.trim()
      ? shareData.brand_name.trim()
      : brandLabel;

  const sendReportToEmail = useCallback(async () => {
    const dest = reportEmail.trim();
    if (!permalinkSlug) {
      setReportEmailStatus('Report link is unavailable for this record.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
      setReportEmailStatus('Enter a valid email address.');
      return;
    }
    setReportEmailBusy(true);
    setReportEmailStatus(null);
    try {
      const res = await fetch(`${apiPrefix()}/api/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getImpactFetchHeaders() },
        body: JSON.stringify({
          slug: permalinkSlug,
          company_name: reportCompanyName,
          delivery: 'email',
          destination: dest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === 'sms_not_available') {
          setReportEmailStatus(data?.message || 'SMS is not available yet.');
        } else if (data?.error === 'report_not_found') {
          setReportEmailStatus('No saved report found for this company.');
        } else if (data?.error === 'email_not_configured') {
          setReportEmailStatus('Email delivery is not configured on the server.');
        } else {
          setReportEmailStatus(data?.message || 'Could not send. Try again.');
        }
        return;
      }
      setReportEmailStatus(`Report sent to ${dest}`);
      setReportEmail('');
    } catch {
      setReportEmailStatus('Network error. Try again.');
    } finally {
      setReportEmailBusy(false);
    }
  }, [permalinkSlug, reportCompanyName, reportEmail]);

  const openNativeShare = useCallback(async () => {
    if (!permalinkSlug) {
      setShareSheetOpen(true);
      return;
    }
    const url = `${window.location.origin}/report/${encodeURIComponent(permalinkSlug)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EthicalAlt: ${reportCompanyName}`,
          text: `Public records investigation into ${reportCompanyName}`,
          url,
        });
        return;
      } catch (e) {
        if (e && typeof e === 'object' && 'name' in e && e.name === 'AbortError') return;
      }
    }
    setShareSheetOpen(true);
  }, [permalinkSlug, reportCompanyName]);

  const selectedTotal = useMemo(() => {
    if (!shareData) return 0;
    let n = 0;
    const s = selected;
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
      return { press: 0, regulators: 0, state_ag: 0, institutional: 0, labor: 0, ir: 0 };
    }
    const s = selected;
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

    return { press, regulators, state_ag, institutional, labor, ir };
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

  const regRows =
    (shareData?.relevant_regulators || [])
      .filter((reg) => reg && typeof reg.agency === 'string')
      .map((reg) => ({
        id: `reg_${reg.agency}`,
        primary: checklistLabelForRegulator(reg),
      }));

  const pressOutlets = (shareData?.press_outlets || []).filter(
    (o) => o && (o.handle != null || o.name != null)
  );
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

  const showDestinationList = true;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f1520',
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
          borderBottom: '1px solid #2a3f52',
          background: '#0f1520',
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
            onClick={() => void openNativeShare()}
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
        {showDestinationList && (previewHeadline || cd) ? (
          <div
            style={{
              margin: '12px 0',
              padding: '16px 16px',
              background: '#0f1520',
              border: '1px solid #2a3f52',
              borderRadius: 2,
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 17,
                letterSpacing: 0.5,
                color: '#f0e8d0',
                lineHeight: 1.1,
              }}
            >
              {previewHeadline}
            </div>
            {cd?.top_tags ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 10,
                  justifyContent: 'center',
                }}
              >
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
            <div
              style={{
                marginBottom: 20,
                padding: '16px 14px',
                border: '1px solid #2a3f52',
                borderRadius: 4,
                background: 'rgba(15,21,32,0.6)',
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#f0a820',
                  marginBottom: 12,
                }}
              >
                Send this report
              </div>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 13,
                  color: '#a8c4d8',
                  marginBottom: 6,
                }}
              >
                Email
                <input
                  type="email"
                  name="report-email"
                  autoComplete="email"
                  value={reportEmail}
                  onChange={(e) => {
                    setReportEmail(e.target.value);
                    setReportEmailStatus(null);
                  }}
                  placeholder="you@example.com"
                  disabled={reportEmailBusy || !permalinkSlug}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: '1px solid #344d62',
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 15,
                    background: '#121a28',
                    color: '#f0e8d0',
                  }}
                />
              </label>
              <button
                type="button"
                disabled={reportEmailBusy || !permalinkSlug || !reportEmail.trim()}
                onClick={() => void sendReportToEmail()}
                style={{
                  marginTop: 12,
                  width: '100%',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '12px 16px',
                  borderRadius: 4,
                  border: 'none',
                  cursor:
                    reportEmailBusy || !permalinkSlug || !reportEmail.trim() ? 'not-allowed' : 'pointer',
                  background:
                    reportEmailBusy || !permalinkSlug || !reportEmail.trim() ? '#2a3f52' : '#f0a820',
                  color: reportEmailBusy || !permalinkSlug || !reportEmail.trim() ? '#6a8a9a' : '#0f1520',
                  fontWeight: 700,
                }}
              >
                {reportEmailBusy ? 'Sending…' : 'Send report'}
              </button>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 13,
                  color: '#5a6a78',
                  marginTop: 14,
                }}
              >
                SMS — coming soon
                <input
                  type="tel"
                  disabled
                  placeholder="+1 mobile number"
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 6,
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: '1px solid #283648',
                    opacity: 0.45,
                    cursor: 'not-allowed',
                    background: '#121a28',
                    color: '#6a8a9a',
                  }}
                />
              </label>
              {!permalinkSlug ? (
                <p
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 12,
                    color: '#d4a574',
                    margin: '10px 0 0',
                  }}
                >
                  Save this investigation to the Black Book to enable emailed report links.
                </p>
              ) : null}
              {reportEmailStatus ? (
                <p
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 14,
                    color: reportEmailStatus.startsWith('Report sent') ? '#6aaa8a' : '#d4a574',
                    margin: '12px 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  {reportEmailStatus}
                </p>
              ) : null}
            </div>

            {pressOutlets.length > 0 ? (
              <CollapseSection
                title="Press"
                selectedCount={sectionCounts.press}
                open={openSections.press}
                onToggle={() => flipSection('press')}
              >
                {pressOutlets.map((o) => {
                  const pid = pressRowId(o?.handle ?? '');
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
                    borderRadius: 6,
                    fontFamily: "'Space Mono', monospace",
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

/**
 * @param {{ investigation: Record<string, unknown> | null; identification: Record<string, unknown> | null; onClose: () => void }} props
 */
export default function ShareCard(props) {
  return (
    <ShareCardErrorBoundary onClose={props.onClose}>
      <ShareCardContent {...props} />
    </ShareCardErrorBoundary>
  );
}

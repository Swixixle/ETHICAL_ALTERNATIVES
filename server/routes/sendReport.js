import { Router } from 'express';
import { Resend } from 'resend';
import { getStoredInvestigationBySlug } from '../services/investigation.js';

const router = Router();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/send-report — email permalink via Resend; SMS returns 501 (not implemented). */
router.post('/', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const slug = String(body.slug || '')
    .trim()
    .toLowerCase();
  const company_name = String(body.company_name || '').trim() || slug;
  const delivery = String(body.delivery || 'email').toLowerCase();
  const destination = String(body.destination || '').trim();

  if (!slug) {
    return res.status(400).json({ error: 'slug_required' });
  }

  let profile;
  try {
    profile = await getStoredInvestigationBySlug(slug, { healthFlag: false });
  } catch (e) {
    console.error('[send-report] lookup', e?.message || e);
    return res.status(500).json({ error: 'lookup_failed' });
  }
  if (!profile) {
    return res.status(404).json({ error: 'report_not_found' });
  }

  if (delivery === 'sms') {
    return res.status(501).json({
      error: 'sms_not_available',
      message: 'SMS delivery is coming soon. Please use email instead.',
    });
  }

  if (delivery !== 'email') {
    return res.status(400).json({ error: 'invalid_delivery' });
  }

  if (!EMAIL_RE.test(destination)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const clientUrl = (
    process.env.CLIENT_URL || 'https://ethicalalt-client.onrender.com'
  ).replace(/\/$/, '');

  if (!apiKey || !from) {
    return res.status(503).json({
      error: 'email_not_configured',
      message: 'Report email is not configured on this server.',
    });
  }

  const reportUrl = `${clientUrl}/report/${encodeURIComponent(slug)}`;
  const safeCompany = escapeHtml(company_name);
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: destination,
      subject: `Your EthicalAlt report: ${company_name}`,
      html: `
    <div style="font-family: ui-monospace, monospace; background: #0f1520; color: #f0f0f0; padding: 32px;">
      <h1 style="color: #f0a820; margin-top: 0;">ETHICALALT</h1>
      <p>Your investigation report for <strong>${safeCompany}</strong> is ready.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(reportUrl)}"
           style="display: inline-block; background: #f0a820; color: #0f1520;
                  padding: 12px 24px; text-decoration: none; font-weight: bold;">
          VIEW FULL REPORT →
        </a>
      </p>
      <p style="color: #888; font-size: 12px; margin-top: 32px;">
        EthicalAlt documents public records. This is not legal advice.
        Sources are linked directly in the report.
      </p>
    </div>
  `,
    });
    if (error) {
      console.error('[send-report] Resend error', error);
      return res.status(500).json({ error: 'send_failed' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[send-report]', e?.message || e);
    res.status(500).json({ error: 'send_failed' });
  }
});

export default router;

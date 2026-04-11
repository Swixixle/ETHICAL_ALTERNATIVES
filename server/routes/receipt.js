/**
 * Investigation receipts: generate (signed), verify, PDF download.
 */

import express from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { pool } from '../db/pool.js';
import {
  buildReceiptPayloadFromProfileRow,
  getReceiptPublicKeyB64Url,
  receiptVerifyUrl,
  signReceiptBody,
  verifyReceiptSignature,
} from '../services/investigationReceipt.js';

const router = express.Router();

function requirePool(res) {
  if (!pool) {
    res.status(503).json({ ok: false, error: 'database_unavailable' });
    return null;
  }
  return pool;
}

function truncateSigDisplay(sig) {
  const s = String(sig || '');
  const m = s.match(/^ed25519:(.+)$/);
  const body = m ? m[1] : s;
  if (body.length <= 16) return s || '—';
  return `ed25519:${body.slice(0, 8)}…${body.slice(-8)}`;
}

/**
 * @param {Record<string, unknown>} receiptBody
 * @param {string | null | undefined} signatureStored
 */
async function streamReceiptPdf(res, receiptBody, signatureStored) {
  const id = typeof receiptBody.receipt_id === 'string' ? receiptBody.receipt_id : '';
  const verifyUrl = receiptVerifyUrl(id);
  const navy = '#0f1520';
  const amber = '#f0a820';
  const subject = receiptBody.subject && typeof receiptBody.subject === 'object' ? receiptBody.subject : {};
  const brandName = typeof subject.brand_name === 'string' ? subject.brand_name : '—';
  const concern =
    typeof receiptBody.overall_concern_level === 'string' && receiptBody.overall_concern_level.trim()
      ? receiptBody.overall_concern_level.trim()
      : '—';
  const investigated =
    typeof receiptBody.investigated_at === 'string' ? receiptBody.investigated_at : '';
  const generated = typeof receiptBody.generated_at === 'string' ? receiptBody.generated_at : '';
  const incidentCount =
    typeof receiptBody.incident_count === 'number' ? receiptBody.incident_count : 0;
  const sourceCount = typeof receiptBody.source_count === 'number' ? receiptBody.source_count : 0;
  const categorySummary = Array.isArray(receiptBody.category_summary) ? receiptBody.category_summary : [];
  const sourceUrls = Array.isArray(receiptBody.source_urls) ? receiptBody.source_urls : [];
  const disclaimer =
    typeof receiptBody.disclaimer === 'string'
      ? receiptBody.disclaimer
      : '';

  let qrPng = null;
  try {
    const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140, color: { dark: '#f0a820ff', light: '#0f1520ff' } });
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    qrPng = Buffer.from(b64, 'base64');
  } catch {
    qrPng = null;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ethicalalt-receipt-${id.slice(0, 8)}.pdf"`);

  const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 72).fill(navy);
  doc.fillColor(amber).fontSize(11).text('ETHICALALT', 48, 28, { continued: false });
  doc.fontSize(9).fillColor('#c4b896').text('Investigation receipt', 48, 48);

  doc.fillColor(amber).fontSize(20).text('INVESTIGATION RECEIPT', 48, 92);
  doc.moveTo(48, 118).lineTo(doc.page.width - 48, 118).strokeColor(amber).lineWidth(0.5).stroke();

  doc.fillColor('#a8c4d8').fontSize(10);
  let y = 128;
  doc.text(`Subject: ${brandName}`, 48, y);
  y += 16;
  doc.text(`Concern level (profile): ${concern}`, 48, y);
  y += 16;
  doc.text(`Investigated (deep research): ${investigated}`, 48, y);
  y += 16;
  doc.text(`Receipt generated: ${generated}`, 48, y);
  y += 20;
  doc.fillColor(amber).text(`Documented incidents: ${incidentCount}`, 48, y);
  y += 14;
  doc.text(`Verified source URLs: ${sourceCount}`, 48, y);
  y += 22;

  doc.fillColor(amber).fontSize(11).text('Category breakdown', 48, y);
  y += 16;
  doc.fillColor('#a8c4d8').fontSize(9);
  for (const row of categorySummary) {
    if (!row || typeof row !== 'object') continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    const cat = typeof r.category === 'string' ? r.category : '';
    const cnt = typeof r.count === 'number' ? r.count : 0;
    const ov = typeof r.overflow === 'number' ? r.overflow : 0;
    doc.text(`• ${cat}: ${cnt} documented${ov ? ` (+${ov} overflow)` : ''}`, 48, y, { width: doc.page.width - 96 });
    y += 12;
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 48;
    }
  }

  y += 10;
  if (y > doc.page.height - 180) {
    doc.addPage();
    y = 48;
  }
  doc.fillColor(amber).fontSize(11).text('Disclaimer', 48, y);
  y += 14;
  doc.fillColor('#8a9aac').fontSize(8).text(disclaimer, 48, y, { width: doc.page.width - 96, align: 'left' });
  y = doc.y + 20;

  if (y > doc.page.height - 160) {
    doc.addPage();
    y = 48;
  }
  doc.fillColor(amber).fontSize(11).text('Signature', 48, y);
  y += 14;
  doc.fillColor('#a8c4d8').fontSize(9).text(truncateSigDisplay(signatureStored), 48, y);
  y += 14;
  doc.text(`Receipt ID: ${id}`, 48, y);
  y += 14;
  doc.text(`Verify: ${verifyUrl}`, 48, y, { width: doc.page.width - 96, link: verifyUrl });
  y += 36;
  if (qrPng) {
    try {
      doc.image(qrPng, 48, y, { width: 100 });
      y += 110;
    } catch {
      /* ignore */
    }
  }

  if (sourceUrls.length) {
    y += 8;
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 48;
    }
    doc.fillColor(amber).fontSize(11).text('Sources (URLs)', 48, y);
    y += 14;
    doc.fillColor('#6a8a9a').fontSize(7);
    for (const u of sourceUrls) {
      const url = String(u);
      doc.text(url, 48, y, { width: doc.page.width - 96, link: url, underline: true });
      y = doc.y + 2;
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 48;
      }
    }
  }

  doc.fillColor('#5a6a7a').fontSize(8).text(
    `Verify this receipt at ethicalalt-client.onrender.com/verify/${id}`,
    48,
    doc.page.height - 56,
    { width: doc.page.width - 96, align: 'center' }
  );

  doc.end();
}

router.post('/generate', async (req, res) => {
  const p = requirePool(res);
  if (!p) return;

  const slug =
    req.body && typeof req.body.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
  if (!slug) {
    return res.status(400).json({ ok: false, error: 'missing_slug' });
  }

  const investigation_id =
    req.body && typeof req.body.investigation_id === 'string' ? req.body.investigation_id.trim() : null;
  const data_source =
    req.body && typeof req.body.data_source === 'string' ? req.body.data_source.trim() : null;

  const pub = getReceiptPublicKeyB64Url();
  if (!pub) {
    return res.status(503).json({ ok: false, error: 'signing_key_unconfigured' });
  }

  try {
    const { rows } = await p.query(
      `SELECT brand_name, brand_slug, parent_company, ultimate_parent, profile_json, overall_concern_level
       FROM incumbent_profiles WHERE brand_slug = $1 LIMIT 1`,
      [slug]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'profile_not_found' });
    }
    const row = rows[0];
    let profileJson = row.profile_json;
    if (typeof profileJson === 'string') {
      try {
        profileJson = JSON.parse(profileJson);
      } catch {
        profileJson = null;
      }
    }

    const built = buildReceiptPayloadFromProfileRow(profileJson, {
      slug: row.brand_slug || slug,
      brand_name: row.brand_name,
      ultimate_parent: row.ultimate_parent,
      parent_company: row.parent_company,
      overall_concern_level: row.overall_concern_level,
      data_source: data_source || undefined,
      investigation_id: investigation_id || undefined,
    });

    if (!built.ok) {
      return res.status(400).json({ ok: false, error: built.error || 'build_failed' });
    }

    const receiptBody = /** @type {Record<string, unknown>} */ (built.receiptBody);
    const incidentsHash = /** @type {string} */ (receiptBody.incidents_hash);

    const dup = await p.query(
      `SELECT id, receipt_json, signature, created_at FROM investigation_receipts
       WHERE slug = $1 AND receipt_json->>'incidents_hash' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [slug, incidentsHash]
    );

    let receipt_id = /** @type {string} */ (receiptBody.receipt_id);
    let signature;

    if (dup.rows.length) {
      const existing = dup.rows[0];
      receipt_id = String(existing.id);
      signature = existing.signature;
      let cachedReceipt = existing.receipt_json;
      if (typeof cachedReceipt === 'string') {
        try {
          cachedReceipt = JSON.parse(cachedReceipt);
        } catch {
          cachedReceipt = null;
        }
      }
      if (!cachedReceipt || typeof cachedReceipt !== 'object') {
        return res.status(500).json({ ok: false, error: 'invalid_cached_receipt' });
      }
      const verify_url = receiptVerifyUrl(receipt_id);
      return res.json({
        receipt_id,
        signed_receipt: cachedReceipt,
        signature,
        public_key: pub,
        verify_url,
        cached: true,
      });
    }

    signature = signReceiptBody(receiptBody);
    if (!signature) {
      return res.status(503).json({ ok: false, error: 'sign_failed' });
    }

    await p.query(
      `INSERT INTO investigation_receipts (id, slug, receipt_json, signature)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [receiptBody.receipt_id, slug, JSON.stringify(receiptBody), signature]
    );

    const verify_url = receiptVerifyUrl(receipt_id);
    res.json({
      receipt_id,
      signed_receipt: receiptBody,
      signature,
      public_key: pub,
      verify_url,
      cached: false,
    });
  } catch (e) {
    console.error('[receipt] generate', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

router.get('/verify/:receipt_id', async (req, res) => {
  const p = requirePool(res);
  if (!p) return;

  const receipt_id = typeof req.params.receipt_id === 'string' ? req.params.receipt_id.trim() : '';
  if (!receipt_id) {
    return res.status(400).json({ ok: false, error: 'missing_receipt_id' });
  }

  try {
    let rows;
    try {
      const q = await p.query(
        `SELECT receipt_json, signature FROM investigation_receipts WHERE id = $1::uuid LIMIT 1`,
        [receipt_id]
      );
      rows = q.rows;
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
      if (/invalid input syntax for type uuid/i.test(msg)) {
        return res.status(400).json({ valid: false, signature_verified: false, error: 'invalid_receipt_id' });
      }
      throw err;
    }
    if (!rows.length) {
      return res.status(404).json({
        valid: false,
        signature_verified: false,
        error: 'not_found',
      });
    }

    let receipt = rows[0].receipt_json;
    if (typeof receipt === 'string') {
      try {
        receipt = JSON.parse(receipt);
      } catch {
        receipt = null;
      }
    }
    if (!receipt || typeof receipt !== 'object') {
      return res.status(500).json({ valid: false, signature_verified: false, error: 'invalid_stored_json' });
    }

    const receiptObj = /** @type {Record<string, unknown>} */ (receipt);
    const sig = rows[0].signature;
    const signature_verified = verifyReceiptSignature(receiptObj, sig);
    const verified_at = new Date().toISOString();

    res.json({
      valid: signature_verified,
      receipt: receiptObj,
      signature: sig,
      signature_verified,
      verified_at,
    });
  } catch (e) {
    console.error('[receipt] verify', e);
    res.status(500).json({ valid: false, signature_verified: false, error: 'server_error' });
  }
});

router.get('/:receipt_id/pdf', async (req, res) => {
  const p = requirePool(res);
  if (!p) return;

  const receipt_id = typeof req.params.receipt_id === 'string' ? req.params.receipt_id.trim() : '';
  if (!receipt_id) {
    return res.status(400).send('missing receipt id');
  }

  try {
    let rows;
    try {
      const q = await p.query(
        `SELECT receipt_json, signature FROM investigation_receipts WHERE id = $1::uuid LIMIT 1`,
        [receipt_id]
      );
      rows = q.rows;
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : '';
      if (/invalid input syntax for type uuid/i.test(msg)) {
        return res.status(400).send('invalid receipt id');
      }
      throw err;
    }
    if (!rows.length) {
      return res.status(404).send('not found');
    }
    let receipt = rows[0].receipt_json;
    if (typeof receipt === 'string') {
      try {
        receipt = JSON.parse(receipt);
      } catch {
        receipt = null;
      }
    }
    if (!receipt || typeof receipt !== 'object') {
      return res.status(500).send('invalid receipt');
    }
    await streamReceiptPdf(
      res,
      /** @type {Record<string, unknown>} */ (receipt),
      rows[0].signature
    );
  } catch (e) {
    console.error('[receipt] pdf', e);
    if (!res.headersSent) res.status(500).send('error');
  }
});

export default router;

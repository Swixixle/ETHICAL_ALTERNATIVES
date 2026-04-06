// /proportionality endpoint and investigation packets must stay model-free and deterministic.

import { SENTENCING_REFERENCE } from '../data/sentencing_reference.js';
import { STATUTE_MAP } from '../data/statute_map.js';
import bopFacilities from '../data/bop_facilities.json' with { type: 'json' };

export const PROPORTIONALITY_CATEGORIES = [
  'tax',
  'legal',
  'environmental',
  'labor',
  'political',
  'product_health',
];

/** @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2 */
export function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {{ lat?: number | null; lng?: number | null }} opts
 * @returns {null | Record<string, unknown>}
 */
export function getNearestFederalFacility({ lat, lng }) {
  if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }
  const la = Number(lat);
  const ln = Number(lng);
  let best = null;
  let bestDist = Infinity;
  for (const row of bopFacilities) {
    if (
      !row ||
      typeof row.latitude !== 'number' ||
      typeof row.longitude !== 'number' ||
      Number.isNaN(row.latitude) ||
      Number.isNaN(row.longitude)
    ) {
      continue;
    }
    const d = haversineMiles(la, ln, row.latitude, row.longitude);
    if (d < bestDist) {
      bestDist = d;
      best = row;
    }
  }
  if (!best) return null;
  const rounded = Math.round(bestDist * 10) / 10;
  const out = {
    facility_code: best.facility_code,
    facility_name: best.facility_name,
    latitude: best.latitude,
    longitude: best.longitude,
    security_level: best.security_level,
    source_url: best.source_url,
    last_updated: best.last_updated,
    distance_miles: rounded,
  };
  if (typeof best.population_total === 'number' && Number.isFinite(best.population_total)) {
    out.population_total = best.population_total;
  }
  return out;
}

/**
 * @param {{
 *   category: string;
 *   violationType: string;
 *   chargeStatus?: string | null;
 *   amountInvolved?: number | null;
 *   lat?: number | null;
 *   lng?: number | null;
 * }} args
 */
export function buildProportionalityPacket({
  category,
  violationType,
  chargeStatus = null,
  amountInvolved = null,
  lat = null,
  lng = null,
}) {
  const cat = String(category || '').toLowerCase();
  const ref = SENTENCING_REFERENCE[cat];
  if (!ref) return null;

  const vt = String(violationType || '').toLowerCase();
  const applicable = [];
  for (const entry of STATUTE_MAP) {
    if (String(entry.category) !== cat) continue;
    const hit = entry.keywords.some((kw) => vt.includes(String(kw).toLowerCase()));
    if (hit) applicable.push(entry);
    if (applicable.length >= 2) break;
  }

  const amountNum =
    amountInvolved != null && Number.isFinite(Number(amountInvolved)) ? Number(amountInvolved) : null;
  let amount_comparison = null;
  if (amountNum != null && ref.median_amount_involved != null && Number.isFinite(ref.median_amount_involved)) {
    const med = ref.median_amount_involved;
    amount_comparison = {
      amount_involved: amountNum,
      median_amount_involved: med,
      multiple_of_median: amountsAndMedianMultiple(amountNum, med),
    };
  }

  const facility_context =
    lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? getNearestFederalFacility({ lat: Number(lat), lng: Number(lng) })
      : null;

  return {
    category: cat,
    violation_type: String(violationType || ''),
    charge_status: chargeStatus != null && String(chargeStatus).trim() ? String(chargeStatus).trim() : null,
    applicable_statutes: applicable,
    sentencing_context: {
      comparison_offense: ref.comparison_offense,
      median_sentence_months: ref.median_sentence_months,
      median_amount_involved: ref.median_amount_involved,
      total_sentenced_2023: ref.total_sentenced_2023,
      source: ref.source,
      source_url: ref.source_url,
    },
    amount_comparison,
    facility_context,
  };
}

function amountsAndMedianMultiple(amountInvolved, medianAmount) {
  if (!amountInvolved || !medianAmount) return null;
  return Math.round((amountInvolved / medianAmount) * 10) / 10;
}

/**
 * @param {Record<string, unknown>} inv — normalized investigation object (mutated)
 * @param {Record<string, unknown> | null | undefined} parsed — raw model / DB payload
 * @param {boolean} healthFlag
 */
export function attachProportionalityToInvestigation(inv, parsed, healthFlag) {
  const latRaw = parsed?.latitude ?? parsed?.lat;
  const lngRaw = parsed?.longitude ?? parsed?.lng;
  let investigation_coordinates = null;
  if (latRaw != null && lngRaw != null) {
    const la = Number(latRaw);
    const ln = Number(lngRaw);
    if (Number.isFinite(la) && Number.isFinite(ln)) investigation_coordinates = { lat: la, lng: ln };
  }
  inv.investigation_coordinates = investigation_coordinates;

  for (const cat of PROPORTIONALITY_CATEGORIES) {
    if (!healthFlag && cat === 'product_health') {
      inv[`${cat}_proportionality_packet`] = null;
      inv[`${cat}_applicable_statutes`] = [];
      inv[`${cat}_proportionality`] = null;
      inv[`${cat}_violation_type`] = null;
      inv[`${cat}_charge_status`] = null;
      inv[`${cat}_amount_involved`] = null;
      continue;
    }

    const vtRaw = parsed?.[`${cat}_violation_type`];
    const vt = typeof vtRaw === 'string' && vtRaw.trim() ? vtRaw.trim() : null;
    const chargeRaw = parsed?.[`${cat}_charge_status`];
    const charge = chargeRaw != null && String(chargeRaw).trim() ? String(chargeRaw).trim() : null;
    const amtRaw = parsed?.[`${cat}_amount_involved`];
    const amtNum =
      amtRaw != null && Number.isFinite(Number(amtRaw)) ? Number(amtRaw) : null;

    inv[`${cat}_violation_type`] = vt;
    inv[`${cat}_charge_status`] = charge;
    inv[`${cat}_amount_involved`] = amtNum;

    if (!vt) {
      inv[`${cat}_proportionality_packet`] = null;
      inv[`${cat}_applicable_statutes`] = [];
      inv[`${cat}_proportionality`] = null;
      continue;
    }

    const pkt = buildProportionalityPacket({
      category: cat,
      violationType: vt,
      chargeStatus: charge,
      amountInvolved: amtNum,
      lat: investigation_coordinates?.lat ?? null,
      lng: investigation_coordinates?.lng ?? null,
    });
    inv[`${cat}_proportionality_packet`] = pkt;
    inv[`${cat}_applicable_statutes`] = pkt?.applicable_statutes ?? [];
    inv[`${cat}_proportionality`] = pkt?.sentencing_context
      ? {
          comparison_offense: pkt.sentencing_context.comparison_offense,
          median_sentence_months: pkt.sentencing_context.median_sentence_months,
          median_amount_involved: pkt.sentencing_context.median_amount_involved,
          total_sentenced_2023: pkt.sentencing_context.total_sentenced_2023,
          source: pkt.sentencing_context.source,
          source_url: pkt.sentencing_context.source_url,
        }
      : null;
  }
}

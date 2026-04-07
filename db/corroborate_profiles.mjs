#!/usr/bin/env node
/**
 * db/corroborate_profiles.mjs
 *
 * Re-investigates every profile in incumbent_profiles using live web search
 * and compares against stored profile_json. Outputs a structured diff report.
 *
 * Usage:
 *   node db/corroborate_profiles.mjs --tier1
 *   node db/corroborate_profiles.mjs --slug purdue-pharma
 *   node db/corroborate_profiles.mjs --type corporations --batch-size 5
 *   node db/corroborate_profiles.mjs --all --resume --output report.json
 *   node db/corroborate_profiles.mjs --dry-run --all
 */

import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parseArgs } from 'node:util';

const { Pool } = pg;

// ─── Constants ────────────────────────────────────────────────────────────────

const HARD_TIMEOUT_MS = 120_000;
const INPUT_COST_PER_M = 3.0;   // Sonnet 4 class
const OUTPUT_COST_PER_M = 15.0;

const TIER1_SLUGS = [
  'purdue-pharma',
  'volkswagen-group',
  'goldman-sachs',
  'nra',
  'boy-scouts-of-america',
  'roman-catholic-church',
  'southern-baptist-convention',
  'lds-church',
  'jehovahs-witnesses',
  'church-of-scientology',
  'flds-church',
  'yeshiva-university',
  'lev-tahor',
  'clinton-foundation',
  'gates-foundation',
];

// ─── CLI ──────────────────────────────────────────────────────────────────────

const { values: opts } = parseArgs({
  options: {
    slug:          { type: 'string' },
    type:          { type: 'string' },
    all:           { type: 'boolean' },
    tier1:         { type: 'boolean' },
    'dry-run':     { type: 'boolean' },
    'batch-size':  { type: 'string', default: '5' },
    'batch-delay': { type: 'string', default: '30000' },
    output:        { type: 'string', default: 'corroboration_report.json' },
    upsert:        { type: 'boolean' },
    resume:        { type: 'boolean' },
  },
  strict: true,
});

const BATCH_SIZE  = Math.max(1, parseInt(opts['batch-size'],  10) || 5);
const BATCH_DELAY = Math.max(0, parseInt(opts['batch-delay'], 10) || 30_000);
const OUTPUT_FILE = opts.output;
const DRY_RUN     = Boolean(opts['dry-run']);
const UPSERT      = Boolean(opts.upsert);
const RESUME      = Boolean(opts.resume);

// ─── Utilities ────────────────────────────────────────────────────────────────

function estimateCost(input, output) {
  return Number(((input / 1_000_000) * INPUT_COST_PER_M + (output / 1_000_000) * OUTPUT_COST_PER_M).toFixed(4));
}

function extractDollarAmounts(text) {
  const raw = text || '';
  const matches = [...raw.matchAll(/\$([\d,]+(?:\.\d+)?)\s*(million|billion|thousand|M|B|K)?/gi)];
  const amounts = matches.map(m => {
    let n = parseFloat(m[1].replace(/,/g, ''));
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'billion' || unit === 'b') n *= 1_000_000_000;
    else if (unit === 'million' || unit === 'm') n *= 1_000_000;
    else if (unit === 'thousand' || unit === 'k') n *= 1_000;
    return n;
  });
  return amounts;
}

function extractYears(text) {
  const raw = text || '';
  return [...raw.matchAll(/\b(19|20)\d{2}\b/g)].map(m => parseInt(m[0], 10));
}

function extractNames(text) {
  const raw = text || '';
  // Capture capitalized multi-word names (Title Case sequences of 2-4 words)
  return [...raw.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g)].map(m => m[1]);
}

function profileText(pj) {
  if (!pj) return '';
  const parts = [
    pj.executive_summary,
    pj.legal?.summary,
    pj.labor?.summary,
    pj.environmental?.summary,
    pj.political?.summary,
    pj.tax?.summary,
    pj.product_health?.summary,
    pj.allegations?.summary,
    (pj.verdict_tags || []).join(' '),
    (pj.timeline || []).map(t => `${t.year} ${t.event}`).join(' '),
    pj.executives?.summary,
  ];
  return parts.filter(Boolean).join(' ');
}

function writeReport(report) {
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf8');
}

// ─── Research prompt (mirrors server/services/investigation.js) ───────────────

function buildCorroborationPrompt(brandName, corporateParent) {
  const primary = [brandName, corporateParent].filter(Boolean).join(' / ');
  return `You are a neutral research assistant. Use web search aggressively.

Research the documented public record for: ${primary}

Search specifically for:
- Legal settlements, criminal convictions, regulatory enforcement actions (exact amounts, years, outcomes)
- Named executives and board members — their roles, what they did, conviction status, current position
- Key events in the organization's history with specific dates
- Overall assessment of documented concern level: significant | moderate | low

Return ONLY valid JSON with this exact shape:
{
  "executive_summary": "string — 2-4 sentences, most important documented facts with specific figures",
  "overall_concern_level": "significant | moderate | low",
  "legal_summary": "string — specific settlements, convictions, regulatory actions with dollar amounts and years",
  "labor_summary": "string — documented labor violations, wage theft, union issues",
  "environmental_summary": "string — EPA actions, spills, documented environmental harm",
  "political_summary": "string — lobbying spend, PAC donations, documented political activity",
  "tax_summary": "string — effective rate, offshore structures, documented tax issues",
  "product_health_summary": "string — documented product harms, recalls, safety issues",
  "allegations_response": "string — what the organization has officially said in response to documented allegations",
  "verdict_tags": ["array", "of", "factual", "shorthand", "tags"],
  "timeline": [
    { "year": 2020, "event": "specific documented event", "severity": "critical | high | moderate | low" }
  ],
  "named_executives": [
    { "name": "Full Name", "role": "their role", "status": "convicted | acquitted | resigned | current | deceased", "key_fact": "one sentence" }
  ],
  "post_2025_events": ["any events found dated after August 2025 — these are net new findings"]
}

Be specific. Include dollar amounts. Include years. Do not invent. If something is uncertain, say so in the summary.`;
}

// ─── Multi-turn Anthropic loop (mirrors runInvestigationAnthropicTurn) ────────

async function runLiveInvestigation(anthropic, brandName, corporateParent) {
  const userPrompt = buildCorroborationPrompt(brandName, corporateParent);
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];
  const model = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-sonnet-4-20250514';

  let messages = [{ role: 'user', content: userPrompt }];
  let inputTokens = 0;
  let outputTokens = 0;
  let lastResponse = null;
  const maxSteps = 24;

  for (let step = 0; step < maxSteps; step++) {
    lastResponse = await anthropic.messages.create({ model, max_tokens: 6000, tools, messages });

    inputTokens  += lastResponse.usage?.input_tokens  || 0;
    outputTokens += lastResponse.usage?.output_tokens || 0;

    process.stdout.write(`  step ${step + 1} stop=${lastResponse.stop_reason} `);

    const sr = lastResponse.stop_reason;

    if (sr === 'end_turn' || sr === 'max_tokens') {
      console.log('✓');
      break;
    }

    if (sr === 'pause_turn') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      continue;
    }

    if (sr === 'tool_use') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      const toolResults = [];
      for (const block of lastResponse.content || []) {
        if (block.type === 'tool_use') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Search executed — use results from prior context to continue.',
          });
        }
      }
      if (toolResults.length) {
        messages.push({ role: 'user', content: toolResults });
      }
      continue;
    }

    break;
  }

  // Extract JSON from last response
  const text = (lastResponse?.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in live investigation response');

  const parsed = JSON.parse(jsonMatch[0]);
  return { parsed, inputTokens, outputTokens };
}

// ─── Comparison engine ────────────────────────────────────────────────────────

function compareProfiles(slug, storedPj, live) {
  const discrepancies = [];
  const storedText = profileText(storedPj);
  const liveText   = profileText(live);

  // 1. Concern level
  const storedLevel = (storedPj?.overall_concern_level || '').toLowerCase().trim();
  const liveLevel   = (live.overall_concern_level || '').toLowerCase().trim();
  if (storedLevel && liveLevel && storedLevel !== liveLevel) {
    discrepancies.push({
      field: 'overall_concern_level',
      severity: 'HIGH',
      stored: storedLevel,
      live: liveLevel,
      note: 'Concern level assessment differs between stored profile and live investigation.',
    });
  }

  // 2. Dollar amounts — compare max amounts found (largest settlement/fine)
  const storedAmounts = extractDollarAmounts(storedText).sort((a,b) => b - a);
  const liveAmounts   = extractDollarAmounts(liveText).sort((a,b) => b - a);

  if (storedAmounts.length > 0 && liveAmounts.length > 0) {
    const storedMax = storedAmounts[0];
    const liveMax   = liveAmounts[0];
    const diff = Math.abs(storedMax - liveMax) / Math.max(storedMax, 1);
    if (diff > 0.20) {
      discrepancies.push({
        field: 'dollar_amounts',
        severity: diff > 0.50 ? 'CRITICAL' : 'HIGH',
        stored: `$${storedMax.toLocaleString()} (largest found)`,
        live:   `$${liveMax.toLocaleString()} (largest found)`,
        note: `Largest financial figure differs by ${Math.round(diff * 100)}%.`,
      });
    }
  }

  // 3. Named executives — check conviction status
  const liveExecs = live.named_executives || [];
  for (const exec of liveExecs) {
    const name = exec.name || '';
    if (!name) continue;
    // If stored profile mentions this name, check if status matches
    if (storedText.toLowerCase().includes(name.toLowerCase())) {
      const storedMentions = storedText.toLowerCase();
      const liveStatus = (exec.status || '').toLowerCase();
      // Check for conviction/acquittal discrepancy
      if (liveStatus === 'acquitted' && storedMentions.includes('convicted')) {
        discrepancies.push({
          field: `executive.${name}`,
          severity: 'CRITICAL',
          stored: 'described as convicted',
          live: `status: acquitted (${exec.key_fact || ''})`,
          note: `${name} — stored profile says convicted but live investigation says acquitted. Verify immediately.`,
        });
      }
      if (liveStatus === 'convicted' && !storedMentions.includes('convicted') && !storedMentions.includes('guilty')) {
        discrepancies.push({
          field: `executive.${name}`,
          severity: 'HIGH',
          stored: 'not described as convicted',
          live: `status: convicted (${exec.key_fact || ''})`,
          note: `${name} — live investigation found conviction not in stored profile.`,
        });
      }
    }
  }

  // 4. Key year differences — check if major event years shifted
  const storedYears = extractYears(storedText);
  const liveYears   = extractYears(liveText);
  if (storedYears.length > 0 && liveYears.length > 0) {
    const storedMin = Math.min(...storedYears);
    const liveMin   = Math.min(...liveYears);
    if (Math.abs(storedMin - liveMin) > 3) {
      discrepancies.push({
        field: 'timeline_years',
        severity: 'MEDIUM',
        stored: `earliest event: ${storedMin}`,
        live:   `earliest event: ${liveMin}`,
        note: 'Timeline start years differ significantly — check founding dates and key event years.',
      });
    }
  }

  // 5. Allegation response — check if Type 3 default but live found a response
  const storedAllegations = (storedPj?.allegations?.summary || '').toLowerCase();
  const liveAllegationsResponse = (live.allegations_response || '').toLowerCase();
  const hasType3Default = storedAllegations.includes('no formal public response');
  const liveHasResponse = liveAllegationsResponse.length > 20 &&
    !liveAllegationsResponse.includes('no formal public response') &&
    !liveAllegationsResponse.includes('no documented response');

  if (hasType3Default && liveHasResponse) {
    discrepancies.push({
      field: 'allegations.response',
      severity: 'MEDIUM',
      stored: 'Type 3 default (no documented response)',
      live: live.allegations_response?.slice(0, 200),
      note: 'Stored profile has Type 3 default but live investigation found a documented response.',
    });
  }

  // 6. Post-2025 net new events
  const postCutoff = (live.post_2025_events || []).filter(e => typeof e === 'string' && e.trim().length > 10);

  return { discrepancies, netNew: postCutoff };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== EthicalAlt Corroboration Script ===\n');

  // Validate env
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error('ERROR: ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Validate DB connection
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as n FROM incumbent_profiles');
    console.log(`DB connected. Total profiles: ${rows[0].n}`);
  } catch (err) {
    console.error('ERROR: Could not connect to DB:', err.message);
    process.exit(1);
  }

  // Build profile list
  let profileRows;
  if (opts.slug) {
    const { rows } = await pool.query(
      'SELECT brand_slug, brand_name, profile_type, overall_concern_level, profile_json FROM incumbent_profiles WHERE brand_slug = $1',
      [opts.slug]
    );
    profileRows = rows;
  } else if (opts.tier1) {
    const { rows } = await pool.query(
      'SELECT brand_slug, brand_name, profile_type, overall_concern_level, profile_json FROM incumbent_profiles WHERE brand_slug = ANY($1) ORDER BY brand_name ASC',
      [TIER1_SLUGS]
    );
    profileRows = rows;
  } else if (opts.type) {
    const { rows } = await pool.query(
      'SELECT brand_slug, brand_name, profile_type, overall_concern_level, profile_json FROM incumbent_profiles WHERE profile_type = $1 ORDER BY brand_name ASC',
      [opts.type]
    );
    profileRows = rows;
  } else if (opts.all) {
    const { rows } = await pool.query(
      'SELECT brand_slug, brand_name, profile_type, overall_concern_level, profile_json FROM incumbent_profiles ORDER BY profile_type, brand_name ASC'
    );
    profileRows = rows;
  } else {
    console.error('ERROR: Specify --all, --tier1, --slug <slug>, or --type <type>');
    process.exit(1);
  }

  console.log(`Profiles selected: ${profileRows.length}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — profiles that would be checked:');
    profileRows.forEach(r => console.log(`  ${r.brand_slug} (${r.profile_type})`));
    console.log(`\nEstimated cost: ~$${(profileRows.length * 0.15).toFixed(2)}`);
    console.log(`Estimated time: ~${Math.ceil(profileRows.length * 1.5)} minutes`);
    await pool.end();
    return;
  }

  // Load existing report for resume
  let report = {
    generated_at: new Date().toISOString(),
    total_profiles: profileRows.length,
    profiles_checked: 0,
    discrepancies_found: 0,
    confirmed: 0,
    errors: 0,
    estimated_cost_usd: 0,
    results: [],
  };

  if (RESUME && existsSync(OUTPUT_FILE)) {
    try {
      report = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
      console.log(`Resuming — already processed: ${report.results.length} profiles`);
    } catch {
      console.warn('Could not parse existing report — starting fresh');
    }
  }

  const processedSlugs = new Set(report.results.map(r => r.slug));

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let totalInputTokens  = 0;
  let totalOutputTokens = 0;
  let totalCost = report.estimated_cost_usd || 0;
  let checked = 0;
  let discrepancyCount = 0;
  let confirmedCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < profileRows.length; i += BATCH_SIZE) {
    const batch = profileRows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      if (processedSlugs.has(row.brand_slug)) {
        process.stdout.write(`  skipping ${row.brand_slug} (already done)\n`);
        continue;
      }

      checked++;
      const startMs = Date.now();
      console.log(`\n[${checked}/${profileRows.length}] ${row.brand_name} (${row.brand_slug})`);

      let entryResult;

      try {
        // Hard timeout wrapper
        const liveResult = await Promise.race([
          runLiveInvestigation(anthropic, row.brand_name, row.profile_json?.corporate_parent || null),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Hard timeout 120s exceeded')), HARD_TIMEOUT_MS)
          ),
        ]);

        const { parsed: live, inputTokens, outputTokens } = liveResult;

        totalInputTokens  += inputTokens;
        totalOutputTokens += outputTokens;
        const cost = estimateCost(inputTokens, outputTokens);
        totalCost = Number((totalCost + cost).toFixed(4));

        console.log(`  tokens: input=${inputTokens} output=${outputTokens} cost=$${cost}`);
        console.log(`  running total: $${totalCost} across ${checked} profiles`);

        const { discrepancies, netNew } = compareProfiles(row.brand_slug, row.profile_json, live);

        const status = discrepancies.length > 0 ? 'DISCREPANCY' : 'CONFIRMED';
        if (status === 'DISCREPANCY') discrepancyCount++;
        else confirmedCount++;

        console.log(`  status: ${status} | discrepancies: ${discrepancies.length} | net-new: ${netNew.length}`);
        discrepancies.forEach(d => console.log(`    [${d.severity}] ${d.field}: ${d.note}`));

        entryResult = {
          slug: row.brand_slug,
          brand_name: row.brand_name,
          profile_type: row.profile_type,
          status,
          discrepancies,
          net_new_findings: netNew,
          stored_concern_level: row.overall_concern_level,
          live_concern_level: live.overall_concern_level || null,
          live_investigation_snippet: (live.executive_summary || '').slice(0, 500),
          tokens_used: { input: inputTokens, output: outputTokens },
          estimated_cost_usd: cost,
          duration_ms: Date.now() - startMs,
          timestamp: new Date().toISOString(),
        };

        // Upsert if flagged
        if (UPSERT && status === 'DISCREPANCY' && !live.is_stub_investigation) {
          const hasCriticalOrHigh = discrepancies.some(d =>
            d.severity === 'CRITICAL' || d.severity === 'HIGH'
          );
          if (hasCriticalOrHigh) {
            await pool.query(
              'UPDATE incumbent_profiles SET profile_json = profile_json || $1::jsonb, updated_at = NOW() WHERE brand_slug = $2',
              [JSON.stringify({
                overall_concern_level: live.overall_concern_level || row.overall_concern_level,
                _corroborated_at: new Date().toISOString(),
                _corroboration_notes: discrepancies.map(d => d.note).join('; '),
              }), row.brand_slug]
            );
            entryResult.upserted = true;
            console.log(`  ✓ upserted corrections to DB`);
          }
        }

      } catch (err) {
        errorCount++;
        console.error(`  ERROR: ${err.message}`);
        entryResult = {
          slug: row.brand_slug,
          brand_name: row.brand_name,
          profile_type: row.profile_type,
          status: 'ERROR',
          error: err.message,
          estimated_cost_usd: 0,
          duration_ms: Date.now() - startMs,
          timestamp: new Date().toISOString(),
        };
      }

      // Write after every profile
      report.results.push(entryResult);
      report.profiles_checked = checked;
      report.discrepancies_found = discrepancyCount;
      report.confirmed = confirmedCount;
      report.errors = errorCount;
      report.estimated_cost_usd = totalCost;
      report.generated_at = new Date().toISOString();
      writeReport(report);
    }

    // Batch delay between groups (not after the last batch)
    if (i + BATCH_SIZE < profileRows.length) {
      console.log(`\n⏳ Batch delay ${BATCH_DELAY}ms...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  await pool.end();

  console.log('\n=== COMPLETE ===');
  console.log(`Profiles checked : ${checked}`);
  console.log(`Discrepancies    : ${discrepancyCount}`);
  console.log(`Confirmed        : ${confirmedCount}`);
  console.log(`Errors           : ${errorCount}`);
  console.log(`Total cost       : $${totalCost}`);
  console.log(`Report saved to  : ${OUTPUT_FILE}`);
  console.log('\nNext steps:');
  console.log('  1. Review the report for CRITICAL and HIGH discrepancies');
  console.log('  2. Fix those profiles manually in db/profiles_v*/*.json');
  console.log('  3. node db/import_all_profiles.mjs');
  console.log('  4. git add -A && git commit -m "Corroboration pass corrections" && git push');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});

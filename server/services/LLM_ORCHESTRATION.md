# Multi-LLM Investigation Orchestration System

A cost-effective, multi-layer LLM orchestration system for brand investigations that intelligently routes requests to minimize costs while maximizing accuracy.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INVESTIGATION ORCHESTRATOR                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TRIAGE LAYER (Ollama - Local/Free)                                     │
│  ├── Check if cached deep research exists                               │
│  ├── Determine cache age                                                │
│  └── Decision: 'use_cache' | 'check_recent' | 'full_research'          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              use_cache      check_recent      full_research
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────┐    ┌────────────┐   ┌──────────────┐
            │  Return  │    │  RECENT    │   │   DEEP       │
            │  cached  │───▶│  NEWS     │   │  RESEARCH    │
            │  data    │    │  CHECK    │   │              │
            └──────────┘    └────────────┘   └──────────────┘
                                    │               │
                                    ▼               │
                            ┌────────────┐        │
                            │  No new    │        │
                            │  findings  │─────────┘
                            └────────────┘   ┌──────────────┐
                                    │        │ Claude Opus  │
                                    │        │ + Perplexity │
                                    ▼        │ $15/call     │
                            ┌────────────┐   └──────────────┘
                            │  New       │
                            │  findings  │
                            └────────────┘
                                    │
                                    ▼
                            ┌────────────┐
                            │  VERIFY    │
                            │  Claude    │
                            │  Sonnet    │
                            │  $0.50/call│
                            └────────────┘
```

## Cost Structure

| Path | Components | Estimated Cost |
|------|------------|----------------|
| `use_cache` | Triage (Ollama) | **$0** |
| `check_recent` (no findings) | Triage + Perplexity Sonar | **~$0.05** |
| `check_recent` (with findings) | Triage + Perplexity + Claude Sonnet | **~$0.55** |
| `full_research` | Triage + Claude Opus + Perplexity | **~$15** |

## Layer Details

### 1. Triage Layer (Ollama - Free)

**File:** `services/triageLLM.js`

- **Model:** Llama 3.2 (local, configurable via `OLLAMA_MODEL`)
- **Purpose:** Conservative decision-making to determine investigation path
- **Fallback:** If Ollama unavailable, uses deterministic rules based on cache age

**Environment Variables:**
```bash
OLLAMA_HOST=http://localhost:11434  # Ollama server URL
OLLAMA_MODEL=llama3.2              # Model to use
OLLAMA_TIMEOUT_MS=30000            # Request timeout
```

**Decision Rules (in order):**
1. No cache exists → `full_research`
2. Cache > 90 days old → `check_recent`
3. Cache has NO deep research → `full_research`
4. Cache 30-90 days old → `check_recent` (conservative)
5. Cache < 30 days with deep research → `use_cache`

### 2. Recent News Check (Perplexity Sonar - $0.05)

**File:** `services/recentNewsCheck.js`

- **Model:** sonar (configurable via `PERPLEXITY_RECENT_NEWS_MODEL`)
- **Purpose:** Search last 30-90 days for new enforcement actions
- **Fallback:** If API fails, assumes new developments may exist (conservative)

**Environment Variables:**
```bash
PERPLEXITY_API_KEY=your_key_here
PERPLEXITY_RECENT_NEWS_MODEL=sonar
PERPLEXITY_TIMEOUT_MS=45000
```

### 3. Verification Layer (Claude Sonnet - $0.50)

**Integrated in:** `services/investigationOrchestrator.js`

- **Model:** claude-sonnet-4-6 (configurable via `ANTHROPIC_VERIFICATION_MODEL`)
- **Purpose:** Merge Perplexity findings with cached data, fix inconsistencies
- **Triggers:** Only when recent check finds new developments

### 4. Deep Research (Claude Opus + Perplexity - $15)

**File:** `services/investigation.js` (delegated)

- **Models:** claude-opus-4-7 + Perplexity
- **Purpose:** Full investigation from scratch
- **Triggers:**
  - New brands with no cache
  - Triage explicitly selects `full_research`
  - Verification layer fails

## Usage

### Enable Orchestration

Set the environment variable:
```bash
export INVESTIGATION_USE_ORCHESTRATOR=1
```

### Using the Orchestrated API

```javascript
import { getInvestigationProfile } from './services/investigation.js';

// When INVESTIGATION_USE_ORCHESTRATOR=1, this automatically uses the orchestrator
const investigation = await getInvestigationProfile(
  "McDonald's",
  "McDonald's Corporation",
  { healthFlag: false, productCategory: 'fast_food' }
);

// Access orchestration metadata
console.log(investigation._orchestration.path);           // 'use_cache' | 'check_recent_verified' | 'full_research'
console.log(investigation._orchestration.costSummary);    // Cost breakdown
console.log(investigation._orchestration.totalDurationMs); // Total time
```

### Using the Orchestrator Directly

```javascript
import { orchestrateInvestigation } from './services/investigationOrchestrator.js';

const result = await orchestrateInvestigation({
  brandName: "Brand Name",
  corporateParent: "Parent Company",
  healthFlag: false,
  productCategory: 'fast_food',
  slug: 'brand-slug',
  forceFullResearch: false,  // Optional: skip triage
});

console.log(result.investigation);      // The investigation data
console.log(result.orchestration);     // Orchestration metadata
console.log(result.profileJsonForDb);  // Data for database persistence
```

### Using Individual Layers

```javascript
// Triage only
import { triageInvestigation } from './services/triageLLM.js';
const triage = await triageInvestigation({
  brandName: "Brand",
  corporateParent: "Parent",
  slug: 'brand-slug',
});
console.log(triage.decision);  // 'use_cache' | 'check_recent' | 'full_research'

// Recent news only
import { checkRecentNews } from './services/recentNewsCheck.js';
const news = await checkRecentNews({
  brandName: 'Apple',
  corporateParent: 'Apple Inc.',
  days: 90,
});
console.log(news.hasNewDevelopments);  // true | false
console.log(news.findings);            // Array of findings
```

## Testing

### Run Individual Layer Tests

```bash
# Test Triage Layer (Ollama)
node services/test_triageLLM.mjs

# Test Recent News Layer (Perplexity)
node services/test_recentNewsCheck.mjs

# Test Orchestrator
node services/test_investigationOrchestrator.mjs
```

### Run Integration Tests

```bash
# Test complete flow
node services/test_multi_llm_integration.mjs
```

### Environment-Specific Testing

**Without Ollama (uses fallback logic):**
```bash
# Tests will still pass using deterministic fallback
unset OLLAMA_HOST
node services/test_triageLLM.mjs
```

**Without Perplexity (uses fallback):**
```bash
# Recent news will assume developments may exist
unset PERPLEXITY_API_KEY
node services/test_recentNewsCheck.mjs
```

**With full orchestration:**
```bash
export INVESTIGATION_USE_ORCHESTRATOR=1
export ANTHROPIC_API_KEY=your_key
export PERPLEXITY_API_KEY=your_key
# Ollama should be running
ollama serve &
ollama pull llama3.2

node services/test_multi_llm_integration.mjs
```

## Production Deployment

### 1. Configure Environment

Create `.env`:
```bash
# Required for orchestration
INVESTIGATION_USE_ORCHESTRATOR=1
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Optional Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_MS=30000

# Model overrides
ANTHROPIC_VERIFICATION_MODEL=claude-sonnet-4-6
ANTHROPIC_DEEP_RESEARCH_MODEL=claude-opus-4-7
PERPLEXITY_RECENT_NEWS_MODEL=sonar
```

### 2. Start Ollama (if using local triage)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.2

# Start server
ollama serve
```

### 3. Monitoring

The orchestrator logs detailed information:
```
[orchestrator] starting { brand: '...', healthFlag: false, ... }
[orchestrator] complete { brand: '...', path: 'use_cache', totalDurationMs: 150, ... }
```

Cost tracking is available in the investigation result:
```javascript
investigation._orchestration.costSummary
// {
//   steps: [...],
//   totalEstimatedCostUsd: 0,
//   stepCount: 1
// }
```

## Fallback Behavior

The system is designed to be resilient:

1. **Ollama unavailable** → Uses deterministic rules based on cache age
2. **Perplexity unavailable** → Assumes new developments may exist (conservative)
3. **Claude verification fails** → Returns merged data anyway
4. **Any step fails** → Falls back to legacy `getInvestigationProfileLegacy`

## Migration from Legacy

The legacy implementation remains unchanged. To migrate:

1. Set `INVESTIGATION_USE_ORCHESTRATOR=1`
2. Ensure Ollama is running (optional, has fallback)
3. Ensure Perplexity API key is set (optional, has fallback)
4. Test with `node services/test_multi_llm_integration.mjs`

To disable and return to legacy:
```bash
unset INVESTIGATION_USE_ORCHESTRATOR
# or
export INVESTIGATION_USE_ORCHESTRATOR=0
```

## Cost Optimization Tips

1. **Enable deep research caching** - Stores expensive results in Postgres
2. **Use `forceFullResearch` sparingly** - Only for explicit refresh requests
3. **Monitor path distribution** - Check logs to ensure `use_cache` is being used
4. **Adjust triage thresholds** - Modify rules in `services/triageLLM.js` if needed

## Troubleshooting

### Ollama Connection Refused
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Perplexity API Errors
```bash
# Verify key
curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  https://api.perplexity.ai/chat/completions
```

### Unexpected Path Taken
Check logs for triage decision:
```
[triageLLM] decision { brand: '...', decision: '...', cacheAgeDays: ..., ... }
```

## Architecture Principles

1. **Conservative Triage** - Better to check than miss something
2. **Graceful Degradation** - Every layer has a fallback
3. **Cost Transparency** - Every path tracks estimated costs
4. **Observability** - Detailed logging at each step
5. **Backward Compatibility** - Legacy path remains available

/**
 * EthicalAlt Investigation Adapters
 * Export all data source adapters for corporate accountability research
 */

export { perplexityAdapter } from './perplexity.mjs';
export { gdeltAdapter } from './gdelt.mjs';
export { epaAdapter } from './epa.mjs';
export { secAdapter } from './sec.mjs';
export { claudeAdapter } from './claude.mjs';

// Default export of all adapters
export { default as perplexity } from './perplexity.mjs';
export { default as gdelt } from './gdelt.mjs';
export { default as epa } from './epa.mjs';
export { default as sec } from './sec.mjs';
export { default as claude } from './claude.mjs';

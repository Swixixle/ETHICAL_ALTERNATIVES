/** Contact for removal requests — override via VITE_ETHICALALT_CONTACT in build if needed. */
export const ETHICALALT_CONTACT =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ETHICALALT_CONTACT) ||
  'hello@ethicalalt.com';

export const WITNESS_LEGAL_NOTICE = `IMPORTANT LEGAL NOTICE

The Civic Witness Registry is a voluntary public attestation system. By adding your name you are stating only that you have reviewed the documented investigation linked to your entry.

• This is not a legal filing, class action enrollment, or legal complaint.
• No attorney-client relationship is created.
• EthicalAlt does not provide legal advice.
• All investigations cite publicly available records. Verify primary sources.
• Allegations sections are clearly labeled as unproven claims.
• You may request removal of your entry at any time: ${ETHICALALT_CONTACT}

The investigation records are compiled from publicly available government databases including EPA ECHO, DOJ press releases, NLRB case records, FEC filings, SEC EDGAR, and OSHA enforcement data. EthicalAlt does not make original legal findings.`;

export const WITNESS_LEGAL_NOTICE_COMPACT = [
  'Voluntary public ledger — not a legal filing.',
  `Removal requests: ${ETHICALALT_CONTACT}`,
].join(' ');

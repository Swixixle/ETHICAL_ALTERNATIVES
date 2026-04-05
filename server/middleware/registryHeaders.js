/** Adds EthicalAlt registry identification header to every API response. */
export function registryHeaders(req, res, next) {
  res.setHeader('X-EthicalAlt-Registry', 'civic-witness-v1');
  next();
}

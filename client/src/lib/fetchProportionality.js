export async function fetchProportionality({
  category,
  violationType,
  chargeStatus,
  amountInvolved,
  lat,
  lng,
}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (violationType) params.set('violation_type', violationType);
  if (chargeStatus) params.set('charge_status', chargeStatus);
  if (amountInvolved != null) params.set('amount_involved', String(amountInvolved));
  if (lat != null) params.set('lat', String(lat));
  if (lng != null) params.set('lng', String(lng));
  const res = await fetch(`/proportionality?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.proportionality ?? null;
}

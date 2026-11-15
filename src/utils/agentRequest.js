// Rate request to an agent for an ex-works inquiry: we ask the agent at origin
// for pickup and origin charges (their price is our buy charge). Only the
// shipment goes in the email; the customer's name, email, GSTIN and address
// never do, so the agent can't approach the customer directly.
import { pickSignature } from './signatures';
import { isExWorks, quoteFormat, chargeableWM, line, port, formatWeight } from './replyDraft';

export { isExWorks };

export function newAgentId() {
  return `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function agentList(user) {
  return (user?.agents || []).filter(a => a && (a.name || a.email));
}

// "Li Wei - Ops" -> "Li Wei"; no name -> "Team".
export function agentGreeting(agent) {
  const name = (agent?.name || '').split(/\s+-\s+/)[0].trim();
  return name && !name.includes('@') ? name : 'Team';
}

// Saved agents for this port of loading first (matched on the agent's ports / location).
export function agentsForInquiry(user, inquiry) {
  const pol = `${inquiry?.pol || ''} ${inquiry?.polCode || ''}`.toLowerCase();
  const matches = (a) => (a.location || '').toLowerCase().split(/[,;/]+/).map(s => s.trim()).filter(Boolean).some(p => pol.includes(p));
  const list = agentList(user);
  return [...list.filter(matches), ...list.filter(a => !matches(a))];
}

export function initialAgentFields(inquiry, user) {
  const first = agentsForInquiry(user, inquiry)[0];
  return {
    agentName: first?.name || '',
    agentEmail: first?.email || '',
    askFreight: true,
    remarks: '',
    signatureId: pickSignature(user).id,
  };
}

export function buildAgentSubject(inquiry) {
  const route = `${inquiry.polCode || inquiry.pol || 'origin'} to ${inquiry.podCode || inquiry.pod || 'destination'}`;
  return `Rate request: EXW pickup, ${route}${inquiry.containerType ? ` – ${inquiry.containerType}` : ''} [Ref ${inquiry.id}]`;
}

export function buildAgentBody(inquiry, a, user) {
  const lcl = quoteFormat(inquiry) === 'LCL';
  const wm = chargeableWM(inquiry.volumeCbm, inquiry.grossWeightKg);
  const pol = port(inquiry.pol, inquiry.polCode);
  const shipment = [
    line('Terms', inquiry.incoterms || 'EXW'),
    line('Pickup from', inquiry.pickupAddress || '[PICKUP ADDRESS]'),
    line('Port of loading', pol),
    line('Port of discharge', port(inquiry.pod, inquiry.podCode)),
    line('Equipment', inquiry.containerType || '—'),
    line('Commodity', inquiry.commodity || '—'),
    inquiry.hsnCode && line('HSN code', inquiry.hsnCode),
    Number(inquiry.grossWeightKg) > 0 && line('Gross weight', formatWeight(inquiry.grossWeightKg)),
    Number(inquiry.volumeCbm) > 0 && line('Volume', `${Number(inquiry.volumeCbm).toLocaleString()} CBM`),
    lcl && wm > 0 && line('Chargeable', `${wm} W/M`),
    inquiry.packages && line('Packages', inquiry.packages),
    ...(inquiry.dimensions ? inquiry.dimensions.split(/\s*;\s*/).filter(Boolean).map((d, i) => (i === 0 ? line('Dimensions', d) : `${' '.repeat(20)}${d}`)) : []),
    inquiry.cargoReadyDate && line('Cargo ready', inquiry.cargoReadyDate),
  ].filter(Boolean);

  const asks = [
    `- Pickup / trucking from the address above to ${lcl ? 'the CFS at ' : ''}${pol === '—' ? 'the port of loading' : pol}`,
    '- Export customs clearance',
    lcl ? '- Origin CFS charges (per W/M)' : '- Origin THC (per container)',
    '- Documentation / BL fee',
    '- Any other origin charges',
    a.askFreight && `- Ocean freight to ${port(inquiry.pod, inquiry.podCode)}, ${lcl ? 'per W/M' : 'per container'}, if you can offer it`,
  ].filter(Boolean);

  const signature = pickSignature(user, a.signatureId).text.split('\n');
  return [
    `Dear ${agentGreeting({ name: a.agentName })},`,
    '',
    'Good day. We have an ex-works inquiry and need your best rates for the shipment below.',
    '',
    'SHIPMENT DETAILS',
    ...shipment,
    '',
    'PLEASE QUOTE',
    ...asks,
    '',
    'Please mention the currency, the validity of the rates and any charges at actuals.',
    ...(a.remarks?.trim() ? ['', `Remarks: ${a.remarks.trim()}`] : []),
    '',
    `Kindly revert at the earliest, quoting our reference ${inquiry.id}.`,
    '',
    'Best regards,',
    ...signature,
  ].join('\n');
}

// What must be in place before the request can go out.
export function agentRequestMissing(inquiry, a) {
  const missing = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((a.agentEmail || '').trim())) missing.push('Agent email');
  if (!(inquiry.pickupAddress || '').trim()) missing.push('Pickup address');
  if (!(inquiry.pol || '').trim()) missing.push('Port of loading');
  if (!(inquiry.commodity || '').trim()) missing.push('Commodity');
  return missing;
}

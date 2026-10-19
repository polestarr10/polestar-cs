// Builds the customer quotation reply for an inquiry and the links that open it
// in the rep's email client.

const PLACEHOLDER_EMAILS = ['inquiry@client.com'];

// Details that must be filled before a quotation reply can go out.
export const REQUIRED_REPLY_FIELDS = [
  { key: 'contactEmail', label: 'Customer email' },
  { key: 'pol', label: 'Port of loading' },
  { key: 'pod', label: 'Port of discharge' },
  { key: 'containerType', label: 'Container / equipment' },
  { key: 'commodity', label: 'Commodity' },
  { key: 'grossWeightKg', label: 'Gross weight (kg)' },
  { key: 'rateAmount', label: 'Freight rate' },
];

export function cleanEmail(email) {
  const e = (email || '').trim();
  return PLACEHOLDER_EMAILS.includes(e.toLowerCase()) ? '' : e;
}

// "[RATE]", "[REVISED RATE]", "[FREE DAYS]": blanks a draft leaves for the rep to fill in.
const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9 &/'-]{1,40}\]/g;

export function findPlaceholders(text) {
  return [...new Set((text || '').match(PLACEHOLDER_RE) || [])];
}

export function getMissingFields(draft) {
  return REQUIRED_REPLY_FIELDS.filter(({ key }) => {
    const v = draft[key];
    if (key === 'grossWeightKg' || key === 'rateAmount') return !(Number(v) > 0);
    if (key === 'contactEmail') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(v));
    return v === undefined || v === null || String(v).trim() === '';
  });
}

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', INR: '₹' };

export function formatRate(currency, amount, unit) {
  const num = parseFloat(amount || 0).toLocaleString();
  return `${CURRENCY_SYMBOL[currency] || currency + ' '}${num} ${unit || ''}`.trim();
}

export function defaultRateUnit(inquiry) {
  const c = `${inquiry?.containerType || ''} ${inquiry?.routingMode || ''}`;
  if (c.includes('LCL')) return '/ CBM';
  if (c.includes('Reefer')) return "/ 40' Reefer";
  if (c.includes('20')) return "/ 20'GP";
  return "/ 40'HC";
}

function endOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

// Editable draft state seeded from an inquiry.
export function initialDraftFields(inquiry) {
  return {
    contactPerson: inquiry.contactPerson || '',
    contactEmail: cleanEmail(inquiry.contactEmail),
    pol: inquiry.pol || '',
    polCode: inquiry.polCode || '',
    pod: inquiry.pod || '',
    podCode: inquiry.podCode || '',
    containerType: inquiry.containerType || '',
    routingMode: inquiry.routingMode || '',
    commodity: inquiry.commodity || '',
    grossWeightKg: inquiry.grossWeightKg || '',
    volumeCbm: inquiry.volumeCbm || '',
    incoterms: inquiry.incoterms || '',
    packages: inquiry.packages || '',
    dimensions: inquiry.dimensions || '',
    hsnCode: inquiry.hsnCode || '',
    pickupAddress: inquiry.pickupAddress || '',
    currency: inquiry.quotedCurrency || 'USD',
    rateAmount: inquiry.isQuoted && inquiry.quotedAmountTotal ? String(inquiry.quotedAmountTotal) : '',
    rateUnit: defaultRateUnit(inquiry),
    carrier: inquiry.preferredCarrier || '',
    transitTime: '',
    freeDays: inquiry.freeDaysAtPod || '14 days combined demurrage/detention',
    validity: inquiry.quoteValidity || endOfMonth(),
    remarks: '',
  };
}

function port(name, code) {
  if (!name) return '—';
  return code && !name.includes(code) ? `${name} (${code})` : name;
}

function formatWeight(kg) {
  const n = Number(kg) || 0;
  return `${n.toLocaleString()} KGS (${(n / 1000).toFixed(2)} MT)`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function line(label, value) {
  return `${(label + ':').padEnd(20)}${value}`;
}

export function buildReplySubject(inquiry, f) {
  const original = (inquiry.emailSubject || '').trim();
  if (original && original !== 'No Subject') {
    const base = /^re:/i.test(original) ? original : `Re: ${original}`;
    return `${base} [Ref ${inquiry.id}]`;
  }
  const route = `${f.polCode || f.pol} to ${f.podCode || f.pod}`;
  return `Freight Quotation ${inquiry.id}: ${route} – ${f.containerType}`;
}

export function buildReplyBody(inquiry, f, currentUser) {
  const greetingName = (f.contactPerson || '').split(/\s+-\s+/)[0].trim() || 'Sir/Madam';
  const shipment = [
    line('Port of loading', port(f.pol, f.polCode)),
    line('Port of discharge', port(f.pod, f.podCode)),
    line('Equipment', f.routingMode ? `${f.containerType} (${f.routingMode})` : f.containerType || '—'),
    line('Commodity', f.commodity || '—'),
    line('Gross weight', formatWeight(f.grossWeightKg)),
    Number(f.volumeCbm) > 0 && line('Volume', `${Number(f.volumeCbm).toLocaleString()} CBM`),
    f.packages && line('Packages', f.packages),
    f.dimensions && line('Dimensions', f.dimensions),
    f.hsnCode && line('HSN code', f.hsnCode),
    f.incoterms && line('Incoterms', f.incoterms),
    f.pickupAddress && line('Pickup from', f.pickupAddress),
  ].filter(Boolean);

  const quote = [
    line('Ocean freight', Number(f.rateAmount) > 0 ? formatRate(f.currency, f.rateAmount, f.rateUnit) : '[RATE]'),
    f.carrier && line('Carrier', f.carrier),
    f.transitTime && line('Transit time', f.transitTime),
    f.freeDays && line('Free time at POD', f.freeDays),
    line('Valid until', formatDate(f.validity)),
  ].filter(Boolean);

  const signature = [
    currentUser?.name || 'Polestar CS Team',
    currentUser?.role,
    'Polestar Consolidators & Freight Forwarders Pvt Ltd',
  ].filter(Boolean);

  return [
    `Dear ${greetingName},`,
    '',
    'Thank you for your inquiry. Please find our quotation for your shipment below.',
    '',
    'SHIPMENT DETAILS',
    ...shipment,
    '',
    `QUOTATION (Ref: ${inquiry.id})`,
    ...quote,
    ...(f.remarks?.trim() ? ['', `Remarks: ${f.remarks.trim()}`] : []),
    '',
    'Rates are subject to space and equipment availability at the time of booking. Origin and destination local charges are extra unless stated above.',
    '',
    'Kindly confirm to proceed with the booking.',
    '',
    'Best regards,',
    ...signature,
  ].join('\n');
}

export function buildComposeLink(channel, { to, subject, body }) {
  const enc = encodeURIComponent;
  if (channel === 'gmail') {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;
  }
  if (channel === 'outlook') {
    return `https://outlook.office.com/mail/deeplink/compose?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}`;
  }
  return `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
}

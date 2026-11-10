// Builds the customer quotation reply for an inquiry and the links that open it
// in the rep's email client. Two formats: FCL (rate per container) and LCL
// (rate per W/M, with separate origin / CFS / destination charges).
import { pickSignature } from './signatures';

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

export function isExWorks(draft) {
  return /^EXW|ex[\s-]?works?/i.test((draft?.incoterms || '').trim());
}

export function getMissingFields(draft) {
  const missing = REQUIRED_REPLY_FIELDS.filter(({ key }) => {
    const v = draft[key];
    if (key === 'grossWeightKg' || key === 'rateAmount') return !(Number(v) > 0);
    if (key === 'contactEmail') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(v));
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (draft.format === 'LCL' && !(Number(draft.volumeCbm) > 0)) {
    missing.push({ key: 'volumeCbm', label: 'Total CBM' });
  }
  // Ex-works: the buy charge must be noted (internal only, never in the quote).
  if (isExWorks(draft) && 'buyCharge' in draft && !String(draft.buyCharge || '').trim()) {
    missing.push({ key: 'buyCharge', label: 'Buy charge (internal note, ex-works)' });
  }
  return missing;
}

const CURRENCY_SYMBOL = { USD: '$', EUR: '€', INR: '₹' };

export function formatRate(currency, amount, unit) {
  const num = parseFloat(amount || 0).toLocaleString();
  return `${CURRENCY_SYMBOL[currency] || currency + ' '}${num} ${unit || ''}`.trim();
}

export function quoteFormat(inquiry) {
  const c = `${inquiry?.containerType || ''} ${inquiry?.routingMode || ''}`;
  return /\bLCL\b|consol/i.test(c) || (!/\d\s*x?\s*(20|40|45)/.test(c) && Number(inquiry?.volumeCbm) > 0) ? 'LCL' : 'FCL';
}

// W/M = per CBM or per 1,000 kg, whichever is higher.
export function chargeableWM(cbm, kg) {
  const wm = Math.max(Number(cbm) || 0, (Number(kg) || 0) / 1000);
  return Math.round(wm * 100) / 100;
}

let chargeSeq = 0;
export function newCharge(name = '', unit = '', currency = 'USD') {
  return { id: `c${Date.now().toString(36)}${(chargeSeq++).toString(36)}`, name, currency, amount: '', unit };
}

// Starting charge lines for each format. Lines left without an amount aren't
// put in the reply, so unused ones can simply be left blank.
// Standard LCL origin charges by port of loading: CFS per W/M and documentation.
// Reps can change these and add ports (name menu -> My rates).
export const ORIGIN_RATES = [
  { port: 'Shanghai', code: 'CNSHA', currency: 'USD', cfs: '17', doc: '95', docUnit: 'per BL' },
  { port: 'Shenzhen', code: 'CNSZX', currency: 'USD', cfs: '17', doc: '120', docUnit: 'per BL' },
];
export const DOC_UNITS = ['per BL', 'per set', 'per doc', 'per shipment'];

export function originRatesOf(user) {
  const saved = user?.originRates;
  return Array.isArray(saved) && saved.length ? saved : ORIGIN_RATES;
}

// The rates for an inquiry's port of loading (by code, else by name).
export function originRateFor(inquiry, user) {
  const code = (inquiry?.polCode || '').toUpperCase();
  const name = (inquiry?.pol || '').toLowerCase();
  return originRatesOf(user).find(r => (code && r.code && r.code.toUpperCase() === code)
    || (r.port && name.includes(r.port.toLowerCase()))) || null;
}

export function defaultCharges(format, inquiry, user) {
  const cur = inquiry?.quotedCurrency || 'USD';
  const pickup = /^EXW/i.test(inquiry?.incoterms || '') || Boolean(inquiry?.pickupAddress);
  const isImport = inquiry?.direction === 'Import';
  if (format === 'LCL') {
    // Two origin charges: CFS per W/M, and documentation per BL / set / doc / shipment.
    const rate = originRateFor(inquiry, user);
    const cfs = newCharge('Origin CFS', '/ W/M', rate?.currency || cur);
    const doc = newCharge('Documentation', rate?.docUnit || 'per BL', rate?.currency || cur);
    if (rate) { cfs.amount = rate.cfs || ''; doc.amount = rate.doc || ''; }
    return [
      pickup && newCharge('Pickup / origin trucking', 'per shipment', cur),
      cfs,
      doc,
    ].filter(Boolean);
  }
  return [
    pickup && newCharge('Pickup / origin haulage', 'per container', cur),
    newCharge('Origin THC', 'per container', isImport ? cur : 'INR'),
    newCharge('BL / documentation fee', 'per BL', isImport ? cur : 'INR'),
  ].filter(Boolean);
}

// Polestar's standard LCL destination tariff at Nhava Sheva. Each line is free
// text so rates with alternatives and minimums read exactly as written.
// To change the standard rates, edit this list.
export const LCL_DESTINATION_TARIFF = [
  ['THC', 'INR 1125/ CBM or INR 1350/ Ton (Minimum INR 1350/ Shipment)'],
  ['DO', 'INR 2000/ Shipment'],
  ['CFS', 'INR 750/ CBM or Minimum INR 2500/ Shipment'],
  ['WEIGHMENT', 'INR 500/ Shipment'],
  ['AOTC', 'INR 750/ Shipment'],
  ['GST', 'At Actual'],
];

let destSeq = 0;
export function newDestCharge(name = '', value = '') {
  return { id: `d${Date.now().toString(36)}${(destSeq++).toString(36)}`, name, value };
}

// The rep's own saved rates, else the standard list above.
export function destTariffOf(user) {
  const saved = user?.destTariff;
  return Array.isArray(saved) && saved.length ? saved : LCL_DESTINATION_TARIFF;
}

// LCL: the standard tariff, filled in. FCL: the usual lines, left blank to fill.
export function defaultDestCharges(format, user) {
  if (format === 'LCL') return destTariffOf(user).map(([name, value]) => newDestCharge(name, value));
  return ['THC', 'CFS', 'DO', 'Weighment', 'ODC'].map(name => newDestCharge(name, ''));
}

// The customer's email said destination charges are already agreed.
export function destChargesAgreed(inquiry) {
  return /destination charges as agreed/i.test(inquiry?.specialRequirements || '');
}

export function defaultRateUnit(inquiry) {
  const c = `${inquiry?.containerType || ''} ${inquiry?.routingMode || ''}`;
  if (quoteFormat(inquiry) === 'LCL') return '/ W/M';
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
export function initialDraftFields(inquiry, currentUser) {
  const format = quoteFormat(inquiry);
  return {
    format,
    charges: defaultCharges(format, inquiry, currentUser),
    destAgreed: destChargesAgreed(inquiry),
    destCharges: defaultDestCharges(format, currentUser),
    signatureId: pickSignature(currentUser).id,
    buyCharge: inquiry.buyCharge || '',
    sellCharge: inquiry.sellCharge || '',
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
    freeDays: inquiry.freeDaysAtPod || (format === 'LCL' ? '' : '14 days combined demurrage/detention'),
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
  // Long labels ("Pickup / origin trucking") still get a space before the value.
  const head = `${label}:`.padEnd(20);
  return head.endsWith(' ') ? `${head}${value}` : `${head} ${value}`;
}

// "Viinod - Director" -> "Viinod". An email address in the contact field
// (no name was found) isn't something to greet, so it becomes "Sir/Madam".
export function greetingFor(contactPerson) {
  const name = (contactPerson || '').split(/\s+-\s+/)[0].trim();
  return name && !name.includes('@') ? name : 'Sir/Madam';
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

function chargeLine(c) {
  const amount = parseFloat(c.amount);
  return line(c.name || 'Charge', `${formatRate(c.currency, amount, c.unit)}`);
}

export function buildReplyBody(inquiry, f, currentUser) {
  const lcl = f.format === 'LCL';
  const wm = chargeableWM(f.volumeCbm, f.grossWeightKg);
  const greetingName = greetingFor(f.contactPerson);
  const shipment = [
    line('Port of loading', port(f.pol, f.polCode)),
    line('Port of discharge', port(f.pod, f.podCode)),
    line('Equipment', f.routingMode ? `${f.containerType} (${f.routingMode})` : f.containerType || '—'),
    line('Commodity', f.commodity || '—'),
    line('Gross weight', formatWeight(f.grossWeightKg)),
    Number(f.volumeCbm) > 0 && line('Volume', `${Number(f.volumeCbm).toLocaleString()} CBM`),
    lcl && wm > 0 && line('Chargeable', `${wm} W/M`),
    f.packages && line('Packages', f.packages),
    // Several package sizes ("…; …") go one per line under the label.
    ...(f.dimensions ? f.dimensions.split(/\s*;\s*/).filter(Boolean).map((d, i) => (i === 0 ? line('Dimensions', d) : `${' '.repeat(20)}${d}`)) : []),
    f.hsnCode && line('HSN code', f.hsnCode),
    f.incoterms && line('Incoterms', f.incoterms),
    f.pickupAddress && line('Pickup from', f.pickupAddress),
  ].filter(Boolean);

  const freight = Number(f.rateAmount) > 0 ? formatRate(f.currency, f.rateAmount, f.rateUnit) : '[RATE]';
  const charges = (f.charges || []).filter(c => parseFloat(c.amount) > 0);
  const quote = [
    line('Ocean freight', freight),
    ...charges.map(chargeLine),
    f.carrier && line('Carrier', f.carrier),
    f.transitTime && line('Transit time', f.transitTime),
    f.freeDays && line(lcl ? 'Free storage at CFS' : 'Free time at POD', f.freeDays),
    line('Valid until', formatDate(f.validity)),
  ].filter(Boolean);

  // Destination charges: one line when agreed, otherwise the filled-in items.
  const destItems = (f.destCharges || []).filter(c => c.name?.trim() && c.value?.trim());
  const destination = f.destAgreed
    ? ['', line('Destination charges', 'As agreed')]
    : destItems.length ? ['', 'DESTINATION CHARGES (at POD)', ...destItems.map(c => line(c.name.trim(), c.value.trim()))] : [];

  const signature = pickSignature(currentUser, f.signatureId).text.split('\n');
  return [
    `Dear ${greetingName},`,
    '',
    'Thank you for your inquiry. Please find our quotation for your shipment below.',
    '',
    'SHIPMENT DETAILS',
    ...shipment,
    '',
    `QUOTATION (Ref: ${inquiry.id}) – ${lcl ? 'LCL' : 'FCL'}`,
    ...quote,
    ...destination,
    ...(f.remarks?.trim() ? ['', `Remarks: ${f.remarks.trim()}`] : []),
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

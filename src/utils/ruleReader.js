// Reads a pasted email without AI and returns the same result shape as the AI
// reader (api/_lib/analyzeEmail.js), so the Paste Email screen works either way.
import { evaluateEmailRelevance, parseHeaders, latestMessage, extractShipment, missingForQuote } from './emailParser.js';

const REF_RE = /INQ-\d{4}-\d{4,6}/i;
const OWN_DOMAINS = ['polestarlogistics.com'];

const DECLINE_PATTERNS = [
  { reason: 'went_with_competitor', re: /\b(went|gone|going|proceed(?:ed|ing)?|booked|finali[sz]ed)\s+with\s+(another|other|a different|some other)\b|\banother forwarder\b|\bother forwarder\b|\bbetter (?:rate|offer) from\b/i },
  { reason: 'price', re: /\b(rates?|price|quote|quotation)\s+(?:is|are|seems?|looks?)?\s*(?:very\s+|too\s+|a bit\s+|quite\s+)?(high|expensive|not competitive|on the higher side)\b|\bnot (?:competitive|workable|feasible)\b|\bout of (?:our )?budget\b/i },
  { reason: 'postponed', re: /\b(postponed|on hold|deferred|put on hold|delayed indefinitely)\b|\bplan (?:is )?(?:dropped|cancelled|canceled)\b/i },
  { reason: 'no_space', re: /\bno space\b|\bspace (?:is )?not available\b/i },
  { reason: 'transit_time', re: /\btransit (?:time )?(?:is )?(?:too )?long\b/i },
  { reason: 'other', re: /\b(not|won't|will not|cannot|can't|unable to)\s+(?:be\s+)?(proceed|proceeding|go ahead|move forward|book)\b|\bno longer (?:required|needed)\b|\bnot required (?:anymore|now)\b|\bregret\b|\bcancel(?:led|ed)?\b/i },
];

const NOMINATION_RE = /\b(please|kindly|pls)\s+(book|proceed|arrange|go ahead|release|confirm the booking)\b|\b(go ahead|proceed with (?:the )?booking|confirm(?:ing)? (?:the )?booking|booking (?:is )?confirmed|we confirm|you may proceed|we accept|rates? (?:is |are )?(?:accepted|approved|ok|okay|fine)|accept(?:ed)? your (?:rate|quote|offer)|nominat(?:e|ed|ion)|shipping instructions?|\bSI\b attached)\b/i;

const CARRIERS = ['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'Hapag Lloyd', 'ONE', 'Ocean Network Express', 'Evergreen',
  'COSCO', 'OOCL', 'Yang Ming', 'HMM', 'ZIM', 'Wan Hai', 'PIL', 'Emirates Shipping', 'X-Press Feeders', 'Unifeeder', 'SCI', 'TS Lines'];

const MONEY_RE = /(?:USD|US\$|\$|EUR|€|INR|Rs\.?|₹)\s*([0-9][0-9,]*(?:\.\d+)?)(\s*(?:\/|per)\s*(?:40'?\s*HC|40'?\s*GP|20'?\s*GP|20'?|40'?|CBM|container|cntr|box|unit|W\/M))?/i;

const firstName = (name) => (name || '').split(/\s+[-–|]\s+/)[0].trim().split(/\s+/)[0] || '';
const normSubject = (s) => (s || '').replace(/\[Ref [^\]]+\]/i, '').replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim().toLowerCase();

function findMatch(raw, headers, shipment, inquiries) {
  const open = inquiries.filter(i => i.status !== 'CLOSED_LOST');
  const tag = (raw.match(REF_RE) || [])[0]?.toUpperCase();
  if (tag) {
    const hit = inquiries.find(i => i.id.toUpperCase() === tag);
    if (hit) return { id: hit.id, confidence: 'tag' };
  }
  const subject = normSubject(headers.subject);
  if (subject) {
    const hit = open.find(i => normSubject(i.emailSubject) === subject);
    if (hit) return { id: hit.id, confidence: 'strong' };
  }
  const sender = headers.fromEmail.toLowerCase();
  if (sender) {
    const same = open
      .filter(i => (i.contactEmail || '').toLowerCase() === sender)
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    const sameRoute = same.find(i => shipment.polCode && shipment.podCode && i.polCode === shipment.polCode && i.podCode === shipment.podCode);
    if (sameRoute) return { id: sameRoute.id, confidence: 'strong' };
    if (same.length === 1) return { id: same[0].id, confidence: 'strong' };
    if (same.length > 1) return { id: same[0].id, confidence: 'weak' };
    const domain = sender.split('@')[1];
    const sameCompany = domain && open.find(i => (i.contactEmail || '').toLowerCase().endsWith(`@${domain}`));
    if (sameCompany) return { id: sameCompany.id, confidence: 'weak' };
  }
  return { id: '', confidence: 'none' };
}

function sentences(text) {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.replace(/^[\s>*•-]+/, '').trim())
    .filter(s => s.length > 3 && !/^(dear|hi|hello|regards|best regards|thanks|thank you|warm regards|sincerely)\b/i.test(s));
}

// The sentence that actually says no, without a leading "Dear X," greeting.
function declineNote(latest, decline) {
  const all = latest.replace(/\r/g, '').split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const hit = (decline && all.find(s => decline.re.test(s))) || all.find(s => !/^(dear|hi|hello)\b/i.test(s)) || '';
  return hit.replace(/^(dear|hi|hello)\s+[^,]{1,40},\s*/i, '').slice(0, 160);
}

function money(text) {
  const m = text.match(MONEY_RE);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function nominationDetails(latest, headers) {
  const booking = latest.match(/\b(?:booking|bkg|bk)\s*(?:no\.?|number|ref(?:erence)?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{5,})\b/i);
  // Short all-caps names (ONE, PIL, SCI) must match case exactly, or "one" would count as a carrier.
  const carrier = CARRIERS.find(c => new RegExp(`\\b${c.replace(/[-\s]/g, '[-\\s]?')}\\b`, /^[A-Z]{2,4}$/.test(c) ? '' : 'i').test(latest));
  const etd = latest.match(/\b(?:ETD|sailing(?: date)?|vessel cut[- ]?off|cargo ready)\s*(?:on|:|-)?\s*(\d{1,2}[\s./-]\w{2,9}[\s./-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  const etdDate = etd ? new Date(etd[1]) : null;
  // Local calendar date; toISOString() would shift it back a day in India (UTC+5:30).
  const etdIso = etdDate && !isNaN(etdDate)
    ? `${etdDate.getFullYear()}-${String(etdDate.getMonth() + 1).padStart(2, '0')}-${String(etdDate.getDate()).padStart(2, '0')}`
    : '';
  return {
    bookingRef: booking ? booking[1] : '',
    containerType: '',
    containerCount: 0,
    finalRate: money(latest),
    carrier: carrier || '',
    etd: etdIso,
    confirmedBy: headers.fromName.split(/\s+[-–|]\s+/)[0].trim(),
    remarks: '',
  };
}

// ---- Reply templates ----

const SIGN_OFF = 'Best regards,\n{{SIGNATURE}}';

function templateFor(kind, { name, missing, match, requestedRate, intent }) {
  const greeting = `Dear ${name || 'Sir/Madam'},`;
  const ref = match ? ` (Ref ${match.id})` : '';
  const route = match ? `${match.polCode || match.pol || ''} to ${match.podCode || match.pod || ''}`.trim() : '';
  switch (kind) {
    case 'new_inquiry':
      if (!missing.length) return '';
      return `${greeting}\n\nThank you for your inquiry. To share an accurate quotation, could you please confirm the following:\n\n${missing.map(m => `- ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n')}\n\nWe will revert with our best rates as soon as we receive these details.\n\n${SIGN_OFF}`;
    case 'customer_reply':
      if (intent === 'counter_offer') {
        return `${greeting}\n\nThank you for your feedback on our quotation${ref}.\n\nWe have reviewed your request${requestedRate ? ` for ${requestedRate}` : ''} and can offer [REVISED RATE], subject to space and equipment availability. [ANY OTHER CHANGES]\n\nKindly confirm so that we can proceed with the booking.\n\n${SIGN_OFF}`;
      }
      return `${greeting}\n\nThank you for your email${ref}.\n\n[YOUR RESPONSE]\n\nPlease let us know if you need anything further.\n\n${SIGN_OFF}`;
    case 'nomination':
      return `${greeting}\n\nThank you for confirming the booking${route ? ` for ${route}` : ''}${ref}. We are processing it with the carrier and will share the booking confirmation and next steps shortly.\n\n${SIGN_OFF}`;
    case 'declined':
      return `${greeting}\n\nThank you for letting us know. We appreciate the opportunity to quote and hope to support you on your next shipment. Please feel free to reach out any time.\n\n${SIGN_OFF}`;
    default:
      return '';
  }
}

export function readEmailWithRules(text, inquiries = []) {
  const raw = (text || '').trim();
  let headers = parseHeaders(raw);
  const latest = latestMessage(raw);

  // If the newest message is our own (a Polestar reply on top of the thread),
  // the customer is the sender of the quoted email below it.
  let customerText = raw;
  if (OWN_DOMAINS.some(d => headers.fromEmail.toLowerCase().endsWith(`@${d}`))) {
    const rest = raw.slice(raw.indexOf(latest) + latest.length);
    const quoted = parseHeaders(rest.replace(/^\s*>\s?/gm, ''));
    const wrote = rest.match(/^\s*On (.{5,160}?)<([^>\s]+@[^>\s]+)>\s*wrote:/im);
    const to = raw.match(/^\s*To:\s*(?:["']?([^"'<\n\r]+?)["']?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/im);
    const customer = quoted.fromEmail ? { name: quoted.fromName, email: quoted.fromEmail }
      : wrote ? { name: wrote[1].split(',').pop().trim(), email: wrote[2] }
      : to ? { name: (to[1] || '').trim(), email: to[2] } : null;
    if (customer && !OWN_DOMAINS.some(d => customer.email.toLowerCase().endsWith(`@${d}`))) {
      headers = { ...headers, fromName: customer.name, fromEmail: customer.email, sentAt: quoted.sentAt || headers.sentAt };
      customerText = rest;
    }
  }
  const shipment = extractShipment(raw, headers);
  if (customerText !== raw) shipment.contactPhone = extractShipment(customerText, headers).contactPhone;
  const match = findMatch(raw, headers, shipment, inquiries);
  const matched = inquiries.find(i => i.id === match.id) || null;

  const decline = DECLINE_PATTERNS.find(p => p.re.test(latest));
  const nominated = NOMINATION_RE.test(latest);
  const relevant = evaluateEmailRelevance(raw).isRelevant;

  let kind;
  if (decline && !(nominated && decline.reason === 'other')) kind = 'declined';
  else if (nominated) kind = 'nomination';
  else if (matched && match.confidence !== 'weak') kind = 'customer_reply';
  else if (relevant) kind = 'new_inquiry';
  else kind = matched ? 'customer_reply' : 'not_freight';

  // A brand-new request from a known sender is a new inquiry, not a reply.
  if (kind === 'customer_reply' && match.confidence !== 'tag' && !/^\s*(re|fw|fwd)\s*:/i.test(headers.subject) && relevant && missingForQuote(shipment).length <= 2) {
    kind = 'new_inquiry';
  }

  const points = sentences(latest).filter(s => s.includes('?') || MONEY_RE.test(s) || /\b(free days?|transit|schedule|vessel|validity|discount|reduce|best rate)\b/i.test(s)).slice(0, 6);
  const requestedRate = kind === 'customer_reply' ? money(latest) : '';
  const intent = kind !== 'customer_reply' ? 'none'
    : requestedRate || /\b(reduce|discount|best rate|lower|match|revise|revised|target)\b/i.test(latest) ? 'counter_offer'
    : latest.includes('?') ? 'question' : 'other';

  const missing = kind === 'new_inquiry' ? missingForQuote(shipment) : [];
  const summaries = {
    new_inquiry: `New inquiry: ${[shipment.containerType, shipment.commodity].filter(Boolean).join(' ') || 'shipment'}${shipment.pol || shipment.pod ? `, ${shipment.polCode || shipment.pol || '?'} to ${shipment.podCode || shipment.pod || '?'}` : ''}${shipment.grossWeightKg ? `, ${(shipment.grossWeightKg / 1000).toLocaleString()} MT` : ''}`,
    customer_reply: points[0] ? `Customer replied: ${points[0].slice(0, 140)}` : 'Customer replied',
    nomination: 'Customer confirmed the booking',
    declined: `Customer declined${decline ? ` (${decline.reason.replace(/_/g, ' ')})` : ''}`,
    not_freight: 'Not a freight email',
  };

  return {
    kind,
    matchedInquiryId: kind === 'new_inquiry' && match.confidence !== 'strong' ? '' : match.id,
    matchConfidence: kind === 'new_inquiry' && match.confidence !== 'strong' ? 'none' : match.confidence,
    summary: summaries[kind],
    email: headers,
    shipment,
    missingDetails: missing,
    customerReply: { intent, requestedRate, points: kind === 'customer_reply' ? points : [] },
    nomination: kind === 'nomination' ? nominationDetails(latest, headers) : { bookingRef: '', containerType: '', containerCount: 0, finalRate: '', carrier: '', etd: '', confirmedBy: '', remarks: '' },
    declined: { reason: decline?.reason || 'other', note: kind === 'declined' ? declineNote(latest, decline) : '' },
    suggestedReply: templateFor(kind, { name: firstName(headers.fromName), missing, match: matched, requestedRate, intent }),
    readBy: 'rules',
  };
}

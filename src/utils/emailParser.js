// Rule-based extraction of freight details from a pasted email. Used when the
// AI reader isn't available. It only reports what the email actually says:
// anything it can't find is left blank (or 0) so the rep is asked for it.

export const PORT_MAP = [
  { name: "Mundra Port", code: "INMUN", country: "India", keywords: ["mundra", "inmun"] },
  { name: "Nhava Sheva / JNPT", code: "INNSA", country: "India", keywords: ["nhava sheva", "nhavasheva", "nhava-sheva", "nhava", "jnpt", "jawaharlal nehru", "innsa"] },
  { name: "Chennai Port", code: "INMAA", country: "India", keywords: ["chennai", "inmaa", "madras"] },
  { name: "Kolkata Port", code: "INCCU", country: "India", keywords: ["kolkata", "calcutta", "inccu", "haldia"] },
  { name: "Tuticorin Port", code: "INTUT", country: "India", keywords: ["tuticorin", "intut", "v.o.chidambaranar"] },
  { name: "Cochin / Kochi Port", code: "INCOK", country: "India", keywords: ["cochin", "kochi", "incok", "vallarpadam"] },
  { name: "Hazira Port", code: "INHZR", country: "India", keywords: ["hazira", "inhzr"] },
  { name: "Pipavav Port", code: "INPAV", country: "India", keywords: ["pipavav", "inpav"] },
  { name: "Jebel Ali", code: "AEJEA", country: "UAE", keywords: ["jebel ali", "aejea"] },
  { name: "Rotterdam", code: "NLRTM", country: "Netherlands", keywords: ["rotterdam", "nlrtm"] },
  { name: "Antwerp", code: "BEANR", country: "Belgium", keywords: ["antwerp", "beanr"] },
  { name: "Hamburg", code: "DEHAM", country: "Germany", keywords: ["hamburg", "deham"] },
  { name: "Singapore", code: "SGSIN", country: "Singapore", keywords: ["singapore", "sgsin"] },
  { name: "Port Klang", code: "MYPKG", country: "Malaysia", keywords: ["port klang", "mypkg"] },
  { name: "Shanghai", code: "CNSHA", country: "China", keywords: ["shanghai", "cnsha"] },
  { name: "Ningbo", code: "CNNGB", country: "China", keywords: ["ningbo", "cnngb"] },
  { name: "Qingdao", code: "CNTAO", country: "China", keywords: ["qingdao", "cntao"] },
  { name: "Shenzhen", code: "CNSZX", country: "China", keywords: ["shenzhen", "yantian", "shekou", "chiwan", "cnszx", "cnytn"] },
  { name: "Guangzhou / Nansha", code: "CNCAN", country: "China", keywords: ["guangzhou", "nansha", "huangpu", "cncan", "cnnsa"] },
  { name: "Xiamen", code: "CNXMN", country: "China", keywords: ["xiamen", "cnxmn"] },
  { name: "Tianjin / Xingang", code: "CNTXG", country: "China", keywords: ["tianjin", "xingang", "cntxg", "cntsn"] },
  { name: "Hong Kong", code: "HKHKG", country: "Hong Kong", keywords: ["hong kong", "hkhkg"] },
  { name: "Busan", code: "KRPUS", country: "South Korea", keywords: ["busan", "pusan", "krpus"] },
  { name: "Kaohsiung", code: "TWKHH", country: "Taiwan", keywords: ["kaohsiung", "twkhh"] },
  { name: "Ho Chi Minh City", code: "VNSGN", country: "Vietnam", keywords: ["ho chi minh", "hcmc", "cat lai", "vnsgn"] },
  { name: "Laem Chabang", code: "THLCH", country: "Thailand", keywords: ["laem chabang", "bangkok", "thlch", "thbkk"] },
  { name: "New York / Newark", code: "USNYC", country: "USA", keywords: ["new york", "newark", "usnyc"] },
  { name: "Houston", code: "USHOU", country: "USA", keywords: ["houston", "ushou"] },
  { name: "Los Angeles / Long Beach", code: "USLAX", country: "USA", keywords: ["los angeles", "long beach", "uslax"] },
  { name: "Dammam", code: "SADMM", country: "Saudi Arabia", keywords: ["dammam", "sadmm"] },
  { name: "Jeddah", code: "SAJED", country: "Saudi Arabia", keywords: ["jeddah", "sajed"] },
  { name: "Felixstowe", code: "GBFXT", country: "United Kingdom", keywords: ["felixstowe", "gbfxt"] },
  { name: "London Gateway", code: "GBLGP", country: "United Kingdom", keywords: ["london gateway", "gblgp"] },
  { name: "Colombo", code: "LKCMB", country: "Sri Lanka", keywords: ["colombo", "lkcmb"] },
];

const FREE_MAIL = ["gmail", "yahoo", "hotmail", "outlook", "rediffmail", "live", "icloud", "proton"];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text, word) => new RegExp(`\\b${escapeRe(word)}\\b`, "i").test(text);

function findPort(text, onlyCountry = null) {
  const candidates = PORT_MAP.filter(p => onlyCountry === null || (onlyCountry === "India" ? p.country === "India" : p.country !== "India"));
  // Earliest mention wins, so "Mundra to Jebel Ali" maps in order.
  let best = null;
  for (const port of candidates) {
    for (const k of port.keywords) {
      const m = new RegExp(`\\b${escapeRe(k)}\\b`, "i").exec(text);
      if (m && (!best || m.index < best.index)) best = { port, index: m.index };
    }
  }
  return best?.port || null;
}

// A labelled port line ("POL: Mundra (INMUN), India"): a known port, else the text as written.
function portFromLabel(value) {
  const known = findPort(value);
  if (known) return { name: known.name, code: known.code };
  const name = value.split(/[,(;]/)[0].trim();
  return name && name.length <= 40 ? { name, code: (value.match(/\b([A-Z]{5})\b/) || [])[1] || "" } : null;
}

/**
 * Evaluates whether an email is a freight conversation or something irrelevant
 * (spam, marketing, internal notices, out-of-office replies).
 */
export function evaluateEmailRelevance(text) {
  if (!text || typeof text !== 'string') {
    return { isRelevant: false, category: "EMPTY_INPUT", categoryLabel: "Empty", flagReason: "No text content detected." };
  }
  const lower = text.toLowerCase();

  const outOfOffice = ["out of office", "auto-reply", "automatic reply", "auto reply", "i am currently away",
    "i am out of the office", "on annual leave", "on sick leave", "will respond upon my return"];
  if (outOfOffice.some(t => lower.includes(t))) {
    return { isRelevant: false, category: "OUT_OF_OFFICE", categoryLabel: "Out of office / auto-reply", flagReason: "Automatic out-of-office reply." };
  }

  const spam = ["unsubscribe", "opt out", "promotional offer", "seo services", "loan approval", "pre-approved loan",
    "credit card limit", "casino", "crypto trading", "congratulations you won", "claim your prize",
    "marketing agency", "webinar invitation", "buy followers", "guest post"];
  if (spam.some(t => lower.includes(t))) {
    return { isRelevant: false, category: "SPAM_MARKETING", categoryLabel: "Marketing / spam", flagReason: "Marketing or promotional email." };
  }

  const internal = ["password reset", "it support ticket", "hr announcement", "payroll slip", "all hands meeting",
    "office maintenance", "holiday notice for staff", "team lunch", "employee survey", "server downtime", "vpn credentials"];
  if (internal.some(t => lower.includes(t))) {
    return { isRelevant: false, category: "INTERNAL_ADMIN", categoryLabel: "Internal notice", flagReason: "Internal HR / IT notice." };
  }

  const freightWords = ["freight", "rate", "quote", "inquiry", "enquiry", "quotation", "ocean", "fcl", "lcl",
    "container", "pol", "pod", "port", "shipper", "consignee", "cbm", "gross weight", "kgs", "destination",
    "origin", "incoterm", "fob", "cif", "cfr", "exw", "reefer", "vessel", "sailing", "cargo", "commodity",
    "export", "import", "booking", "stuffing", "demurrage", "detention", "thc", "air freight", "cfs",
    "gstin", "high cube", "pallet", "shipment", "etd", "eta"];
  const matched = freightWords.filter(w => hasWord(lower, w));
  if (matched.length < 2 && !findPort(text)) {
    return { isRelevant: false, category: "NON_FREIGHT_GENERAL", categoryLabel: "Not a freight email", flagReason: "No ports, cargo or freight request found." };
  }
  return { isRelevant: true, category: "FREIGHT", matchedKeywords: matched };
}

// ---- Headers ----

export function parseHeaders(raw) {
  const from = raw.match(/^\s*From:\s*(?:["']?([^"'<\n\r]+?)["']?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/im);
  const subject = raw.match(/^\s*Subject:\s*([^\n\r]+)/im);
  const date = raw.match(/^\s*(?:Date|Sent):\s*([^\n\r]+)/im);
  const parsedDate = date ? Date.parse(date[1].replace(/\s+at\s+/i, ' ')) : NaN;
  const fromName = (from?.[1] || '').trim();
  return {
    fromName,
    fromEmail: (from?.[2] || '').trim(),
    subject: (subject?.[1] || '').trim(),
    sentAt: isNaN(parsedDate) ? '' : new Date(parsedDate).toISOString(),
  };
}

// The newest message in a pasted thread: everything before the first quoted reply.
export function latestMessage(raw) {
  const markers = [
    /^\s*On .{5,120}wrote:\s*$/im,
    /^\s*-{2,}\s*Original Message\s*-{2,}/im,
    /^\s*-{2,}\s*Forwarded message\s*-{2,}/im,
    /^\s*>/m,
  ];
  // Skip the top header block so the first "From:" line doesn't cut the message off.
  const bodyStart = raw.search(/\n\s*\n/);
  const body = bodyStart > 0 ? raw.slice(bodyStart) : raw;
  let cut = body.length;
  for (const re of markers) {
    const m = re.exec(body);
    if (m && m.index < cut) cut = m.index;
  }
  const laterFrom = /\n\s*From:\s.+\n(?:.*\n){0,4}?\s*(?:Sent|Date):/i.exec(body);
  if (laterFrom && laterFrom.index < cut) cut = laterFrom.index;
  return body.slice(0, cut).trim() || raw.trim();
}

// A labelled value that can run over several lines, like an address:
//   Factory address: Building 1, Xingyao Park,
//   Wuyi County, Jinhua City, Zhejiang
// Starts after the label (or on the next line if the label stands alone) and
// stops at a blank line, another "Label:" line, or the email's sign-off.
const BLOCK_STOP = /^\s*(?:(?:best\s+|warm\s+|kind\s+)?regards|thanks|thank you|sincerely|please|kindly|as per|note\b|from:|sent:|to:|cc:|subject:)/i;
const OTHER_LABEL = /^\s*[A-Za-z][A-Za-z .\/()&-]{1,40}\s*[:：]\s*\S/;

function labelBlock(raw, names) {
  const lines = raw.replace(/\r/g, '').split('\n');
  for (const n of names) {
    const re = new RegExp(`^[\\s>*•\\-]*${n}\\s*(?:\\([^)]*\\))?\\s*[:：\\-–]\\s*(.*)$`, 'i');
    const start = lines.findIndex(l => re.test(l));
    if (start === -1) continue;
    const parts = [];
    const first = lines[start].match(re)[1].trim();
    if (first) parts.push(first);
    for (let k = start + 1; k < lines.length && parts.length < 8; k++) {
      const line = lines[k].replace(/^[\s>]+/, '').trim();
      if (!line) {
        if (parts.length) break; // blank line ends the address
        continue;                // label on its own line: skip blanks before the address
      }
      if (BLOCK_STOP.test(line) || OTHER_LABEL.test(line)) break;
      parts.push(line);
    }
    const value = parts.join(', ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
    if (value) return value.slice(0, 400);
  }
  return '';
}

// Shared mailboxes ("Import Customer Service", "CS Desk") aren't a person to address.
const GENERIC_SENDER = /\b(customer\s*service|import|export|desk|team|info|sales|operations|ops|support|accounts|enquir|inquir|logistics|booking|admin|cs)\b/i;

// "Best Regards,\n\nViinod | Director" -> "Viinod - Director"
function signatureName(raw) {
  const m = raw.match(/(?:regards|thanks|thank you|sincerely|cheers)[,!.]?[ \t]*\r?\n(?:[ \t]*\r?\n){0,3}[ \t]*([A-Z][A-Za-z.']+(?:[ \t]+[A-Z][A-Za-z.']+){0,3})[ \t]*(?:[|,–-][ \t]*([A-Za-z &./]{2,40}?))?[ \t]*\r?$/im);
  if (!m || GENERIC_SENDER.test(m[1])) return '';
  return m[2] ? `${m[1].trim()} - ${m[2].trim()}` : m[1].trim();
}

// The sender's registered company name from their signature, when it matches their email domain.
function legalNameFromSignature(raw, email) {
  const base = ((email || '').split('@')[1] || '').split('.')[0].toLowerCase();
  if (!base || FREE_MAIL.includes(base)) return '';
  const re = /([A-Z][A-Za-z0-9&.'\- ]{1,70}?\b(?:Private Limited|Pvt\.?\s*Ltd\.?|Limited|Ltd\.?|LLP|Inc\.?|LLC|GmbH|Co\.))/g;
  for (const m of raw.matchAll(re)) {
    const name = m[1].replace(/^(?:a|e|w|p|t)\s*:\s*/i, '').trim();
    if (name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(base)) return name;
  }
  return '';
}

function companyFromEmail(email) {
  const domain = (email.split('@')[1] || '').toLowerCase();
  const base = domain.split('.')[0];
  if (!base || FREE_MAIL.includes(base)) return '';
  return base.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ---- Shipment details ----

export function extractShipment(raw, headers = parseHeaders(raw)) {
  const lower = raw.toLowerCase();
  const label = (names) => {
    for (const n of names) {
      const m = raw.match(new RegExp(`^[\\s>*•\\-]*${n}\\s*(?:\\([^)]*\\))?\\s*[:\\-–]\\s*([^\\n\\r]+)`, 'im'));
      if (m && m[1].trim()) return m[1].trim();
    }
    return '';
  };

  // Company and contact
  const shipperName = label(['Shipper Name', 'Shipper\\s*\\/\\s*Client', 'Shipper', 'Company Name', 'Company', 'Client', 'Exporter']).split(/[,;]/)[0].trim()
    || legalNameFromSignature(raw, headers.fromEmail) || companyFromEmail(headers.fromEmail);
  const fromPerson = headers.fromName.split(/\s+[-–|]\s+/)[0].trim();
  const contactPerson = (GENERIC_SENDER.test(fromPerson) ? signatureName(raw) : '') || fromPerson || label(['Contact Person', 'Contact', 'Attn']);
  const phone = raw.match(/(?:Phone|Tel|Mobile|Mob|Cell|WhatsApp|Ph)\.?\s*(?:No\.?)?\s*[:\-]?\s*(\+?[0-9][0-9\s-]{8,15}[0-9])/i)
    || raw.match(/(?:^|[\s|])[pmt]\s*:\s*(\+?[0-9][0-9\s-]{8,15}[0-9])/im);
  const gst = raw.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i);

  // Ports: labelled lines first, then "from X to Y", then known port names.
  let polInfo = null;
  let podInfo = null;
  const polText = label(['POL', 'Port of Loading', 'Loading Port', 'Origin Port', 'Port of Origin']);
  const podText = label(['POD', 'Port of Discharge', 'Discharge Port', 'Destination Port', 'Port of Destination']);
  if (polText) polInfo = portFromLabel(polText);
  if (podText) podInfo = portFromLabel(podText);
  if (!polInfo || !podInfo) {
    const route = raw.match(/\b(?:from|ex)\s+([A-Za-z][A-Za-z .\/]{2,30}?)\s+(?:to|for)\s+([A-Za-z][A-Za-z .\/]{2,30}?)(?=\s*(?:port|[,.;()\n]|$))/i);
    if (route) {
      polInfo ||= portFromLabel(route[1]);
      podInfo ||= portFromLabel(route[2]);
    }
  }
  // Without labels, assume an export (India -> abroad) unless the email talks about imports.
  const importHint = /\bimports?\b/i.test(raw) && !/\bexports?\b/i.test(raw);
  if (!polInfo) { const p = findPort(raw, importHint ? "abroad" : "India"); if (p) polInfo = { name: p.name, code: p.code }; }
  if (!podInfo) { const p = findPort(raw, importHint ? "India" : "abroad"); if (p) podInfo = { name: p.name, code: p.code }; }
  const inIndia = (info) => info && (PORT_MAP.find(p => p.code && p.code === info.code)?.country === "India" || /^IN[A-Z]{3}$/.test(info.code || ""));
  const direction = polInfo && podInfo
    ? (inIndia(podInfo) && !inIndia(polInfo) ? "Import" : inIndia(polInfo) && !inIndia(podInfo) ? "Export" : "")
    : importHint ? "Import" : /\bexports?\b/i.test(raw) ? "Export" : "";

  // Equipment
  let routingMode = "Unknown";
  let containerType = "";
  let containerCount = 0;
  const fcl = lower.match(/\b(\d{1,3})\s*(?:x|\*|×|nos?\.?(?:\s*of)?|units?\s*of)\s*(20|40|45)\s*(?:'|’|ft|feet|foot)?\s*-?\s*(high\s*cube|hc|hq|gp|dv|dry|standard|std|reefer|rf|open\s*top|ot|flat\s*rack|fr)?/);
  const equipLabel = (typeWord, size, context) => {
    const t = typeWord || "";
    if (/reefer|\brf\b|\brh\b/.test(context) || /reefer|rf/.test(t)) return "Reefer";
    if (/open\s*top|ot/.test(t)) return "Open Top";
    if (/flat\s*rack|fr/.test(t)) return "Flat Rack";
    if (/high\s*cube|hc|hq/.test(t)) return "HC";
    if (t) return "GP";
    if (size !== "20" && /high\s*cube|\b40\s*'?\s*hc\b|\bhq\b/.test(lower)) return "HC";
    return size === "45" ? "HC" : "GP";
  };
  if (/\blcl\b|consolidation|groupage/.test(lower)) {
    routingMode = "Ocean LCL";
    containerType = "LCL";
  } else if (/air\s*freight|air\s*cargo|\bby air\b|airway\s*bill|\bawb\b/.test(lower)) {
    routingMode = "Air Freight";
    containerType = "Air";
  } else if (fcl) {
    const kind = equipLabel(fcl[3], fcl[2], lower.slice(fcl.index, fcl.index + 60));
    containerCount = Number(fcl[1]);
    containerType = `${fcl[1]}x${fcl[2]}' ${kind}`;
    routingMode = kind === "Reefer" ? "Ocean Reefer" : (kind === "Flat Rack" || kind === "Open Top") ? "Special Equipment" : "Ocean FCL";
  } else {
    const single = lower.match(/\b(20|40|45)\s*(?:'|’|ft|feet)?\s*-?\s*(high\s*cube|hc|hq|gp|dv|dry|std|standard|reefer|rf|open\s*top|flat\s*rack)\b/);
    if (single) {
      const kind = equipLabel(single[2], single[1], lower.slice(single.index, single.index + 60));
      containerCount = 1;
      containerType = `1x${single[1]}' ${kind}`;
      routingMode = kind === "Reefer" ? "Ocean Reefer" : (kind === "Flat Rack" || kind === "Open Top") ? "Special Equipment" : "Ocean FCL";
    }
  }

  // Weight: prefer the total/gross figure over per-container payloads or net weights.
  let grossWeightKg = 0;
  let bestWeight = null;
  for (const m of raw.matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(kgs?|kilograms?|metric\s*tons?|mts?|tonnes?|tons?)\b/gi)) {
    const before = raw.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
    const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 25).toLowerCase();
    let score = 0;
    if (/gross/.test(before)) score += 2;
    if (/total/.test(before) || /^\s*total/.test(after)) score += 2;
    if (/weight|\bwt\b/.test(before)) score += 1;
    if (/^\s*\)?\s*(?:per|each|\/)\s*(?:container|cntr|box|unit)/.test(after) || /payload|\bnet\b/.test(before.slice(-15))) score -= 5;
    if (!bestWeight || score > bestWeight.score) bestWeight = { m, score };
  }
  if (bestWeight) {
    const value = parseFloat(bestWeight.m[1].replace(/,/g, ''));
    grossWeightKg = Math.round(/^kg|^kilo/i.test(bestWeight.m[2]) ? value : value * 1000);
  }

  const volume = raw.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:cbm|m3|cubic\s*met(?:er|re)s?)\b/i);
  const volumeCbm = volume ? parseFloat(volume[1].replace(/,/g, '')) : 0;

  // Commodity: labelled lines only, so headings like "COMMODITY & CARGO PARTICULARS:" don't match.
  const commodity = label(['Commodity', 'Cargo Description', 'Description of Goods', 'Goods', 'Product', 'Cargo'])
    .replace(/\s*\(.*?HS Code.*?\)\s*/i, ' ').trim();

  // First mention wins: in a pasted thread the newest message (e.g. "please quote on
  // ex-works basis only") comes before the older text it corrects.
  // Codes must be capitals (so "dap fertiliser" isn't DAP); "Ex works" may be any case.
  const incoMatches = [
    raw.match(/\b(FOB|CIF|CFR|CNF|C&F|EXW|FCA|DDP|DAP|CPT|CIP)\b(?:\s+([A-Z][a-zA-Z]+))?/),
    raw.match(/\b(ex[\s-]?works?)\b(?:\s+([A-Z][a-zA-Z]+))?/i),
  ].filter(Boolean).sort((a, b) => a.index - b.index);
  const inco = incoMatches[0];
  const incoCode = inco ? (/^EX/i.test(inco[1]) ? 'EXW' : /^C&F$/i.test(inco[1]) ? 'CFR' : inco[1].toUpperCase()) : '';
  const incoPlace = inco && inco[2] && !/^(Incoterms?|Terms?|Basis\w*|Only|Rates?|Price|Quote|Shipment|Cargo|And|Or|To|From|For|Please|Kindly|The)$/i.test(inco[2]) ? inco[2] : '';
  const incoterms = [incoCode, incoPlace].filter(Boolean).join(' ');

  // Cargo details import inquiries usually give.
  const PKG = '(boxes|packages|pkgs|cartons|ctns|pallets|cases|crates|bags|drums|rolls|bundles|pieces|pcs)';
  const pkgLabelled = raw.match(new RegExp(`(?:no\\.?\\s*of|number\\s*of|total)\\s*${PKG}\\s*[:\\-–]?\\s*(\\d[\\d,]*)`, 'i'));
  const pkgInline = raw.match(new RegExp(`\\b(\\d[\\d,]*)\\s*${PKG}\\b`, 'i'));
  const packages = pkgLabelled ? `${pkgLabelled[2]} ${pkgLabelled[1].toLowerCase()}` : pkgInline ? `${pkgInline[1]} ${pkgInline[2].toLowerCase()}` : '';
  const hsn = raw.match(/\b(?:HSN|HS)\s*(?:code|no\.?)?\s*[:\-–]?\s*(\d{4,10})\b/i);
  const dimensions = label(['Box Dimensions?', 'Carton Dimensions?', 'Package Dimensions?', 'Dimensions?', 'Dims']);
  const pickupAddress = labelBlock(raw, ['Factory Address', 'Pick\\s*-?\\s*up Address', 'Pick\\s*-?\\s*up Location', 'Supplier Address', 'Collection Address', 'Pick\\s*-?\\s*up From']);

  const freeDays = raw.match(/(\d{1,3})\s*days?\s*(?:of\s*)?(?:free|combined|detention|demurrage|det\b|dem\b)|free\s*(?:time|days)[^0-9\n]{0,25}(\d{1,3})/i);
  const ready = label(['Cargo Readiness Date', 'Cargo Ready Date', 'Cargo Readiness', 'Ready Date', 'Readiness']);

  return {
    shipperName,
    contactPerson,
    contactEmail: headers.fromEmail,
    contactPhone: phone ? phone[1].trim() : '',
    gstin: gst ? gst[1].toUpperCase() : '',
    pol: polInfo?.name || '',
    polCode: polInfo?.code || '',
    pod: podInfo?.name || '',
    podCode: podInfo?.code || '',
    direction,
    routingMode,
    containerType,
    containerCount,
    packages,
    hsnCode: hsn ? hsn[1] : '',
    dimensions,
    pickupAddress,
    commodity,
    grossWeightKg,
    volumeCbm,
    incoterms,
    cargoReadyDate: ready,
    freeDaysRequested: freeDays ? `${freeDays[1] || freeDays[2]} days` : '',
    specialRequirements: [
      /\bhaz(?:ardous)?\b|\bimo\b|\bdg cargo\b|\bun\s?\d{4}\b/i.test(raw) && 'Hazardous cargo mentioned',
      /pick[\s-]?up address|factory address|door pick[\s-]?up|pick[\s-]?up from/i.test(raw) && 'Pickup from supplier needed',
      /charges?\s+separately|separate(?:ly)?\s+(?:origin|destination|local)|origin,?\s*destination,?\s*(?:and\s+)?cfs/i.test(raw) && 'Show origin, destination and CFS charges separately',
    ].filter(Boolean).join('; '),
    urgent: /\burgent\b|\basap\b|\bat the earliest\b/i.test(raw),
  };
}

export function missingForQuote(s) {
  return [
    !s.pol && 'origin port',
    !s.pod && 'destination port',
    !s.containerType && 'container type',
    !s.commodity && 'commodity',
    !(s.grossWeightKg > 0) && 'gross weight',
  ].filter(Boolean);
}

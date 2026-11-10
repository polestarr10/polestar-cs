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

// The client's main ports: offered first in the POL/POD fields.
export const MAIN_PORTS = ['Shanghai', 'Shenzhen', 'Ningbo', 'Nhava Sheva / JNPT'];

// Port names for the POL/POD pick lists: main ports first, then the rest.
export function portChoices() {
  return [...MAIN_PORTS, ...PORT_MAP.map(p => p.name).filter(n => !MAIN_PORTS.includes(n))];
}

// The code for a port name picked or typed ("Ningbo" -> CNNGB), or "".
export function portCodeFor(name) {
  const known = findPort(name || '');
  return known ? known.code : '';
}

const PICKUP_LABELS = ['Factory Address', 'Pick\\s*-?\\s*up Address', 'Pick\\s*-?\\s*up Location', 'Supplier Address', 'Collection Address', 'Pick\\s*-?\\s*up From'];

// Where in China -> the port cargo from there usually sails from.
const REGION_PORTS = [
  ['CNNGB', /\b(Ningbo|Jinhua|Yiwu|Wuyi|Yongkang|Hangzhou|Wenzhou|Taizhou|Shaoxing|Huzhou|Jiaxing|Lishui|Quzhou|Zhoushan|Cixi|Yuyao|Zhejiang|Jiangxi|Nanchang)\b|宁波|金华|义乌|杭州|温州|浙江/i],
  ['CNSZX', /\b(Shenzhen|Guangzhou|Dongguan|Foshan|Zhongshan|Huizhou|Jiangmen|Zhuhai|Shantou|Yunfu|Zhaoqing|Qingyuan|Shunde|Guangdong|Guangxi|Nanning|Hunan|Changsha)\b|深圳|广州|东莞|佛山|中山|广东/i],
  ['CNSHA', /\b(Shanghai|Suzhou|Wuxi|Nanjing|Changzhou|Nantong|Kunshan|Taicang|Yangzhou|Zhenjiang|Jiangsu|Anhui|Hefei|Wuhu|Hubei|Wuhan|Xiaogan|Hanchuan|Jingzhou|Yichang|Henan|Zhengzhou|Sichuan|Chengdu|Chongqing)\b|上海|苏州|江苏|湖北|武汉/i],
  ['CNTAO', /\b(Qingdao|Shandong|Jinan|Yantai|Weifang|Weihai|Rizhao)\b|青岛|山东/i],
  ['CNTXG', /\b(Tianjin|Hebei|Beijing|Shijiazhuang|Tangshan)\b|天津|河北|北京/i],
  ['CNXMN', /\b(Xiamen|Fujian|Fuzhou|Quanzhou|Jinjiang|Zhangzhou|Putian)\b|厦门|福建/i],
];

// Suggests the usual port for a Chinese place (the first place named wins), or null.
export function suggestPortFromPlace(text) {
  if (!text) return null;
  let best = null;
  for (const [code, re] of REGION_PORTS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.index)) best = { code, index: m.index, place: m[1] || m[0] };
  }
  if (!best) return null;
  const port = PORT_MAP.find(p => p.code === best.code);
  return port ? { port, place: best.place } : null;
}

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

// The known port mentioned last in a piece of text ("LCL 2.5 CBM Ningbo" -> Ningbo).
function findPortAtEnd(text) {
  let best = null;
  for (const port of PORT_MAP) {
    for (const k of port.keywords) {
      for (const m of text.matchAll(new RegExp(`\\b${escapeRe(k)}\\b`, 'gi'))) {
        if (!best || m.index > best.index) best = { port, index: m.index };
      }
    }
  }
  return best && text.slice(best.index).trim().length <= 20 ? best.port : null;
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

// Gmail in the browser copies a message without "From:" / "Subject:" labels:
//   ENQ261099 // QINGDAO // NHAVA SHEVA     <- subject (first line)
//   Inbox
//   Viinod Kumar <impcs@kadachanaa.com>     <- sender
//   Tue, Nov 3, 2026, 11:20 AM (2 hours ago) <- date
//   to me, Gauri
const GMAIL_SENDER = /^[ \t]*([^<>\n\r@:]{1,80}?)[ \t]*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>[ \t]*$/m;
const GMAIL_LABELS = /^(inbox|external|important|sent|drafts|starred|spam|updates|promotions|forums|social)$/i;

function gmailDate(text) {
  const m = text.match(/^\s*(?:[A-Z][a-z]{2},\s*)?([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}\s*(?:[AP]M)?)/m);
  if (!m) return NaN;
  return Date.parse(m[1].replace(/,(?=\s+\d{1,2}:)/, ''));
}

// "From: Name <a@b.com>", "From: a@b.com <a@b.com>", "From: a@b.com", "From: 'Name' <a@b.com>".
// The address in <…> wins; a "name" that is itself an address isn't a name.
function parseFromLine(raw) {
  const line = raw.match(/^\s*From:[ \t]*([^\n\r]*)/im);
  if (!line) return null;
  const text = line[1];
  const bracketed = text.match(/<\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*>/);
  const bare = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = bracketed ? bracketed[1] : bare ? bare[0] : '';
  if (!email) return null;
  let name = (bracketed ? text.slice(0, bracketed.index) : '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (name.includes('@')) name = '';
  return [line[0], name, email];
}

export function parseHeaders(raw) {
  const from = parseFromLine(raw);
  const subject = raw.match(/^\s*Subject:\s*([^\n\r]+)/im);
  const date = raw.match(/^\s*(?:Date|Sent):\s*([^\n\r]+)/im);
  let parsedDate = date ? Date.parse(date[1].replace(/\s+at\s+/i, ' ')) : NaN;
  let fromName = (from?.[1] || '').trim();
  let fromEmail = (from?.[2] || '').trim();
  let subjectText = (subject?.[1] || '').trim();

  if (!fromEmail) {
    const g = GMAIL_SENDER.exec(raw);
    if (g) {
      fromName = g[1].trim().replace(/^["']|["']$/g, '');
      fromEmail = g[2].trim();
      const before = raw.slice(0, g.index).split(/\r?\n/).map(l => l.trim()).filter(l => l && !GMAIL_LABELS.test(l));
      if (!subjectText && before.length) subjectText = before[0];
      if (isNaN(parsedDate)) parsedDate = gmailDate(raw.slice(g.index + g[0].length, g.index + g[0].length + 120));
    }
  }
  return {
    fromName,
    fromEmail,
    subject: subjectText,
    sentAt: isNaN(parsedDate) ? '' : new Date(parsedDate).toISOString(),
  };
}

// Last resort when the paste has no sender line: the email address in the
// signature ("e: name@company.com"), else the first address in the text,
// skipping any of the given own-company domains.
export function emailFromBody(raw, ownDomains = []) {
  const own = (e) => ownDomains.some(d => e.toLowerCase().endsWith(`@${d}`));
  const labelled = [...raw.matchAll(/(?:^|[\s|])(?:e|email|e-mail|mail)\s*[:\-]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gim)].map(m => m[1]);
  const any = [...raw.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map(m => m[0]);
  return [...labelled, ...any].find(e => !own(e)) || '';
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

// The customer's own office address, from their signature. Two layouts seen:
//   a: Kadachanaa … Private Limited | Unit#C209, 2nd Floor, … Navi Mumbai | 400614, India
//   A: VIJAY GLOBAL FORWARDERS & SUPPLY CHAIN SOLUTIONS
//   722, 7th Floor, B Wing, Pranik Chambers, Sakinaka,     (blank lines between)
//   Andheri (East), Mumbai - 400072
// Also "Address: …" / "Office: …". Pickup/factory addresses are a separate field.
const CONTACT_LINE = /^\s*(?:[mepwtf]|mob(?:ile)?|tel|ph(?:one)?|email|e-mail|web(?:site)?|fax|cell|gst(?:in)?)\s*[.:]|www\.|https?:|@|^\s*\[?cid:/i;
const PIN_LINE = /\b\d{3}\s?\d{3}\b|\bindia\b/i;
const ADDRESS_WORDS = /\b(floor|road|rd\.?|marg|street|st\.|lane|nagar|chambers|tower|sector|plot|unit|building|bldg|estate|complex|midc|near|opp\.?|wing|house|park|centre|center|east|west)\b/i;

export function customerAddressFrom(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => /^\s*(?:a|add|addr|address|office(?:\s+address)?|regd\.?\s+office)\s*[:\-]\s*\S/i.test(l)
    && !/factory|pick\s*-?\s*up|supplier|collection/i.test(l));
  if (start === -1) return unlabelledSignatureAddress(lines);

  const parts = [];
  let first = lines[start].replace(/^\s*[^:\-]+[:\-]\s*/, '').trim();
  // "Company Name | address…": drop the company part (it has no digits).
  const pieces = first.split('|').map(p => p.trim()).filter(Boolean);
  const companyDropped = pieces.length > 1 && !/\d/.test(pieces[0]);
  if (companyDropped) pieces.shift();
  first = pieces.join(', ');
  // "A: COMPANY NAME" alone on its line: the address starts on the next lines.
  // After "Company |", whatever follows is the address, even just a city.
  if (first && (companyDropped || /\d/.test(first) || ADDRESS_WORDS.test(first))) parts.push(first);

  let blanks = 0;
  for (let k = start + 1; k < lines.length && parts.length < 7; k++) {
    const line = lines[k].trim();
    if (!line) { if (++blanks > 2) break; continue; }
    blanks = 0;
    if (CONTACT_LINE.test(line) || BLOCK_STOP.test(line) || line.length > 120) break;
    if (/polestar/i.test(line)) break;
    if (!parts.length && !(/\d/.test(line) || ADDRESS_WORDS.test(line))) break;
    parts.push(line);
    if (PIN_LINE.test(line) && /\d{3}\s?\d{3}/.test(line)) break; // the PIN code ends the address
  }
  return parts.join(', ').replace(/\s*,\s*,+/g, ',').replace(/,\s*$/, '').replace(/\s+/g, ' ').trim().slice(0, 250);
}

// A signature without labels: Name / Title / Company / "Plot 12, GIDC Sanand,
// Ahmedabad - 382110" / Tel. The line with a 6-digit PIN, within a few lines of
// the sign-off, plus the address lines just above it.
function unlabelledSignatureAddress(lines) {
  for (let s = 0; s < lines.length; s++) {
    if (!/^\s*(?:(?:best|warm|kind)\s+)?regards|^\s*thanks|^\s*thank you|^\s*sincerely/i.test(lines[s])) continue;
    for (let p = s + 1; p < Math.min(lines.length, s + 20); p++) {
      const line = lines[p].trim();
      if (!line || CONTACT_LINE.test(line) || /\+\d/.test(line) || !/\b\d{3}\s?\d{3}\b/.test(line)) continue;
      const parts = [line];
      // Walk up over the address lines (signatures often have blank lines between them).
      for (let k = p - 1, blanks = 0; k > s && parts.length < 4; k--) {
        const above = lines[k].trim();
        if (!above) { if (++blanks > 1) break; continue; }
        blanks = 0;
        if (CONTACT_LINE.test(above) || /\b(?:pvt|private|ltd|limited|llp|inc)\b/i.test(above)) break;
        if (!(/\d/.test(above) || ADDRESS_WORDS.test(above))) break;
        parts.unshift(above);
      }
      return parts.join(', ').replace(/\s+/g, ' ').replace(/,\s*,+/g, ',').replace(/,(?=\S)/g, ', ').trim().slice(0, 250);
    }
  }
  return '';
}

// ---- Several shipments in one email ----
// Package groups that add up to a total ("3 pallets + 4 pallets = 7") stay ONE
// shipment. Separate shipments are split when the email lays them out clearly:
// repeated "POL:" blocks, "Shipment 1 / Shipment 2" headings, or a table with one
// row per shipment. Anything that only *might* be several shipments is flagged.

// Fields that belong to each shipment; contact, company, addresses etc. are shared.
const PER_SHIPMENT = ['pol', 'polCode', 'polSuggested', 'pod', 'podCode', 'direction', 'routingMode', 'containerType', 'containerCount',
  'commodity', 'grossWeightKg', 'volumeCbm', 'volumeCbmCalculated', 'packages', 'dimensions', 'hsnCode', 'incoterms', 'cargoReadyDate'];
const SECTION_HEADING = /^[\s>*•-]*(?:shipment|inquiry|enquiry|option|lot|consignment|cargo|lane)\s*(?:no\.?\s*)?[#-]?\s*\(?\d{1,2}\)?\s*[:.)\-–]?\s*/i;
const POL_LABEL = /^[\s>*•-]*(?:\d{1,2}[.)]\s*)?(?:pol|port of loading|loading port|origin port|port of origin)\s*[:\-–]/i;
const SIGN_OFF = /^\s*(?:(?:best|warm|kind)\s+)?regards|^\s*thanks|^\s*thank you|^\s*sincerely/i;

function sectionTexts(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const end = (() => { const i = lines.findIndex(l => SIGN_OFF.test(l)); return i === -1 ? lines.length : i; })();
  for (const marker of [SECTION_HEADING, POL_LABEL]) {
    const starts = [];
    for (let i = 0; i < end; i++) if (marker.test(lines[i])) starts.push(i);
    if (starts.length < 2) continue;
    return starts.map((s, k) => lines.slice(s, k + 1 < starts.length ? starts[k + 1] : end).join('\n'));
  }
  return null;
}

// A table with a header naming the ports: "Sr | POL | POD | Commodity | CBM | Weight (kg)".
function tableShipments(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const cellsOf = (l) => l.split(/\s*\|\s*|\t|\s{2,}/).map(c => c.trim()).filter((c, i, a) => c || (i > 0 && i < a.length - 1));
  const headerAt = lines.findIndex(l => /\b(?:pol|origin|loading|from)\b/i.test(l) && /\b(?:pod|destination|discharge|to)\b/i.test(l) && cellsOf(l).length >= 3);
  if (headerAt === -1) return null;
  const header = cellsOf(lines[headerAt]).map(h => h.toLowerCase());
  const col = (re) => header.findIndex(h => re.test(h));
  const cols = {
    pol: col(/\b(?:pol|origin|loading|from)\b/), pod: col(/\b(?:pod|destination|discharge|to)\b/),
    commodity: col(/commodity|cargo|goods|description|product/), cbm: col(/cbm|vol/), weight: col(/weight|wt|kg|mt\b/),
    container: col(/container|equip|type|size/), terms: col(/term|inco/), packages: col(/pkg|package|pallet|qty|boxes|cartons/),
  };
  const rows = [];
  for (let i = headerAt + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^[-=|+\s]+$/.test(line)) { if (rows.length) break; continue; }
    const cells = cellsOf(line);
    if (cells.length < Math.min(3, header.length)) break;
    const get = (k) => (cols[k] >= 0 ? cells[cols[k]] || '' : '');
    const polInfo = get('pol') ? portFromLabel(get('pol')) : null;
    const podInfo = get('pod') ? portFromLabel(get('pod')) : null;
    const weightText = get('weight');
    const weight = parseFloat(weightText.replace(/,/g, '')) || 0;
    rows.push({
      pol: polInfo?.name || '', polCode: polInfo?.code || '', pod: podInfo?.name || '', podCode: podInfo?.code || '',
      commodity: get('commodity').replace(/\s*\(.*?\)\s*$/, '').trim(),
      volumeCbm: parseFloat(get('cbm')) || 0,
      grossWeightKg: /mt|ton/i.test(weightText) || /\bmt\b/.test(header[cols.weight] || '') ? Math.round(weight * 1000) : weight,
      containerType: get('container'), incoterms: (get('terms').match(/\b(FOB|CIF|CFR|EXW|FCA|DDP|DAP|CPT|CIP)\b/i) || [])[1]?.toUpperCase() || '',
      packages: get('packages'),
    });
  }
  return rows.length >= 2 ? rows : null;
}

// Each shipment's own details, with the email-wide details (sender, company,
// addresses) shared. Identical repeats (e.g. a quoted earlier message) count once.
export function splitShipments(raw, headers, base) {
  const fromSections = sectionTexts(raw)?.map(t => extractShipment(t, headers));
  const parts = fromSections || tableShipments(raw);
  if (!parts || parts.length < 2) return [];
  const isIndian = (code) => /^IN[A-Z]{3}$/.test(code || '');
  const out = [];
  for (const p of parts) {
    const s = { ...base };
    for (const k of PER_SHIPMENT) s[k] = p[k] || '';
    s.grossWeightKg = Number(p.grossWeightKg) || 0;
    s.volumeCbm = Number(p.volumeCbm) || 0;
    s.containerCount = Number(p.containerCount) || 0;
    // Shared terms / mode apply when a shipment doesn't state its own (a term
    // stated anywhere in the email beats one assumed for the shipment).
    if (!s.incoterms || p.incotermsAssumed) {
      s.incoterms = base.incoterms || s.incoterms;
      s.incotermsAssumed = Boolean(base.incotermsAssumed);
    }
    if (!s.containerType) {
      s.containerType = s.volumeCbm > 0 && !/\d\s*x?\s*(20|40|45)/.test(base.containerType || '') ? 'LCL' : base.containerType || '';
      s.routingMode = s.containerType === 'LCL' ? 'Ocean LCL' : base.routingMode;
    }
    if (!s.direction && s.polCode && s.podCode) s.direction = isIndian(s.podCode) && !isIndian(s.polCode) ? 'Import' : isIndian(s.polCode) && !isIndian(s.podCode) ? 'Export' : '';
    const key = [s.polCode || s.pol, s.podCode || s.pod, s.commodity, s.volumeCbm, s.grossWeightKg].join('|').toLowerCase();
    if (!out.some(o => o._key === key)) out.push({ ...s, _key: key });
  }
  return out.length >= 2 ? out.map(({ _key, ...s }) => s) : [];
}

// Signs that an email may hold more than one shipment, when it couldn't be split.
export function multipleShipmentHint(raw) {
  const said = raw.match(/\b(?:two|2|three|3|four|4|five|5|multiple|several|both)\s+(?:different\s+|separate\s+|new\s+)?(?:lcl\s+|fcl\s+)?(?:shipments|enquiries|inquiries|consignments|lanes|routes)\b/i);
  if (said) return `The email says "${said[0]}".`;
  const pods = new Set();
  for (const m of raw.matchAll(/^[\s>*•-]*(?:pod|port of discharge|destination port|discharge port)\s*[:\-–]\s*([^\n\r]+)/gim)) {
    const p = findPort(m[1]);
    pods.add(p ? p.code : m[1].trim().toLowerCase().slice(0, 20));
  }
  if (pods.size > 1) return 'It names more than one destination port.';
  const fcl = new Set([...raw.toLowerCase().matchAll(/\b(\d{1,3})\s*(?:x|\*|×)\s*(20|40|45)\s*'?\s*(hc|hq|gp|dv|rf|ot|fr)?/g)].map(m => `${m[2]}${m[3] || ''}`));
  if (fcl.size > 1) return 'It mentions more than one container type (could be separate shipments, or options for one).';
  return '';
}

// Package groups that make up one shipment, one per line, each with a count and
// a size and/or CBM:
//   10001000800mm * 3 pallets 2.4CBM
//   100010001005mm 4 pallets 4.2 CBM
function cargoGroups(raw) {
  const groups = [];
  for (const rawLine of raw.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (!line || /^\s*total\b/i.test(line) || /^(?:no\.?\s*of|number\s+of)\b/i.test(line)) continue;
    const pkg = line.match(new RegExp(`(?:^|[^\\d.])(\\d{1,4})\\s*(?:nos?\\.?\\s*)?(${PKG_KIND})\\b`, 'i'));
    if (!pkg) continue;
    const cbm = line.match(/([0-9]+(?:\.[0-9]+)?)\s*cbm\b/i);
    const before = line.slice(0, pkg.index + pkg[0].indexOf(pkg[1])).replace(/[*×x\s,:\-–]+$/i, '').trim();
    const dims = before && DIM_LINE.test(before.replace(/(\d{6,13})\s*(mm|cm)/i, '1x1x1')) ? fixDimensions(before) : '';
    if (!cbm && !dims) continue;
    groups.push({ count: Number(pkg[1]), kind: pkg[2].toLowerCase(), cbm: cbm ? parseFloat(cbm[1]) : 0, dims });
  }
  return groups;
}

// "Total: 6.6 CBM", "Total - 7 Pallets", "Total 7 pallets / 6.6 cbm".
function cargoTotals(raw) {
  let cbm = 0;
  let count = 0;
  let kind = '';
  for (const m of raw.matchAll(/^[\s>*•-]*total\b[^\n\r]*/gim)) {
    const line = m[0];
    const c = line.match(/([0-9]+(?:\.[0-9]+)?)\s*cbm\b/i);
    if (c && !cbm) cbm = parseFloat(c[1]);
    const p = line.match(new RegExp(`\\b(\\d{1,4})\\s*(${PKG_KIND})\\b`, 'i'));
    if (p && !count) { count = Number(p[1]); kind = p[2].toLowerCase(); }
  }
  return { cbm, count, kind };
}

// Sizes whose separators were lost when the email was copied: "10001000800mm"
// is 1000 × 1000 × 800 mm, "402627 cm" is 40 × 26 × 27 cm, "1m1m1.85m" is
// 1 × 1 × 1.85 m. Digits are only split when there is exactly one sensible way.
function splitRun(digits, unit) {
  const [min, max] = unit === 'mm' ? [100, 9999] : unit === 'cm' ? [10, 999] : [1, 99];
  const found = [];
  for (let a = 1; a < digits.length - 1; a++) {
    for (let b = a + 1; b < digits.length; b++) {
      const parts = [digits.slice(0, a), digits.slice(a, b), digits.slice(b)];
      if (parts.every(p => !/^0/.test(p) && Number(p) >= min && Number(p) <= max)) found.push(parts);
    }
  }
  return found.length === 1 ? found[0] : null;
}

function fixDimensions(text) {
  let t = text.replace(/\*/g, ' ').trim();
  const metres = t.match(/^(\d+(?:\.\d+)?)\s*m\s*(\d+(?:\.\d+)?)\s*m\s*(\d+(?:\.\d+)?)\s*m\b/i);
  if (metres) return `${metres[1]} × ${metres[2]} × ${metres[3]} m`;
  t = t.replace(/\b(\d{6,13})\s*(mm|cm)\b/gi, (whole, digits, unit) => {
    const parts = splitRun(digits, unit.toLowerCase());
    return parts ? `${parts.join(' × ')} ${unit.toLowerCase()}` : whole;
  });
  return t.replace(/\s+/g, ' ').trim();
}

// ---- CBM from dimensions ----
// "110 × 110 × 100 cm", "L-1140mm, W-750mm, H-830mm", "1000 × 1000 × 800 mm × 3 pallets",
// "40x48x50 inch". Sizes are separated by ";". Each size counts once, unless it says
// how many ("× 3 pallets", "(2 pallets)"), or it is the only size and the email
// gives a package count (then every package is that size).
const TO_METRE = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, inch: 0.0254, inches: 0.0254, '"': 0.0254 };
const UNIT = '(mm|cm|m|inch(?:es)?|in|")?';
const NUM = '(\\d+(?:\\.\\d+)?)';

function sizeInMetres(text) {
  const x = text.match(new RegExp(`${NUM}\\s*${UNIT}\\s*[x×*]\\s*${NUM}\\s*${UNIT}\\s*[x×*]\\s*${NUM}\\s*${UNIT}`, 'i'))
    // (separators written as an alternation: a bracketed list here is misread by the styling tool)
    || text.match(new RegExp(`\\bL\\s*(?:-|:|=|\\.)?\\s*${NUM}\\s*${UNIT}[^\\d]{0,12}?\\bW\\s*(?:-|:|=|\\.)?\\s*${NUM}\\s*${UNIT}[^\\d]{0,12}?\\bH\\s*(?:-|:|=|\\.)?\\s*${NUM}\\s*${UNIT}`, 'i'));
  if (!x) return null;
  const nums = [x[1], x[3], x[5]].map(Number);
  let unit = (x[2] || x[4] || x[6] || (text.match(/\b(mm|cm|inch(?:es)?|in)\b|\d\s*(m)\b/i) || []).slice(1).find(Boolean) || '').toLowerCase();
  if (!unit) unit = Math.max(...nums) > 300 ? 'mm' : Math.max(...nums) > 3 ? 'cm' : 'm'; // guess from the size
  const f = TO_METRE[unit] || 0.01;
  return nums.reduce((v, n) => v * n * f, 1);
}

export function cbmFromDimensions(dimensions, packages = '') {
  const sizes = (dimensions || '').split(/\s*;\s*/).filter(Boolean);
  if (!sizes.length) return 0;
  const pkgCount = Number(((packages || '').match(/=\s*(\d+)/) || (packages || '').match(/^\s*(\d+)/) || [])[1]) || 0;
  let total = 0;
  for (const size of sizes) {
    const m3 = sizeInMetres(size);
    if (!m3) return 0; // one size we can't read: don't guess a total
    const n = Number((size.match(new RegExp(`(?:[x×*]|\\()\\s*(\\d{1,4})\\s*(?:nos?\\.?\\s*)?${PKG_KIND}`, 'i')) || [])[1])
      || (sizes.length === 1 && pkgCount ? pkgCount : 1);
    total += m3 * n;
  }
  return Math.round(total * 1000) / 1000;
}

// Package dimensions, one size or several (one line per box):
//   Dimensions: 110 × 110 × 100 cm
//   Dimension :                          <- label alone, sizes below
//   L-1140mm, *W-750mm, *H- 830mm
//   L-1370mm, *W-575mm, *H- 620mm        (blank lines between are fine)
// Sizes are joined with "; " in the order written.
const DIM_LINE = /\d\s*(?:mm|cm|m|in|inch|")?\s*[x×*]\s*\d|\b[LWH]\s*[-:=.]?\s*\d/i;

function dimensionsFrom(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => /^[\s>*•-]*(?:box|carton|package|pkg|cargo)?\s*(?:dimensions?|dims|measurements?)\b(?!.*\bcbm\b)\s*(?:\([^)]*\))?\s*[:\-–]/i.test(l));
  if (start === -1) {
    // No label: a line that is only a size, e.g. "1m1m1.85m".
    const bare = lines.map(l => l.trim()).find(l => /^\d+(?:\.\d+)?\s*m\s*\d+(?:\.\d+)?\s*m\s*\d+(?:\.\d+)?\s*m$/i.test(l));
    return bare ? fixDimensions(bare) : '';
  }
  const clean = (s) => fixDimensions(s.replace(/\*/g, '').replace(/\s*-\s*(?=\d)/g, '-').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim());
  const sizes = [];
  const inline = lines[start].replace(/^[^:\-–]*[:\-–]\s*/, '').trim();
  if (inline) sizes.push(clean(inline));
  let blanks = 0;
  for (let k = start + 1; k < lines.length && sizes.length < 30; k++) {
    const line = lines[k].trim();
    if (!line) { if (++blanks > 2) break; continue; }
    blanks = 0;
    if (!DIM_LINE.test(line) || /\b(?:cbm|kgs?|weight)\b/i.test(line)) break;
    sizes.push(clean(line.replace(/^[\s>*•-]+/, '')));
  }
  return sizes.join('; ').slice(0, 400);
}

function labelBlock(raw, names) {
  const lines = raw.replace(/\r/g, '').split('\n');
  for (const n of names) {
    // "Pickup address:" / "PICK UP ADDRESS." (a full stop works too)
    const re = new RegExp(`^[\\s>*•\\-]*${n}\\s*(?:\\([^)]*\\))?\\s*[:：.\\-–]\\s*(.*)$`, 'i');
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

// Noted in special requirements when the customer has agreed destination charges.
export const DEST_AGREED_NOTE = 'Destination charges as agreed';

// Package kinds, optionally with a material: "wooden boxes", "jumbo bags", "pallets".
const PKG_KIND = '(?:(?:wooden|wood|plywood|ply|corrugated|jumbo|steel|plastic|pp|hdpe|paper|gunny|carton)\\s+)?'
  + '(?:boxes|box|packages|package|pkgs|pkg|cartons|carton|ctns|ctn|pallets|pallet|plts|skids|skid|cases|case|crates|crate|'
  + 'bags|bag|sacks|sack|drums|drum|barrels|barrel|rolls|roll|bundles|bundle|coils|coil|pieces|piece|pcs|ibcs|ibc|totes|tote|reels|reel)';
const GENERIC_PKG = /^(packages?|pkgs?)$/i;

// "100 boxes", "12 wooden boxes", "No. of packages: 5 pallets", "Pkgs: 8" +
// "Packing: wooden crates", or just "Packing: pallets".
function packagesFrom(raw, label) {
  const counted = raw.match(new RegExp(`\\b(\\d[\\d,]*)\\s*(?:nos?\\.?\\s*(?:of\\s+)?)?(${PKG_KIND})\\b`, 'i'));
  const labelled = raw.match(new RegExp(`(?:no\\.?\\s*of|number\\s*of|total|qty\\.?\\s*(?:of)?)?\\s*\\b(${PKG_KIND})\\s*[:\\-–]\\s*(\\d[\\d,]*)(?:[ \\t]*(${PKG_KIND})\\b)?`, 'i'));
  const packing = label(['Packing(?:\\s+Type)?', 'Packaging(?:\\s+Type)?', 'Package Type', 'Type of Packing', 'Packing Details']);
  const kindFromPacking = (packing.match(new RegExp(PKG_KIND, 'i')) || [])[0] || '';

  let count = '';
  let kind = '';
  if (labelled) {
    count = labelled[2];
    kind = labelled[3] || labelled[1];
  } else if (counted) {
    count = counted[1];
    kind = counted[2];
  }
  // A generic word ("packages") gives way to the actual packing if it's named elsewhere.
  if ((!kind || GENERIC_PKG.test(kind)) && kindFromPacking) kind = kindFromPacking;
  if (count) return `${count} ${kind.toLowerCase()}`.trim();
  return packing ? packing.slice(0, 60) : '';
}

// HSN / HS code anywhere in the email: "HSN CODE: 84678900", "(HSN# 8455300000)",
// "HS Code No. 8455", "HSN/SAC - 8455", "H.S. code 845530".
// The digits may be grouped: "3919 9090", "3919.90.90" (spaces/dots are removed after).
const HSN_RE = /\b(?:HSN|H\.?S\.?)(?:\s*\/\s*SAC)?\s*(?:code|no\.?|number)?\s*(?:no\.?)?\s*[#:.\-–]?\s*(\d{4}(?:[ .]?\d{2}){0,3})\b/i;

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
    if (belongsToDomain(name, base)) return name;
  }
  // Signature line "A: VIJAY GLOBAL FORWARDERS & SUPPLY CHAIN SOLUTIONS" (vgfscs.in)
  // or "Company: …", even without "Pvt Ltd".
  for (const m of raw.matchAll(/^[ \t]*(?:a|company|co\.?)[ \t]*:[ \t]*([^|\n\r,]{3,80})/gim)) {
    const name = m[1].trim();
    if (/[A-Za-z]/.test(name) && !/\d{3,}/.test(name) && belongsToDomain(name, base)) return name;
  }
  return '';
}

// "Kadachanaa Shipping…" for kadachanaa.com, or initials: "Vijay Global
// Forwarders & Supply Chain Solutions" for vgfscs.in.
function belongsToDomain(name, base) {
  const flat = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (flat.startsWith(base)) return true;
  const initials = name.split(/[\s&,.\-/]+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0].toLowerCase()).join('');
  return initials.length >= 3 && (initials === base || initials.startsWith(base) || base.startsWith(initials));
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
  const contactPerson = (!fromPerson || GENERIC_SENDER.test(fromPerson) ? signatureName(raw) : '') || fromPerson || label(['Contact Person', 'Contact', 'Attn']);
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
  // A labelled port that isn't a known port name ("Nearest suitable seaport to
  // … Zhongshan City, Guangdong") is kept as written for the rep, rather than
  // guessing a port from elsewhere in the email.
  const asWritten = (text) => ({ name: text.replace(/\s+/g, ' ').slice(0, 120), code: '' });
  if (polText && !polInfo) polInfo = asWritten(polText);
  if (podText && !podInfo) podInfo = asWritten(podText);
  if (!polInfo || !podInfo) {
    const route = raw.match(/\b(?:from|ex)\s+([A-Za-z][A-Za-z .\/]{2,30}?)\s+(?:to|for)\s+([A-Za-z][A-Za-z .\/]{2,30}?)(?=\s*(?:port|[,.;()\n]|$))/i);
    if (route) {
      polInfo ||= portFromLabel(route[1]);
      podInfo ||= portFromLabel(route[2]);
    }
  }
  // "Ningbo to Nhava Sheva", "Mundra - Jebel Ali", "Shanghai ➔ Chennai" without
  // "from": two known ports joined by to / → / -.
  if (!polInfo || !podInfo) {
    for (const m of raw.matchAll(/([A-Za-z][A-Za-z .]{1,30}?)\s*(?:\bto\b|-+>|➔|→|–|\s-\s)\s*([A-Za-z][A-Za-z .]{1,30})/gi)) {
      const from = findPortAtEnd(m[1]);
      const to = findPort(m[2].slice(0, 25));
      if (from && to && from.code !== to.code) {
        polInfo ||= { name: from.name, code: from.code };
        podInfo ||= { name: to.name, code: to.code };
        break;
      }
    }
  }
  // Without labels, assume an export (India -> abroad) unless the email talks about imports.
  const importHint = /\bimports?\b/i.test(raw) && !/\bexports?\b/i.test(raw);
  if (!polInfo) { const p = findPort(raw, importHint ? "abroad" : "India"); if (p) polInfo = { name: p.name, code: p.code }; }
  if (!podInfo) { const p = findPort(raw, importHint ? "India" : "abroad"); if (p) podInfo = { name: p.name, code: p.code }; }
  // No real port of loading ("NEAREST", "nearest seaport to … Zhongshan", or none):
  // suggest one from the pickup address, or from the place in the POL line.
  let polSuggested = '';
  if (!polInfo?.code) {
    const hint = suggestPortFromPlace(labelBlock(raw, PICKUP_LABELS)) || suggestPortFromPlace(polText) || suggestPortFromPlace(polInfo?.name);
    if (hint) {
      polInfo = { name: hint.port.name, code: hint.port.code };
      polSuggested = `${hint.place} → ${hint.port.name}`;
    }
  }
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

  // "2.9 CBM" or a labelled line "CBM: 2.9" / "Volume - 2.9".
  // A labelled line in the email ("Volume : 3.300CBM") wins over a figure in the
  // subject or a sentence ("… 3.330CBM").
  // One shipment can be several package groups ("3 pallets 2.4 CBM", "4 pallets
  // 4.2 CBM") with a "Total: 6.6 CBM" line: the total wins, else the groups add up.
  const groups = cargoGroups(raw);
  const totals = cargoTotals(raw);
  const volume = raw.match(/^[\s>*•-]*(?:total\s+)?(?:cbm|volume|vol\.?|measurement)\s*(?:\(\s*cbm\s*\))?\s*[:\-–]\s*([0-9][0-9,]*(?:\.[0-9]+)?)/im);
  const inlineVolume = raw.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:cbm|m3|cubic\s*met(?:er|re)s?)\b/i);
  const groupCbm = groups.length > 1 && groups.every(g => g.cbm) ? Math.round(groups.reduce((s, g) => s + g.cbm, 0) * 1000) / 1000 : 0;
  let volumeCbm = volume ? parseFloat(volume[1].replace(/,/g, ''))
    : totals.cbm || groupCbm || (inlineVolume ? parseFloat(inlineVolume[1].replace(/,/g, '')) : 0);

  // A volume in CBM with no container named means the cargo goes LCL.
  if (!containerType && volumeCbm > 0) {
    routingMode = "Ocean LCL";
    containerType = "LCL";
  }

  // Commodity: labelled lines only, so headings like "COMMODITY & CARGO PARTICULARS:" don't match.
  const commodity = label([
    'Commodity(?:\\s+Description)?', 'Cargo Description', 'Description of Goods', 'Goods Description', 'Product Description',
    'Nature of (?:Goods|Cargo)', 'Item Description', 'Description', 'Desc\\.?', 'Goods', 'Products?', 'Items?', 'Material', 'Cargo(?:\\s+Details)?',
  ])
    // Or written inside a sentence: "Please quote as per subject. Commodity: LED lights. Ex works …"
    || (raw.match(/\b(?:commodity|description of goods|goods description)\s*[:\-–]\s*([^.\n;]{2,80})/i) || [])[1]?.trim()
    // "Cargo is Tiles." (but not "Cargo is ready on …" / "cargo is stackable")
    || (raw.match(/\b(?:cargo|commodity|goods|material)\s+(?:is|are)\s+(?!(?:ready|stackable|non|not|available|being|under|in|at|on|to|of|for|the|a|an)\b)([A-Za-z][^.\n;]{1,60})/i) || [])[1]?.trim()
    || '';
  const commodityClean = commodity
    .replace(/^(?:description|details|desc\.?)\s*[:\-–]\s*/i, '')
    // The HSN code goes in its own field, so take it (and stray "*") out of the description.
    .replace(/\s*[([]\s*(?:HSN|H\.?S\.?)(?=[\s#:.\-–/]|code|no)[^)\]]*[)\]]/i, ' ')
    .replace(new RegExp(`\\s*[-–,;/]?\\s*${HSN_RE.source}`, 'i'), ' ')
    .replace(/[\s*]+$/, '')
    .trim();

  // First mention wins: in a pasted thread the newest message (e.g. "please quote on
  // ex-works basis only") comes before the older text it corrects.
  // Codes must be capitals (so "dap fertiliser" isn't DAP); "Ex works" may be any case.
  const incoMatches = [
    raw.match(/\b(FOB|CIF|CFR|CNF|C&F|EXW|FCA|DDP|DAP|CPT|CIP)\b/),
    raw.match(/\b(ex[\s-]?works?)\b/i),
  ].filter(Boolean).sort((a, b) => a.index - b.index);
  const inco = incoMatches[0];
  // Just the term ("FOB"), not the place after it ("FOB Yokohama"); the ports are their own fields.
  const incoterms = inco ? (/^EX/i.test(inco[1]) ? 'EXW' : /^C&F$/i.test(inco[1]) ? 'CFR' : inco[1].toUpperCase()) : '';

  // Cargo details import inquiries usually give.
  const hsn = raw.match(HSN_RE);
  let packages = packagesFrom(raw, label);
  let dimensions = dimensionsFrom(raw);
  if (groups.length > 1) {
    // "3 pallets + 4 pallets = 7 pallets", and each group's size and CBM.
    const kinds = [...new Set(groups.map(g => g.kind))];
    const unit = kinds.length === 1 ? kinds[0] : 'packages';
    const totalCount = totals.count || groups.reduce((s, g) => s + g.count, 0);
    packages = `${groups.map(g => `${g.count} ${g.kind}`).join(' + ')} = ${totalCount} ${unit}`;
    if (groups.some(g => g.dims)) {
      dimensions = groups.map(g => `${g.dims || 'size not given'} × ${g.count} ${g.kind}${g.cbm ? ` (${g.cbm} CBM)` : ''}`).join('; ');
    }
  } else if (totals.count && !packages) {
    packages = `${totals.count} ${totals.kind}`;
  }
  // No CBM in the email: work it out from the dimensions (× number of packages).
  let volumeCbmCalculated = false;
  if (!(volumeCbm > 0)) {
    const calc = cbmFromDimensions(dimensions, packages);
    if (calc > 0) {
      volumeCbm = calc;
      volumeCbmCalculated = true;
      if (!containerType) { routingMode = 'Ocean LCL'; containerType = 'LCL'; }
    }
  }
  const pickupAddress = labelBlock(raw, PICKUP_LABELS);
  // No terms in the email: a pickup address means ex-works, otherwise FOB.
  const incotermsAssumed = incoterms ? '' : pickupAddress ? 'EXW' : 'FOB';
  const customerAddress = customerAddressFrom(raw);

  const freeDays = raw.match(/(\d{1,3})\s*days?\s*(?:of\s*)?(?:free|combined|detention|demurrage|det\b|dem\b)|free\s*(?:time|days)[^0-9\n]{0,25}(\d{1,3})/i);
  const ready = label(['Cargo Readiness Date', 'Cargo Ready Date', 'Cargo Readiness', 'Ready Date', 'Readiness']);

  return {
    shipperName,
    // No name anywhere in the email (e.g. a shared inbox): show the address instead.
    contactPerson: contactPerson || headers.fromEmail,
    contactEmail: headers.fromEmail,
    contactPhone: phone ? phone[1].trim() : '',
    gstin: gst ? gst[1].toUpperCase() : '',
    pol: polInfo?.name || '',
    polCode: polInfo?.code || '',
    polSuggested,
    pod: podInfo?.name || '',
    podCode: podInfo?.code || '',
    direction,
    routingMode,
    containerType,
    containerCount,
    packages,
    hsnCode: hsn ? hsn[1].replace(/[ .]/g, '') : '',
    dimensions,
    pickupAddress,
    customerAddress,
    commodity: commodityClean,
    grossWeightKg,
    volumeCbm,
    volumeCbmCalculated,
    incoterms: incoterms || incotermsAssumed,
    incotermsAssumed: Boolean(incotermsAssumed),
    cargoReadyDate: ready,
    freeDaysRequested: freeDays ? `${freeDays[1] || freeDays[2]} days` : '',
    specialRequirements: [
      /\bhaz(?:ardous)?\b|\bimo\b|\bdg cargo\b|\bun\s?\d{4}\b/i.test(raw) && 'Hazardous cargo mentioned',
      /pick[\s-]?up address|factory address|door pick[\s-]?up|pick[\s-]?up from|origin pick[\s-]?up/i.test(raw) && 'Pickup from supplier needed',
      /charges?\s+separately|separate(?:ly)?\s+(?:origin|destination|local)|origin,?\s*destination,?\s*(?:and\s+)?cfs|(?:all[\s-]?inclusive|charges?)\s+break[\s-]?up|break[\s-]?down/i.test(raw) && 'Show origin, destination and CFS charges separately',
      /export customs clearance|customs clearance at origin|origin clearance/i.test(raw) && 'Include export customs clearance at origin',
      // The quote then just says "Destination charges: As agreed".
      /\b(?:destination|dest\.?|local)\s+charges?\b[^.\n]{0,25}?\b(?:as\s+(?:per\s+)?agreed|as\s+per\s+(?:our\s+)?(?:agreement|contract|tariff))|\bDC\s+as\s+agreed\b/i.test(raw) && DEST_AGREED_NOTE,
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

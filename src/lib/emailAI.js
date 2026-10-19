// Browser side of the AI email reader: prepares the pasted content, calls
// /api/analyze-email, and turns the result into inquiry records.

import { supabase } from './supabase';

const REF_RE = /INQ-\d{4}-\d{4,6}/i;
const MAX_IMAGE_SIDE = 2000;
const MAX_PDF_BYTES = 3.5 * 1024 * 1024; // keeps the request under Vercel's 4.5 MB body limit

export class EmailAIError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Screenshots are scaled down and re-encoded as JPEG so they upload quickly.
async function imageToPayload(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new EmailAIError('That image could not be opened.', 'bad_file'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { mediaType: 'image/jpeg', data: dataUrl.split(',')[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToPayload(file) {
  if (!file) return null;
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new EmailAIError('That PDF is too large (max 3.5 MB). Paste the email text instead.', 'too_large');
    const dataUrl = await readAsDataUrl(file);
    return { mediaType: 'application/pdf', data: dataUrl.split(',')[1] };
  }
  if (file.type.startsWith('image/')) return imageToPayload(file);
  throw new EmailAIError('Only screenshots (images) and PDFs can be attached.', 'bad_file');
}

export function findRefTag(text) {
  return (text || '').match(REF_RE)?.[0]?.toUpperCase() || '';
}

// Compact list the AI uses to match replies and nominations to existing inquiries.
export function openInquiriesForMatching(inquiries) {
  const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
  return inquiries
    .filter(i => i.status !== 'CLOSED_LOST' && (!i.receivedAt || Date.parse(i.receivedAt) > cutoff))
    .slice(0, 200)
    .map(i => ({
      id: i.id,
      status: i.status,
      shipper: i.shipperName,
      contact: i.contactPerson,
      email: i.contactEmail,
      subject: i.emailSubject || '',
      route: `${i.polCode || i.pol || ''} -> ${i.podCode || i.pod || ''}`,
      equipment: i.containerType,
      quoted: i.quotedRate || '',
      received: i.receivedAt,
    }));
}

export async function analyzeEmailWithAI({ text, file, inquiries }) {
  const payload = {
    text: text || '',
    file: file ? await fileToPayload(file) : null,
    openInquiries: openInquiriesForMatching(inquiries),
    refHint: findRefTag(text),
    today: new Date().toString(),
  };

  // The server only accepts signed-in reps when logins are set up.
  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  let res;
  try {
    res = await fetch('/api/analyze-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new EmailAIError('Could not reach the server. Check your connection.', 'network');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    // A 404 means the API route isn't running (e.g. a static preview without functions).
    const code = data?.code || (res.status === 404 ? 'not_configured' : 'server_error');
    throw new EmailAIError(data?.error || `Server error (${res.status})`, code);
  }
  if (!data?.result) throw new EmailAIError('Empty response from the server.', 'bad_output');
  return data.result;
}

export function newInquiryId(existing) {
  const year = new Date().getFullYear();
  const taken = new Set(existing.map(i => i.id));
  let id;
  do {
    id = `INQ-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (taken.has(id));
  return id;
}

function validIso(value) {
  const t = Date.parse(value || '');
  return isNaN(t) ? null : new Date(t).toISOString();
}

export function emailTime(result) {
  return validIso(result?.email?.sentAt) || new Date().toISOString();
}

// AI result -> a new inquiry record (same shape the rest of the app uses).
export function resultToInquiry(result, { existing, currentUser, rawText, screenshotUrl }) {
  const s = result.shipment;
  const at = emailTime(result);
  const rep = currentUser?.name ? `${currentUser.name} (${currentUser.role || 'CS Desk'})` : '';
  return {
    id: newInquiryId(existing),
    receivedAt: at,
    awaitingSince: at,
    shipperName: s.shipperName || result.email.fromName || '',
    contactPerson: s.contactPerson || result.email.fromName || '',
    contactEmail: s.contactEmail || result.email.fromEmail || '',
    contactPhone: s.contactPhone,
    gstin: s.gstin,
    pol: s.pol,
    polCode: s.polCode,
    pod: s.pod,
    podCode: s.podCode,
    direction: s.direction || '',
    routingMode: s.routingMode === 'Unknown' ? '' : s.routingMode,
    containerType: s.containerType,
    packages: s.packages || '',
    hsnCode: s.hsnCode || '',
    dimensions: s.dimensions || '',
    pickupAddress: s.pickupAddress || '',
    commodity: s.commodity,
    grossWeightKg: Number(s.grossWeightKg) || 0,
    volumeCbm: Number(s.volumeCbm) || 0,
    incoterms: s.incoterms,
    freeDaysAtPod: s.freeDaysRequested,
    cargoReadyDate: s.cargoReadyDate,
    specialRequirements: s.specialRequirements,
    emailSubject: result.email.subject,
    urgency: s.urgent ? 'HIGH' : 'NORMAL',
    missingDetails: result.missingDetails,
    status: 'INQUIRY_RECEIVED',
    isQuoted: false,
    hasReplied: false,
    assignedTo: rep,
    conversationGist: result.summary,
    rawEmailSnippet: rawText ? rawText.slice(0, 500) : '',
    screenshotUrl: screenshotUrl || null,
    auditLog: [{ timestamp: new Date().toISOString(), action: `Logged from email: ${result.summary}`, by: currentUser?.name || 'CS Desk' }],
  };
}

export function withSignature(body, currentUser) {
  const signature = [currentUser?.name, currentUser?.role, 'Polestar Consolidators & Freight Forwarders Pvt Ltd'].filter(Boolean).join('\n');
  return (body || '').replace('{{SIGNATURE}}', signature);
}

export const LOST_REASONS = {
  price: 'Price',
  transit_time: 'Transit time',
  carrier_or_schedule: 'Carrier / schedule',
  no_space: 'No space',
  went_with_competitor: 'Went with another forwarder',
  postponed: 'Shipment postponed',
  other: 'Other',
};

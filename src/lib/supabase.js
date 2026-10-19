import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl.startsWith('http')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper: Convert Database snake_case to UI camelCase
export function mapRowToInquiry(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    receivedAt: row.received_at,
    shipperName: row.shipper_name,
    gstin: row.gstin,
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    pol: row.pol,
    pod: row.pod,
    polCode: row.pol_code,
    podCode: row.pod_code,
    containerType: row.container_type,
    routingMode: row.routing_mode,
    commodity: row.commodity,
    grossWeightKg: Number(row.gross_weight_kg) || 0,
    volumeCbm: Number(row.volume_cbm) || 0,
    incoterms: row.incoterms,
    freeDaysAtPod: row.free_days_at_pod,
    preferredCarrier: row.preferred_carrier,
    isQuoted: Boolean(row.is_quoted),
    hasReplied: Boolean(row.has_replied),
    status: row.status,
    quotedRate: row.quoted_rate,
    quotedCurrency: row.quoted_currency,
    quotedAmountTotal: Number(row.quoted_amount_total) || 0,
    quoteValidity: row.quote_validity,
    assignedTo: row.assigned_to,
    conversationGist: row.conversation_gist,
    screenshotUrl: row.screenshot_url,
    emailSubject: row.email_subject,
    repliedAt: row.replied_at,
    responseTatMinutes: row.response_tat_minutes,
    confirmedAt: row.confirmed_at,
    nomination: row.nomination || null,
    awaitingSince: row.awaiting_since,
    lostReason: row.lost_reason,
    lostNote: row.lost_note,
    followUps: row.follow_ups || [],
    direction: row.direction || '',
    packages: row.packages || '',
    hsnCode: row.hsn_code || '',
    dimensions: row.dimensions || '',
    pickupAddress: row.pickup_address || '',
    cargoReadyDate: row.cargo_ready_date || '',
    specialRequirements: row.special_requirements || '',
    urgency: row.urgency || 'NORMAL',
    rawEmailSnippet: row.raw_email_snippet || '',
    auditLog: row.audit_log || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Helper: Convert UI camelCase to Database snake_case
export function mapInquiryToRow(inquiry) {
  return {
    id: inquiry.id,
    received_at: inquiry.receivedAt || new Date().toISOString(),
    shipper_name: inquiry.shipperName || 'Unknown Shipper',
    gstin: inquiry.gstin || null,
    contact_person: inquiry.contactPerson || null,
    contact_phone: inquiry.contactPhone || null,
    contact_email: inquiry.contactEmail || null,
    pol: inquiry.pol || 'Mundra Port',
    pod: inquiry.pod || 'Jebel Ali',
    pol_code: inquiry.polCode || null,
    pod_code: inquiry.podCode || null,
    container_type: inquiry.containerType || "40' HC",
    routing_mode: inquiry.routingMode || 'Ocean FCL',
    commodity: inquiry.commodity || null,
    gross_weight_kg: Number(inquiry.grossWeightKg) || 0,
    volume_cbm: Number(inquiry.volumeCbm) || 0,
    incoterms: inquiry.incoterms || 'FOB',
    free_days_at_pod: inquiry.freeDaysAtPod || '14 Days',
    preferred_carrier: inquiry.preferredCarrier || null,
    is_quoted: Boolean(inquiry.isQuoted),
    has_replied: Boolean(inquiry.hasReplied),
    status: inquiry.status || 'INQUIRY_RECEIVED',
    quoted_rate: inquiry.quotedRate || null,
    quoted_currency: inquiry.quotedCurrency || 'USD',
    quoted_amount_total: Number(inquiry.quotedAmountTotal) || 0,
    quote_validity: inquiry.quoteValidity || null,
    assigned_to: inquiry.assignedTo || null,
    conversation_gist: inquiry.conversationGist || null,
    screenshot_url: inquiry.screenshotUrl || null,
    email_subject: inquiry.emailSubject || null,
    replied_at: inquiry.repliedAt || null,
    response_tat_minutes: inquiry.responseTatMinutes ?? null,
    confirmed_at: inquiry.confirmedAt || null,
    nomination: inquiry.nomination || null,
    awaiting_since: inquiry.awaitingSince || null,
    lost_reason: inquiry.lostReason || null,
    lost_note: inquiry.lostNote || null,
    follow_ups: inquiry.followUps || [],
    direction: inquiry.direction || null,
    packages: inquiry.packages || null,
    hsn_code: inquiry.hsnCode || null,
    dimensions: inquiry.dimensions || null,
    pickup_address: inquiry.pickupAddress || null,
    cargo_ready_date: inquiry.cargoReadyDate || null,
    special_requirements: inquiry.specialRequirements || null,
    urgency: inquiry.urgency || 'NORMAL',
    raw_email_snippet: inquiry.rawEmailSnippet || null,
    audit_log: inquiry.auditLog || []
  };
}

// ----------------------------------------------------------------------
// CRUD Operations with Supabase
// ----------------------------------------------------------------------

// Only this rep's own inquiries (managers can read everyone's, but their
// workspace still shows just their own).
export async function fetchInquiriesDb(ownerId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('owner_id', ownerId)
      .order('received_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, fallback to local storage:', error.message);
      return null;
    }

    return (data || []).map(mapRowToInquiry);
  } catch (err) {
    console.warn('Supabase connection failed:', err);
    return null;
  }
}

export async function createInquiryDb(inquiry) {
  if (!supabase) return false;

  try {
    const row = mapInquiryToRow(inquiry);
    const { error } = await supabase
      .from('inquiries')
      .insert([row]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase create error:', err);
    return false;
  }
}

// Insert or update by id. Safe to retry, so queued saves use it.
// Each rep owns their rows (owner_id); the database only lets them touch their own.
export async function upsertInquiryDb(inquiry) {
  if (!supabase) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { error } = await supabase
      .from('inquiries')
      .upsert([{ ...mapInquiryToRow(inquiry), owner_id: session.user.id }], { onConflict: 'owner_id,id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsert error:', err);
    return false;
  }
}

export async function updateInquiryDb(id, updates) {
  if (!supabase) return false;

  try {
    const row = mapInquiryToRow(updates);
    const { error } = await supabase
      .from('inquiries')
      .update(row)
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase update error:', err);
    return false;
  }
}

export async function deleteInquiryDb(id) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete error:', err);
    return false;
  }
}

export async function clearAllInquiriesDb() {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .neq('id', 'EMPTY_SENTINEL');

    if (error) {
      console.error('Supabase clear error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase clear error:', err);
    return false;
  }
}

// POST /api/analyze-email
// Body: { text?, file?: { mediaType, data(base64) }, openInquiries: [], refHint?, today }
// The Anthropic key stays on the server (ANTHROPIC_API_KEY); it is never sent to the browser.
import { createClient } from '@supabase/supabase-js';
import { analyzeEmail, AnalysisError } from './_lib/analyzeEmail.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const authEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('your-project-id'));
const authClient = authEnabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;

// With logins set up, only a signed-in rep may use the AI (it costs money per call).
async function isSignedIn(req) {
  if (!authEnabled) return true;
  const token = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const { data, error } = await authClient.auth.getUser(token);
  return !error && Boolean(data?.user);
}

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await isSignedIn(req))) {
    return res.status(401).json({ error: 'Please sign in again.', code: 'unauthorized' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI reading is not set up yet (ANTHROPIC_API_KEY is missing).', code: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body', code: 'bad_request' });
    }
  }

  const { text = '', file = null, openInquiries = [], refHint = '', today } = body || {};
  if (typeof text !== 'string' || (!text.trim() && !file?.data)) {
    return res.status(400).json({ error: 'Paste an email or attach a screenshot/PDF.', code: 'bad_request' });
  }
  if (text.length > 100000) {
    return res.status(413).json({ error: 'That email is too long. Paste only the relevant thread.', code: 'too_long' });
  }
  if (file && (!ALLOWED_MEDIA.includes(file.mediaType) || typeof file.data !== 'string')) {
    return res.status(400).json({ error: 'Only images (JPG, PNG, WebP) and PDFs are supported.', code: 'bad_file' });
  }
  if (!Array.isArray(openInquiries)) {
    return res.status(400).json({ error: 'openInquiries must be a list', code: 'bad_request' });
  }

  try {
    const result = await analyzeEmail({
      text,
      file,
      openInquiries: openInquiries.slice(0, 200),
      refHint: typeof refHint === 'string' ? refHint.slice(0, 40) : '',
      today: typeof today === 'string' ? today.slice(0, 40) : new Date().toISOString(),
    });
    return res.status(200).json({ result });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    console.error('analyze-email failed', err);
    return res.status(500).json({ error: 'Something went wrong reading the email.', code: 'server_error' });
  }
}

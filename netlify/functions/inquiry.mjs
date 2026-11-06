/**
 * POST /api/inquiry — project inquiry handler (Netlify Function, Node 22).
 *
 * Validates the submission, checks spam protection (honeypot, optional
 * Cloudflare Turnstile, per-IP rate limit), then emails it to the team via
 * Resend with any photos attached.
 *
 * Environment variables (Netlify → Site configuration → Environment variables):
 *   RESEND_API_KEY        required
 *   INQUIRY_TO            default: hello@frenchlakebuild.com
 *   INQUIRY_FROM          default: French Lake Build Co. <website@frenchlakebuild.com>
 *                         (sender domain must be verified in Resend)
 *   TURNSTILE_SECRET_KEY  optional — enables Turnstile verification
 */

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 5000;

const FIELDS = [
  ['name', 'Name', true],
  ['email', 'Email', true],
  ['phone', 'Phone', true],
  ['address', 'Property address', true],
  ['project_type', 'Project type', true],
  ['square_footage', 'Approx. square footage', false],
  ['budget', 'Budget range', false],
  ['goals', 'Project goals', true],
  ['inspiration_url', 'Inspiration board', false],
  ['referral_source', 'How they heard about us', false],
];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function verifyTurnstile(token, ip, secret) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  let form;
  try {
    form = await req.formData();
  } catch {
    return json(400, { ok: false, error: 'Invalid form data' });
  }

  // Honeypot — pretend success so bots move on.
  if (String(form.get('company_website') || '').trim()) return json(200, { ok: true });

  // Turnstile (only when configured)
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const ok = await verifyTurnstile(form.get('cf-turnstile-response'), context?.ip, turnstileSecret);
    if (!ok) return json(400, { ok: false, error: 'Spam check failed' });
  }

  // Fields
  const values = {};
  for (const [key, , required] of FIELDS) {
    const v = String(form.get(key) || '').trim().slice(0, MAX_TEXT);
    if (required && !v) return json(400, { ok: false, error: `Missing ${key}` });
    values[key] = v;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) return json(400, { ok: false, error: 'Invalid email' });
  if (values.inspiration_url) {
    try {
      const u = new URL(values.inspiration_url);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return json(400, { ok: false, error: 'Invalid URL' });
    }
  }

  // Photos
  const photos = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (photos.length > MAX_FILES) return json(400, { ok: false, error: 'Too many photos' });
  const attachments = [];
  for (const f of photos) {
    if (f.size > MAX_FILE_BYTES) return json(400, { ok: false, error: 'Photo too large' });
    const isImg = (f.type || '').startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name || '');
    if (!isImg) return json(400, { ok: false, error: 'Unsupported file type' });
    const buf = Buffer.from(await f.arrayBuffer());
    const safeName = (f.name || 'photo.jpg').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    attachments.push({ filename: safeName, content: buf.toString('base64') });
  }

  // Email
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return json(500, { ok: false, error: 'Email is not configured' });
  }
  const to = process.env.INQUIRY_TO || 'hello@frenchlakebuild.com';
  const from = process.env.INQUIRY_FROM || 'French Lake Build Co. <website@frenchlakebuild.com>';
  const page = form.get('form_variant') === 'home' ? 'Home page' : 'Start a Project page';

  const rows = FIELDS.map(([key, label]) => {
    let v = values[key] || '—';
    let html = esc(v).replace(/\n/g, '<br>');
    if (key === 'email' && values.email) html = `<a href="mailto:${esc(values.email)}">${esc(values.email)}</a>`;
    if (key === 'phone' && values.phone) html = `<a href="tel:${esc(values.phone.replace(/[^\d+]/g, ''))}">${esc(values.phone)}</a>`;
    if (key === 'inspiration_url' && values.inspiration_url) html = `<a href="${esc(values.inspiration_url)}">${esc(values.inspiration_url)}</a>`;
    return { label, text: v, html };
  });

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#1E2B33;max-width:640px">
    <h2 style="font-weight:400;font-family:Georgia,serif;margin:0 0 4px">New project inquiry</h2>
    <p style="margin:0 0 20px;color:#5F676C;font-size:14px">From the ${page} · ${attachments.length} photo${attachments.length === 1 ? '' : 's'} attached</p>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:15px">
      ${rows.map((r) => `<tr><td style="padding:10px 16px 10px 0;border-top:1px solid #DDD6C9;color:#5F676C;vertical-align:top;white-space:nowrap">${esc(r.label)}</td><td style="padding:10px 0;border-top:1px solid #DDD6C9;vertical-align:top">${r.html}</td></tr>`).join('')}
    </table>
  </div>`;
  const text = `New project inquiry (${page})\n\n` + rows.map((r) => `${r.label}: ${r.text}`).join('\n') +
    `\n\nPhotos attached: ${attachments.length}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: values.email,
      subject: `New inquiry: ${values.name} — ${values.project_type}`,
      html,
      text,
      attachments,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text().catch(() => ''));
    return json(502, { ok: false, error: 'Could not send' });
  }
  return json(200, { ok: true });
};

export const config = {
  path: '/api/inquiry',
  method: 'POST',
  // Netlify's built-in rate limiting: 5 submissions per IP per minute.
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { Colors } from '../../../packages/theme/src/colors.js';
import { CONTACT_EMAIL } from '../../../packages/legal/src/types.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestTimestampsByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestTimestampsByIp.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  requestTimestampsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

const CONFIRMATION_HTML = `
<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: ${Colors.light.text};">
  <p style="font-size:13px; color:${Colors.light.textSecondary}; letter-spacing:0.06em; text-transform:uppercase; margin:0 0 12px;">epaRadar</p>
  <h1 style="font-size:22px; margin:0 0 16px;">Du är med på listan.</h1>
  <p style="font-size:15px; line-height:1.6;">
    Vi hör av oss hit så fort epaRadar går live på iOS och Android. Inget mer än så
    — inget spam, inga andra utskick under tiden.
  </p>
  <p style="font-size:15px; line-height:1.6;">
    Vill du inte längre stå med på listan? Svara på det här mejlet så tar vi bort din adress.
  </p>
  <p style="font-size:13px; color:${Colors.light.textSecondary}; margin-top:32px;">epaRadar · eparadar.se</p>
</div>
`;

const CONFIRMATION_TEXT = `Du är med på listan.

Vi hör av oss hit så fort epaRadar går live på iOS och Android. Inget mer än så — inget spam, inga andra utskick under tiden.

Vill du inte längre stå med på listan? Svara på det här mejlet så tar vi bort din adress.

epaRadar · eparadar.se`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (isRateLimited(getClientIp(req))) {
    res.status(429).json({ error: 'För många försök. Vänta en stund och försök igen.' });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Ogiltig e-postadress.' });
    return;
  }

  try {
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ email }),
    });

    if (!insertResponse.ok) {
      console.error('waitlist insert failed', insertResponse.status, await insertResponse.text());
      res.status(502).json({ error: 'Något gick fel. Försök igen om en liten stund.' });
      return;
    }

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `epaRadar <${CONTACT_EMAIL}>`,
          to: email,
          subject: 'Du är med på listan',
          html: CONFIRMATION_HTML,
          text: CONFIRMATION_TEXT,
        }),
      });

      if (!emailResponse.ok) {
        console.error('resend send failed', emailResponse.status, await emailResponse.text());
      }
    } catch (err) {
      console.error('resend send failed', err);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('waitlist handler error', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen om en liten stund.' });
  }
}

import { addToWaitlist, rateLimit } from '../../lib/db.js';
import { clientIp, json, readBody, validEmail } from '../../lib/request.js';

export async function POST({ request, clientAddress }) {
  const ip = clientIp(request, clientAddress);
  if (!rateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)) {
    return json({ error: 'slow down' }, 429);
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (body.website) return json({ ok: true });

  const email = body.email?.trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'invalid email' }, 400);

  addToWaitlist(email);
  // Dedupe silently — "you're on the list" either way, no email enumeration.
  return json({ ok: true });
}

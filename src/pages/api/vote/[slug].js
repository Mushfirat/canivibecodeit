import { getApp, allApps } from '../../../lib/apps.js';
import { addVote, rateLimit, mrrDestroyed } from '../../../lib/db.js';
import { clientIp, json } from '../../../lib/request.js';

export async function POST({ params, request, clientAddress }) {
  const app = getApp(params.slug);
  if (!app) return json({ error: 'unknown app' }, 404);

  const ip = clientIp(request, clientAddress);
  // One vote per app per IP per day, and a burst cap across all apps.
  if (
    !rateLimit(`vote:${ip}:${params.slug}`, 1, 24 * 60 * 60 * 1000) ||
    !rateLimit(`vote-burst:${ip}`, 10, 60 * 60 * 1000)
  ) {
    return json({ error: 'already counted' }, 429);
  }

  const count = addVote(params.slug);
  return json({ count, mrr: mrrDestroyed(allApps()) });
}

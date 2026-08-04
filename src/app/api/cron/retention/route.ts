import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { isDbConfigured, ensureSchema, pruneExpiredData } from '@/lib/db';

/**
 * M1.2 - the mechanism behind the privacy policy's retention promises.
 *
 * Section 3 says enquiries are deleted after 24 months and section 7 says the rate-limit
 * hash is deleted once its window has passed. A promise nothing enforces is simply a false
 * statement on a legal page, so this route exists and runs daily (vercel.json `crons`).
 *
 * Authorisation is checked before anything else and fails closed: no CRON_SECRET in the
 * environment means 503, never "allow". Nothing here is cached and nothing is logged but
 * counts - an audit trail must not become a copy of what it deleted.
 */
export const dynamic = 'force-dynamic';

function isAuthorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'no_database' }, { status: 503 });
  }

  const startedAt = Date.now();
  try {
    await ensureSchema();
    const { leadsDeleted, hashesPruned } = await pruneExpiredData();
    const result = { leadsDeleted, hashesPruned, ms: Date.now() - startedAt };
    console.log('[retention]', JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error('[retention] failed');
    return NextResponse.json({ error: 'prune_failed' }, { status: 500 });
  }
}

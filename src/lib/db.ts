/**
 * Neon client and the lead store (M1).
 *
 * Two rules this file exists to keep:
 *
 * 1. LAZY INIT. `neon()` at module scope throws when DATABASE_URL is absent, which happens
 *    during `next build` and in any clone without the env. Nothing here touches the driver
 *    until a call actually needs it, so the site builds and runs with no database at all -
 *    the form falls back to its webhook, the admin panels simply do not render.
 * 2. THE PRIVACY PAGE IS A CONTRACT. Section 3 promises deletion after 24 months and
 *    section 7 promises the rate-limit IP hash is kept briefly, salted, and never beside
 *    the message. Both are enforced here, in code, not in intent: `leads` has no ip_hash
 *    column, hashes live in their own window-pruned table, and `pruneExpiredData()` is
 *    called from a daily cron AND opportunistically on insert.
 */
import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

export type LeadStatus = 'new' | 'reviewed' | 'contacted' | 'quoted' | 'won' | 'lost';

export interface LeadInput {
  name?: string | null;
  email: string;
  phone?: string | null;
  message?: string | null;
  locale?: string | null;
  interest?: string | null;
  sourceForm?: 'contact' | 'chat' | 'service_page';
  sourcePath?: string | null;
  /** M5 fields. Columns exist from M1 but stay NULL until src/lib/attribution.ts does. */
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  firstTouchPath?: string | null;
}

export interface Lead extends Record<string, unknown> {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  locale: string | null;
  interest: string | null;
  source_form: string | null;
  source_path: string | null;
  status: LeadStatus;
  internal_notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

/** Leads are deleted 24 months after they arrive. Privacy policy, section 3. */
export const LEAD_RETENTION = '24 months';
/** The rate-limit hash window. Privacy policy, section 7 - "deleted once the window has passed". */
export const RATE_LIMIT_RETENTION = '24 hours';

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

type SqlClient = ReturnType<typeof neon>;
let client: SqlClient | null = null;

function getSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  client ??= neon(url);
  return client;
}

let schemaReady: Promise<void> | null = null;

/**
 * CREATE IF NOT EXISTS on every path that writes. Cheap, idempotent, and it means no
 * migration step has to be remembered before the first submission of a fresh database.
 */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id                SERIAL PRIMARY KEY,
        name              text,
        email             text NOT NULL,
        phone             text,
        message           text,
        locale            varchar(5),
        interest          varchar(50),
        source_form       varchar(50),
        source_path       text,
        referrer_host     text,
        utm_source        text,
        utm_medium        text,
        utm_campaign      text,
        first_touch_path  text,
        status            varchar(30) NOT NULL DEFAULT 'new',
        priority          varchar(20),
        internal_notes    text,
        last_contacted_at timestamptz,
        consent_at        timestamptz,
        unsubscribed_at   timestamptz,
        created_at        timestamptz NOT NULL DEFAULT now()
      )
    `;
    // CREATE TABLE IF NOT EXISTS does NOT reconcile a table that already exists with a
    // different shape - it succeeds and changes nothing, and the first INSERT then fails
    // on a missing column. That is not hypothetical: this database already carried a
    // partial `leads` table from an earlier attempt, and the acceptance test hit exactly
    // that. Every column is therefore added idempotently as well as declared above.
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS message text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS locale varchar(5)`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS interest varchar(50)`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_form varchar(50)`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_path text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_host text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_touch_path text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'new'`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority varchar(20)`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes text`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_at timestamptz`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
    await sql`CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at)`;

    // Deliberately a separate table, not an ip_hash column on leads: on the lead row the
    // hash would survive the full 24-month retention and sit literally beside the message,
    // which is the opposite of what section 7 of the privacy policy says.
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limit_hits (
        id         SERIAL PRIMARY KEY,
        scope      varchar(30) NOT NULL,
        ip_hash    char(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE rate_limit_hits ADD COLUMN IF NOT EXISTS scope varchar(30) NOT NULL DEFAULT 'chat'`;
    await sql`ALTER TABLE rate_limit_hits ADD COLUMN IF NOT EXISTS ip_hash char(64)`;
    await sql`ALTER TABLE rate_limit_hits ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
    await sql`CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup_idx ON rate_limit_hits (scope, ip_hash, created_at)`;
  })();

  return schemaReady;
}

/**
 * sha256(ip | ua | day | SALT). Salted because IPv4 is a 2^32 space: an unsalted SHA-256
 * of an address is brute-forceable in seconds, so the policy's "cannot be reversed" would
 * be false. The day component means the same visitor hashes differently tomorrow.
 */
export function hashIp(ip: string, userAgent = '') {
  const salt = process.env.PAGEVIEW_SALT ?? process.env.CRON_SECRET ?? '';
  const day = Math.floor(Date.now() / 86_400_000);
  return createHash('sha256').update(`${ip}|${userAgent}|${day}|${salt}`).digest('hex');
}

/**
 * Deletes everything past its promised window. Returns counts only - never content - so
 * the runs can be audited in the logs without the log becoming a copy of what was deleted.
 */
export async function pruneExpiredData() {
  const sql = getSql();
  // `sql` returns a union type (rows or a full result object) depending on options, so the
  // row shape is asserted at each call site rather than trusted from the driver's default.
  const leads = (await sql`
    DELETE FROM leads
    WHERE created_at < now() - ${LEAD_RETENTION}::interval
    RETURNING id
  `) as { id: number }[];
  const hashes = (await sql`
    DELETE FROM rate_limit_hits
    WHERE created_at < now() - ${RATE_LIMIT_RETENTION}::interval
    RETURNING id
  `) as { id: number }[];
  return { leadsDeleted: leads.length, hashesPruned: hashes.length };
}

/** Derived from the page the form was submitted from (plan M1, `interest`). */
export function interestFromPath(path?: string | null): string {
  if (!path) return 'other';
  const p = path.toLowerCase();
  if (/(next|react|web-?app|website|אתר)/.test(p)) return 'nextjs';
  if (/(ai|בינה|gpt|llm|chat)/.test(p)) return 'ai';
  if (/(automat|אוטומ|workflow|integration)/.test(p)) return 'automation';
  if (/(seo|growth|marketing|קידום)/.test(p)) return 'growth';
  return 'other';
}

/**
 * The notifier hook. M7's Telegram channel was cancelled - leads are reviewed in the admin
 * dashboard - so this does nothing on purpose. It exists so that adding an email
 * notification later is one file, not a re-reading of the write path. Anything wired here
 * becomes a processor and must be added to section 7 of the privacy policy in the same PR.
 */
async function notifyNewLead(_lead: { id: number; email: string }) {
  return;
}

export async function insertLead(input: LeadInput) {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO leads (
      name, email, phone, message, locale, interest, source_form, source_path,
      referrer_host, utm_source, utm_medium, utm_campaign, first_touch_path, consent_at
    ) VALUES (
      ${input.name ?? null}, ${input.email}, ${input.phone ?? null}, ${input.message ?? null},
      ${input.locale ?? null}, ${input.interest ?? interestFromPath(input.sourcePath)},
      ${input.sourceForm ?? 'contact'}, ${input.sourcePath ?? null},
      ${input.referrerHost ?? null}, ${input.utmSource ?? null}, ${input.utmMedium ?? null},
      ${input.utmCampaign ?? null}, ${input.firstTouchPath ?? null}, now()
    )
    RETURNING id, email
  `) as { id: number; email: string }[];

  const lead = rows[0];

  // Belt and braces for the 24-month promise: if the cron is ever disabled, expiry is
  // still enforced by ordinary traffic. Best-effort - a failed prune must never lose a
  // lead that was already written.
  try {
    await pruneExpiredData();
  } catch {
    // Intentionally silent: the lead is saved, and the cron will catch up.
  }

  await notifyNewLead(lead);
  return lead;
}

export async function getLeads(limit = 200): Promise<Lead[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`
    SELECT * FROM leads ORDER BY created_at DESC LIMIT ${limit}
  `) as Lead[];
}

export async function getLeadStats() {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      count(*)::int                                                        AS total,
      count(*) FILTER (WHERE status = 'new')::int                          AS new,
      count(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS last_7_days,
      count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS last_30_days
    FROM leads
  `) as { total: number; new: number; last_7_days: number; last_30_days: number }[];
  return rows[0];
}

export async function updateLeadManagement(
  id: number,
  patch: { status?: LeadStatus; notes?: string | null; markContacted?: boolean }
) {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    UPDATE leads SET
      status            = COALESCE(${patch.status ?? null}, status),
      internal_notes    = COALESCE(${patch.notes ?? null}, internal_notes),
      last_contacted_at = CASE WHEN ${patch.markContacted ?? false} THEN now() ELSE last_contacted_at END
    WHERE id = ${id}
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

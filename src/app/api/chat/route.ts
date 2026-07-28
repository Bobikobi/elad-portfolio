import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are the personal assistant on Elad Saadon's portfolio website. Your role is consultative: first understand what the visitor actually needs, then show honestly how Elad can help — never over-promise, never invent.

═══ WHO IS ELAD ═══
Elad Saadon is a self-taught full-stack developer from Israel with a B.A. in Social Work. He builds real, working products — web apps, AI-powered tools, automation systems, and desktop apps. He is passionate, detail-oriented, and honest about what he can and cannot deliver.

Stack: Next.js, React, TypeScript, Tailwind CSS, Node.js, Supabase, PostgreSQL, Python, Electron, Puppeteer, Google Gemini AI, Vercel, GCP, Docker.

═══ REAL PROJECTS (use these as social proof when relevant) ═══
1. OpenClaw — autonomous multi-AI-node system running on VPS + GCP + Oracle Cloud with 11+ microservices and an algorithmic trading lab (Freqtrade). Shows ability to architect complex distributed systems.
2. AI Visual Web Scraper — Electron desktop app with AI-powered data extraction and automatic Google Sheets sync. Shows ability to build polished desktop tools.
3. AI Style App — private fashion AI platform with skin-tone analysis and style quizzes. Shows work in non-web AI applications.
4. Political Compass IL — live Israeli political compass with Bayesian scoring: https://political-compass-il.vercel.app
5. Netanya Emergency Teams — live municipal emergency management system: https://netanya-civil.vercel.app/emergency
6. Honey Shor Portfolio — motivational speaker website with SEO and full accessibility: https://honey-site-seven.vercel.app
7. Accessibility Widget — production React component, 3 languages (he/en/ru), localStorage state.
8. This Portfolio — Next.js 16 + Tailwind v4 + Framer Motion, multilingual (he/en/ru).

═══ CONTACT ═══
Email: eladeladsaa@gmail.com
WhatsApp: Available after initial qualification via email/chat
GitHub: https://github.com/Bobikobi
LinkedIn: https://www.linkedin.com/in/elad-saadon-184809281/

═══ CONVERSATION STRATEGY ═══
Read the visitor's intent before responding:

• CURIOSITY ("how does this work?", "what do you do?", "tell me about X"):
  → Give a concise, clear answer. Offer one relevant project as proof. Ask ONE question to understand what they're looking for.

• HESITATION ("is this expensive?", "I'm not sure I need this", "seems complex"):
  → Validate first — acknowledge the concern is legitimate.
  → Address it honestly without making promises.
  → Example: "That's a fair concern. Pricing depends on project scope, so it's better to chat with Elad directly — he won't commit to things he can't deliver."

• READINESS ("I need a website", "can you build X?", "how do I hire you?"):
  → Ask 1-2 focused questions about their specific need.
  → Connect it to the most relevant project from the list above.
  → Guide them to contact Elad via WhatsApp or email for a real conversation.

Give value first — share a relevant insight or project example before asking anything.
Mirror the visitor's tone (casual vs. formal, technical vs. simple).

═══ HARD GUARDRAILS — never break these ═══
- NEVER quote prices, timelines, or delivery estimates — always direct to Elad for specifics
- NEVER guarantee business outcomes (ROI, conversion rates, revenue growth, "guaranteed success")
- NEVER claim skills or technologies not in the stack above
- NEVER invent projects, clients, or testimonials beyond what is listed
- NEVER send more than 2 questions in a single message
- If you don't know something: say "I don't have that detail — best to ask Elad directly"
- The goal is to start a conversation with Elad, not to close a deal on his behalf

═══ TONE ═══
Warm, honest, and direct — like a knowledgeable colleague, not a salesperson.
Elad is a young developer building real things with real passion. Represent that accurately.

Always respond in the same language as the user's message (Hebrew, English, or Russian).`;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 10;
const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const BLOCK_DURATION_MS = 5 * 60_000;
const RATE_LIMIT_WINDOW_SECONDS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type RateLimitEntry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size < 500) return;

  for (const [key, entry] of rateLimitStore.entries()) {
    const windowExpired = now - entry.windowStart > RATE_LIMIT_WINDOW_MS;
    const blockExpired = entry.blockedUntil <= now;
    if (windowExpired && blockExpired) {
      rateLimitStore.delete(key);
    }
  }
}

function getAllowedHosts() {
  const hosts = new Set<string>(['www.eladsaadon.dev', 'eladsaadon.dev', 'localhost:3000']);
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (publicUrl) {
    try {
      hosts.add(new URL(publicUrl).host);
    } catch {
      // Ignore invalid URL values in env.
    }
  }

  // A PREVIEW deployment serves from its own hostname, so a chat request made from the
  // preview's own page failed this check and every message came back 403 — the widget was
  // dead on every branch deploy, which is also the one place this project verifies things.
  // Trust the deployment's own hosts there. Production keeps the strict list above: these
  // are only added when Vercel says this is not the production environment.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    for (const h of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (h) hosts.add(h);
    }
  }

  return hosts;
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

function checkRateLimitInMemory(key: string) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  if (current.blockedUntil > now) {
    return { allowed: false, remaining: 0, resetMs: current.blockedUntil - now };
  }

  if (now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    current.count = 1;
    current.windowStart = now;
    current.blockedUntil = 0;
    rateLimitStore.set(key, current);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetMs: RATE_LIMIT_WINDOW_MS };
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    current.blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(key, current);
    return { allowed: false, remaining: 0, resetMs: BLOCK_DURATION_MS };
  }

  rateLimitStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - current.count),
    resetMs: RATE_LIMIT_WINDOW_MS - (now - current.windowStart),
  };
}

async function checkRateLimit(key: string) {
  const now = Date.now();

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    const bucket = Math.floor(now / RATE_LIMIT_WINDOW_MS);
    const redisKey = `rl:chat:${key}:${bucket}`;

    try {
      const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, RATE_LIMIT_WINDOW_SECONDS],
        ]),
        cache: 'no-store',
      });

      if (response.ok) {
        const payload = (await response.json()) as Array<{ result?: number | string }>;
        const count = Number(payload?.[0]?.result ?? 0);

        if (count > MAX_REQUESTS_PER_WINDOW) {
          return { allowed: false, remaining: 0, resetMs: RATE_LIMIT_WINDOW_MS - (now % RATE_LIMIT_WINDOW_MS) };
        }

        return {
          allowed: true,
          remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - count),
          resetMs: RATE_LIMIT_WINDOW_MS - (now % RATE_LIMIT_WINDOW_MS),
        };
      }
    } catch {
      // Fall back to in-memory limiter when Redis is unavailable.
    }
  }

  return checkRateLimitInMemory(key);
}

function validateRequestSource(req: NextRequest) {
  const allowedHosts = getAllowedHosts();
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.toLowerCase().startsWith('application/json')) {
    return false;
  }

  const matchesAllowedHost = (value: string | null) => {
    if (!value) return false;
    try {
      return allowedHosts.has(new URL(value).host);
    } catch {
      return false;
    }
  };

  return matchesAllowedHost(origin) || matchesAllowedHost(referer);
}

async function verifyTurnstileToken(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

function validateMessages(messages: unknown) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return false;
  }

  return messages.every((message) => {
    if (!message || typeof message !== 'object') return false;
    const role = (message as { role?: unknown }).role;
    const text = (message as { text?: unknown }).text;
    if (role !== 'assistant' && role !== 'user') return false;
    if (typeof text !== 'string') return false;
    const trimmed = text.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
  });
}

// --- model providers -------------------------------------------------------------------
// Server-only. The key is read from the environment and NEVER leaves this module — there
// is no client-side path to it, and no `NEXT_PUBLIC_` variant exists on purpose.
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1';
const KIMI_MODEL = process.env.KIMI_MODEL ?? 'kimi-k2-0905-preview';
const UPSTREAM_TIMEOUT_MS = 20_000;

type ChatTurn = { role?: unknown; text?: unknown };

const asText = (m: ChatTurn) => String(m.text ?? '').slice(0, MAX_MESSAGE_LENGTH);

/** Kimi (Moonshot) — OpenAI-compatible chat completions. Returns '' on any failure so
 *  the caller can answer with a single graceful error state. */
async function askKimi(messages: ChatTurn[]): Promise<string> {
  const body = {
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: asText(m) })),
    ],
    max_tokens: 400,
    temperature: 0.7,
  };
  try {
    const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const data = await res.json();
    if (!res.ok) {
      // Status + short reason only — never the payload, which can echo the prompt.
      console.error(`[chat] kimi ${res.status}`, String(data?.error?.message ?? '').slice(0, 120));
      return '';
    }
    return String(data?.choices?.[0]?.message?.content ?? '').trim();
  } catch (e) {
    console.error('[chat] kimi request failed', e instanceof Error ? e.name : 'unknown');
    return '';
  }
}

/** Gemini fallback — used only when no Kimi key is configured. */
async function askGemini(messages: ChatTurn[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: asText(m) }],
          })),
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error(`[chat] gemini ${res.status}`, String(data?.error?.message ?? '').slice(0, 120));
      return '';
    }
    return String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  } catch (e) {
    console.error('[chat] gemini request failed', e instanceof Error ? e.name : 'unknown');
    return '';
  }
}

function jsonWithRateHeaders(body: Record<string, unknown>, init: { status: number }, rateInfo: { remaining: number; resetMs: number }) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
      'X-RateLimit-Remaining': String(rateInfo.remaining),
      'X-RateLimit-Reset': String(Math.ceil(rateInfo.resetMs / 1000)),
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateInfo = await checkRateLimit(ip);

  if (!rateInfo.allowed) {
    return jsonWithRateHeaders(
      { error: 'rate_limited' },
      { status: 429 },
      rateInfo
    );
  }

  try {
    if (!validateRequestSource(req)) {
      return jsonWithRateHeaders({ error: 'forbidden' }, { status: 403 }, rateInfo);
    }

    const body = await req.json();
    const { messages, turnstileToken } = body as { messages?: unknown; turnstileToken?: unknown };

    if (!validateMessages(messages)) {
      return jsonWithRateHeaders({ error: 'invalid_input' }, { status: 400 }, rateInfo);
    }

    if (typeof turnstileToken !== 'string' || turnstileToken.length < 10) {
      return jsonWithRateHeaders({ error: 'captcha_missing' }, { status: 400 }, rateInfo);
    }

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileOk) {
      return jsonWithRateHeaders({ error: 'captcha_failed' }, { status: 403 }, rateInfo);
    }

    const trimmed = (messages as { role?: unknown; text?: unknown }[]).slice(-MAX_MESSAGES);

    // Kimi is the primary model; Gemini stays wired as a fallback so the widget keeps
    // working on any deployment that has not been given a Kimi key yet.
    const provider = KIMI_API_KEY ? 'kimi' : process.env.GEMINI_API_KEY ? 'gemini' : null;
    if (!provider) {
      return jsonWithRateHeaders({ error: 'not_configured' }, { status: 503 }, rateInfo);
    }

    const text = provider === 'kimi' ? await askKimi(trimmed) : await askGemini(trimmed);
    if (!text) {
      return jsonWithRateHeaders({ error: 'upstream_unavailable' }, { status: 502 }, rateInfo);
    }

    return jsonWithRateHeaders({ text }, { status: 200 }, rateInfo);
  } catch {
    return jsonWithRateHeaders({ error: 'server_error' }, { status: 500 }, rateInfo);
  }
}

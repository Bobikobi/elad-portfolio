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

function checkRateLimit(key: string) {
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
  const rateInfo = checkRateLimit(ip);

  if (!rateInfo.allowed) {
    return jsonWithRateHeaders(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
      rateInfo
    );
  }

  try {
    if (!validateRequestSource(req)) {
      return jsonWithRateHeaders({ error: 'Forbidden request source' }, { status: 403 }, rateInfo);
    }

    const body = await req.json();
    const { messages, turnstileToken } = body as { messages?: unknown; turnstileToken?: unknown };

    if (!validateMessages(messages)) {
      return jsonWithRateHeaders({ error: 'Invalid input' }, { status: 400 }, rateInfo);
    }

    if (typeof turnstileToken !== 'string' || turnstileToken.length < 10) {
      return jsonWithRateHeaders({ error: 'Missing anti-bot verification' }, { status: 400 }, rateInfo);
    }

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileOk) {
      return jsonWithRateHeaders({ error: 'Anti-bot verification failed' }, { status: 403 }, rateInfo);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonWithRateHeaders({ error: 'Chat not configured' }, { status: 503 }, rateInfo);
    }

    const sanitized = (messages as { role?: unknown; text?: unknown }[])
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.text ?? '').slice(0, MAX_MESSAGE_LENGTH) }],
      }));

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: sanitized,
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      const errMsg = data?.error?.message ?? JSON.stringify(data).slice(0, 200);
      console.error('Gemini empty response:', errMsg);
      return jsonWithRateHeaders({ error: 'Empty response', detail: errMsg }, { status: 500 }, rateInfo);
    }

    return jsonWithRateHeaders({ text }, { status: 200 }, rateInfo);
  } catch {
    return jsonWithRateHeaders({ error: 'Server error' }, { status: 500 }, rateInfo);
  }
}

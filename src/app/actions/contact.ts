'use server';

import { headers } from 'next/headers';

export interface ContactState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

// Best-effort in-memory rate limit (per serverless instance — acceptable on the free
// tier; a shared store would be the hardening step). 3 messages / 10 min / IP.
const hits = new Map<string, number[]>();
const WINDOW = 10 * 60 * 1000;
const MAX = 3;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real users never fill this hidden field. Silently accept + drop.
  if ((formData.get('company') as string)?.trim()) return { status: 'success' };

  const name = ((formData.get('name') as string) ?? '').trim().slice(0, 80);
  const email = ((formData.get('email') as string) ?? '').trim().slice(0, 120);
  const message = ((formData.get('message') as string) ?? '').trim().slice(0, 2000);

  if (name.length < 2 || !EMAIL.test(email) || message.length < 10) {
    return { status: 'error', message: 'invalid' };
  }

  // Rate limit by client IP.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= MAX) return { status: 'error', message: 'rate' };
  recent.push(now);
  hits.set(ip, recent);

  // Delivery. TODO-FORM-PROVIDER: point CONTACT_ENDPOINT at a free form backend
  // (Web3Forms / Formspree / an n8n webhook). Secrets live in env only; the message
  // is never echoed back to the client.
  const endpoint = process.env.CONTACT_ENDPOINT;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, source: 'eladsaadon.dev' }),
      });
      if (!res.ok) return { status: 'error', message: 'send' };
    } catch {
      return { status: 'error', message: 'send' };
    }
  } else if (process.env.NODE_ENV === 'production') {
    // No provider configured in prod → don't pretend it was delivered.
    return { status: 'error', message: 'unconfigured' };
  }

  return { status: 'success' };
}

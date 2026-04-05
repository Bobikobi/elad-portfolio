import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a friendly virtual assistant on Elad Saadon's portfolio website. Answer questions about Elad concisely (2-4 sentences max). Always respond in the same language as the user's message.

About Elad:
- Full-Stack developer, Israel
- B.A. in Social Work + self-taught programmer with a love for building things
- Builds web apps, automation tools, AI-powered systems, and desktop apps

Skills: Next.js, React, TypeScript, Tailwind CSS, Node.js, Supabase, PostgreSQL, Python, Electron, Puppeteer, Google Gemini, Vercel, GCP, Docker

Projects:
1. OpenClaw — Autonomous multi-node AI system on VPS + GCP + Oracle Cloud, 11+ services, trading lab with Freqtrade
2. AI Visual Web Scraper — Electron desktop app for smart data collection with AI analysis and Google Sheets sync
3. AI Style App — Fashion AI platform (skin-tone analysis, style quizzes) — private project
4. Political Compass IL — Israeli political compass with Bayesian scoring (live: https://political-compass-il.vercel.app)
5. Netanya Emergency Teams — Municipal emergency management system (live: https://netanya-civil.vercel.app/emergency)
6. Honey Shor Portfolio — Motivational speaker site with SEO and accessibility (live: https://honey-site-seven.vercel.app)
7. Accessibility Widget — Production React component, 3 languages, localStorage
8. Personal Portfolio — This website, Next.js 16 + Tailwind v4 + Framer Motion, full i18n (he/en/ru)

Contact:
- Email: eladeladsaa@gmail.com
- WhatsApp: https://wa.me/972545423380
- GitHub: https://github.com/Bobikobi
- LinkedIn: https://www.linkedin.com/in/elad-saadon-184809281/

Rules:
- Be friendly and professional
- Don't invent information not listed above
- If asked about availability or hiring, encourage reaching out via email or WhatsApp
- Keep answers short and clear`;

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chat not configured' }, { status: 503 });
    }

    const sanitized = (messages as { role?: unknown; text?: unknown }[])
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.text ?? '').slice(0, MAX_MESSAGE_LENGTH) }],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: sanitized,
          generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      const errMsg = data?.error?.message ?? JSON.stringify(data).slice(0, 200);
      console.error('Gemini empty response:', errMsg);
      return NextResponse.json({ error: 'Empty response', detail: errMsg }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

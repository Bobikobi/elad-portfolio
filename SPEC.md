# Business Profile Website — Technical Specification

> **Author:** Elad Saadon  
> **Version:** 1.0  
> **Date:** April 5, 2026  
> **Status:** Draft — Ready for Review

---

## 1. Executive Summary

A single-page portfolio website showcasing Elad Saadon as a versatile young developer specializing in **full-stack web development, AI integration, automation systems, and civic-tech solutions**. The site will serve as a professional digital presence for attracting freelance clients, employers, and collaborators.

---

## 2. Project Inventory — Source of Truth

The following projects were discovered on the local development drive and form the basis of the portfolio content:

| # | Project | Type | Stack | Status |
|---|---------|------|-------|--------|
| 1 | **OpenClaw (ClawBot)** | Autonomous AI System | Node.js, Python, GCP, Contabo VPS, Oracle Cloud, Telegram API, Gemini Function-Calling, Puppeteer, Playwright, Freqtrade, Docker, systemd | Production — Multi-node cloud infra, 11+ systemd services |
| 2 | **AI Visual Web Scraper** | Desktop Application | Electron, Puppeteer, Google Gemini 2.0 Flash (Vision AI), Google Sheets API, Sharp | Production — Electron app with auto-updater |
| 3 | **AI Style App** | Web Application | Next.js 14, TypeScript, Tailwind CSS, Supabase, Pollinations.ai | Deployed on Vercel |
| 4 | **Political Compass IL** | Civic-Tech Web App | Next.js, TypeScript, Supabase, Recharts, Framer Motion, Cloudflare Turnstile | Deployed on Vercel |
| 5 | **Netanya Emergency Teams** | Municipal Civic-Tech | Next.js 14, TypeScript, Tailwind CSS, Supabase, Zod, Lucide React | Deployed on Vercel |
| 6 | **Honey Shor Portfolio** | Client Website | Next.js, TypeScript, Tailwind CSS, Framer Motion | Deployed on Vercel |
| 7 | **Accessibility Widget** | Reusable Component | React, TypeScript, Tailwind CSS, Lucide React | Production — Reusable library |

---

## 3. Site Architecture

### 3.1 Page Structure (Single-Page Application)

```
/                          → Main landing page (all sections below)
├── #hero                  → Hero section with tagline + CTA
├── #about                 → Bio, skills summary, professional photo
├── #services              → Service offerings grid
├── #projects              → Project showcase (filterable gallery)
├── #tech-stack            → Technology proficiency visualization
├── #testimonials          → Client quotes / social proof
├── #contact               → Contact form + social links
└── /accessibility         → Accessibility statement (legal)
    /privacy               → Privacy policy
    /terms                 → Terms of service
```

### 3.2 Routing Strategy

| Route | Purpose | SSR/SSG |
|-------|---------|---------|
| `/` | Main SPA | SSG (static generation) |
| `/accessibility` | Accessibility statement | SSG |
| `/privacy` | Privacy policy | SSG |
| `/terms` | Terms of service | SSG |

---

## 4. Section Specifications

### 4.1 Hero Section

| Property | Spec |
|----------|------|
| **Layout** | Full viewport height (`100dvh`), content vertically centered, horizontally start-aligned (RTL) |
| **Background layers** | 1) `#09090B` base → 2) SVG noise texture at 3% → 3) Dot grid at 2% → 4) 2–3 glow orbs (violet/cyan, `blur(120px)`, 30% opacity) → 5) Cursor-tracking radial spotlight (accent, 600px, 5%) |
| **Headline** | `<span>` with gradient text (violet → cyan), fluid `clamp(2.5rem, 5vw, 4.5rem)` |
| **Subtitle** | Rotating titles via Framer Motion `AnimatePresence` — fade+slide vertical swap every 3s |
| **CTA row** | Primary button "View My Work" (accent glow) + Secondary button "Get in Touch" (bordered ghost) |
| **Social row** | Icon-only links (`GitHub` · `LinkedIn` · `Telegram` · `Email`) — Lucide icons, `20px`, ghost style, `var(--text-tertiary)` → `var(--text-primary)` on hover |
| **Scroll indicator** | Subtle animated chevron-down at bottom center, `opacity: 0.3`, bouncing `translateY` animation |

**Rotating Titles:**
```
Full-Stack Developer · AI Systems Architect · Automation Engineer · Civic-Tech Builder
```

**Visual reference:** Think vercel.com hero — mostly empty dark space, one strong headline with gradient, minimal UI, maximum impact.

### 4.2 About Section

- **Professional photo** (optimized WebP, lazy-loaded)
- **Bio paragraph** — 3–4 sentences: young developer, diverse tech background, passion for AI & civic solutions
- **Key metrics** (animated counters on scroll):
  - `7+` Projects Delivered
  - `5+` Technologies Mastered
  - `3` Languages Supported (he/en/ru)
  - `2` Cloud Platforms (GCP, Oracle)

### 4.3 Services Section

Grid layout (2×2 on desktop, 1-col on mobile). Each card includes an icon, title, and 2-line description.

| Service | Icon | Description |
|---------|------|-------------|
| **Full-Stack Web Development** | `<Globe>` | End-to-end web apps with Next.js, React, and Supabase. From concept to Vercel deployment. |
| **AI Integration & Automation** | `<Bot>` | Custom AI-powered solutions using Google Gemini, autonomous bots, and intelligent pipelines. |
| **Desktop Applications** | `<Monitor>` | Cross-platform Electron apps with Puppeteer automation, AI vision, and native integrations. |
| **Civic & Community Tech** | `<Users>` | Public-sector platforms: emergency management, civic engagement tools, accessibility-first design. |

### 4.4 Projects Section — Showcase Grid

Each project card displays:
- **Thumbnail** (screenshot or generated visual)
- **Title**
- **Category tag** (Web App / Desktop / Bot / Civic-Tech / Component)
- **Tech badges** (small pills showing key technologies)
- **Short description** (2 lines)
- **Links:** Live Demo (if public) · GitHub (if open-source)

**Filter bar** at top: `All` | `Web Apps` | `Desktop` | `AI & Automation` | `Civic-Tech` | `Components`

#### Project Cards Content:

**1. OpenClaw — Autonomous AI System**
> Multi-node autonomous AI agent spanning Contabo VPS (primary), GCP Compute Engine (standby), and Oracle Cloud (library/backup). Runs 11+ systemd services including a Telegram interceptor with Gemini function-calling for intent routing, a task queue pipeline (ingest → dispatcher → planner/critic → orchestrator → executor), a Python orchestrator with safety filters (26 patterns), rate limiting, and SQLite caching, plus a parallel trading lab running 5 Freqtrade strategy instances with an evolution engine for parameter optimization. Features real-time health scoring (5-component, 100-point system), resource/RAM monitoring, API key rotation, Docker-based sandboxed execution, automated 6-hour backup sync to Oracle, and Playwright browser automation. The entire system is self-healing with watchdog timers and dead-letter queues.
>
> `Node.js` `Python` `GCP` `Contabo VPS` `Oracle Cloud` `Telegram API` `Gemini Function-Calling` `Puppeteer` `Playwright` `Freqtrade` `Docker` `systemd` `SQLite`

**2. AI Visual Web Scraper**
> Desktop application combining Puppeteer browser automation with Google Gemini's multimodal Vision AI. Scrapes Facebook, Instagram, and TikTok using a hybrid DOM + screenshot analysis approach, with Google Sheets sync.
>
> `Electron` `Puppeteer` `Google Gemini 2.0` `Sharp` `Google Sheets API`

**3. AI Style App**
> AI-powered fashion analysis platform. Users upload photos for skin-tone analysis (12-season color theory), body shape detection via interactive SVG avatar, style quizzes, and AI-generated outfit suggestions.
>
> `Next.js 14` `TypeScript` `Tailwind CSS` `Supabase` `Pollinations.ai`

**4. Political Compass IL**
> Israeli political compass with Bayesian scoring algorithm, soft zone classification using Mahalanobis distance, confidence intervals, and interactive Recharts visualizations. Anti-bot protection with Cloudflare Turnstile.
>
> `Next.js` `TypeScript` `Supabase` `Recharts` `Framer Motion`

**5. Netanya Emergency Teams**
> Municipal emergency management system for the city of Netanya. Features real-time event dashboards, incident reporting with Zod validation, organizational charts, emergency scripts, and full trilingual support (Hebrew/English/Russian).
>
> `Next.js 14` `TypeScript` `Supabase` `Zod` `i18n (he/en/ru)`

**6. Honey Shor — Client Portfolio**
> Professional portfolio website built for a motivational speaker. Features smooth scroll animations, SEO-optimized structured data (JSON-LD), lecture booking sections, testimonials, and accessibility compliance.
>
> `Next.js` `TypeScript` `Tailwind CSS` `Framer Motion`

**7. Accessibility Widget**
> Production-ready, self-contained React component providing comprehensive accessibility controls: font scaling, contrast modes, link highlighting, animation toggle, screen-reader optimization. Supports 3 languages with localStorage persistence.
>
> `React` `TypeScript` `Tailwind CSS` `Lucide React`

### 4.5 Tech Stack Section

Visual grid / icon cloud organized by category:

| Category | Technologies |
|----------|-------------|
| **Frontend** | React, Next.js, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Node.js, Supabase (PostgreSQL), REST APIs, Zod |
| **AI & ML** | Google Gemini 2.0 Flash, Pollinations.ai, Vision AI pipelines |
| **Automation** | Puppeteer, Playwright, Electron, Cron/Queue systems |
| **Cloud & DevOps** | GCP (Compute Engine), Oracle Cloud, Vercel, GitHub Actions |
| **Tools** | Git, VS Code, Docker, Telegram Bot API |

**Design:** Animated skill bars or icon grid with hover tooltips showing proficiency level.

### 4.6 Testimonials Section

- Horizontal carousel (auto-scroll with manual navigation)
- Client quote, client name, project reference
- Placeholder slots for future testimonials

### 4.7 Contact Section

| Field | Type | Validation |
|-------|------|------------|
| Name | Text input | Required, min 2 chars |
| Email | Email input | Required, valid email format |
| Subject | Select dropdown | General Inquiry / Project Request / Collaboration / Other |
| Message | Textarea | Required, min 10 chars |
| **Submit** | Button | Rate-limited, honeypot anti-spam |

**Backend:** Supabase Edge Function or API route → stores in DB + sends email notification.

**Additional contact channels** displayed alongside:
- GitHub profile link
- LinkedIn profile link
- Telegram direct link
- Email address (obfuscated in DOM)

---

## 5. Technical Specification

### 5.1 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Framework** | Next.js 14+ (App Router) | SSG performance, React Server Components, SEO |
| **Language** | TypeScript 5 | Type safety, better DX |
| **Styling** | Tailwind CSS 3.4+ | Utility-first, dark theme tokens, RTL support |
| **Animations** | Framer Motion | Scroll-triggered reveals, layout animations, presence |
| **Icons** | Lucide React | Consistent 1.5px stroke icons, tree-shakable |
| **Database** | Supabase (PostgreSQL) | Contact form storage, analytics |
| **Deployment** | Vercel | Auto-deploy from GitHub, edge network, analytics |
| **Domain** | Custom domain (TBD) | Professional branding |

### 5.2 Visual Design Language — Dark Minimalist

> **Philosophy:** Inspired by linear.app, vercel.com, and raycast.com — ultra-clean dark UI with precise micro-interactions, generous whitespace, and restrained use of color. Content breathes. Every pixel is intentional.

#### 5.2.1 Color System

**Dark-only theme** — no light mode toggle. The entire brand is built around darkness.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#09090B` (Zinc 950) | Page background, hero |
| `--bg-secondary` | `#18181B` (Zinc 900) | Cards, elevated surfaces |
| `--bg-tertiary` | `#27272A` (Zinc 800) | Hover states, active elements |
| `--border-default` | `#27272A` (Zinc 800) | Card borders, dividers |
| `--border-subtle` | `#3F3F46` (Zinc 700) | Input borders, separators |
| `--text-primary` | `#FAFAFA` (Zinc 50) | Headings, primary text |
| `--text-secondary` | `#A1A1AA` (Zinc 400) | Body text, descriptions |
| `--text-tertiary` | `#71717A` (Zinc 500) | Labels, captions, meta |
| `--accent` | `#8B5CF6` (Violet 500) | CTA buttons, active links, highlights |
| `--accent-glow` | `rgba(139, 92, 246, 0.15)` | Glow effects behind accent elements |
| `--accent-hover` | `#A78BFA` (Violet 400) | Button hover, link hover |
| `--gradient-start` | `#8B5CF6` (Violet 500) | Gradient text, decorative lines |
| `--gradient-end` | `#06B6D4` (Cyan 500) | Gradient text, decorative lines |
| `--success` | `#22C55E` (Green 500) | Status badges |
| `--surface-glass` | `rgba(24, 24, 27, 0.80)` | Frosted glass nav, modals |

#### 5.2.2 Typography

| Token | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| **Display** | `Geist` / `Heebo` | 700 | `clamp(2.5rem, 5vw, 4.5rem)` | Hero headline |
| **H1** | `Geist` / `Heebo` | 600 | `clamp(2rem, 3.5vw, 3rem)` | Section titles |
| **H2** | `Geist` / `Heebo` | 600 | `1.5rem` | Sub-section headings |
| **H3** | `Geist` / `Heebo` | 500 | `1.25rem` | Card titles |
| **Body** | `Geist` / `Heebo` | 400 | `1rem / 1.125rem` | Paragraphs, descriptions |
| **Small** | `Geist` / `Heebo` | 400 | `0.875rem` | Labels, captions, badges |
| **Mono** | `Geist Mono` | 400 | `0.875rem` | Code snippets, tech badges |

**Fluid sizing:** All headings use `clamp()` for smooth scaling — no breakpoint jumps.

#### 5.2.3 Spacing & Grid

| Token | Value | Usage |
|-------|-------|-------|
| **Section gap** | `8rem` (mobile: `5rem`) | Vertical space between sections |
| **Container** | `max-width: 1200px` | Content max width |
| **Container padding** | `1.5rem` (mobile) / `2rem` (desktop) | Horizontal padding |
| **Card padding** | `1.5rem` / `2rem` | Internal card padding |
| **Grid gap** | `1.5rem` | Card grid gaps |
| **Base unit** | `4px` | Tailwind default scale |

#### 5.2.4 Surface & Card System

```css
/* Base card */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Card hover — subtle glow */
.card:hover {
  border-color: var(--border-subtle);
  box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.1),
              0 8px 40px rgba(0, 0, 0, 0.3);
}

/* Glass panel (navbar, floating elements) */
.glass {
  background: var(--surface-glass);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-default);
}
```

#### 5.2.5 Buttons

| Variant | Background | Border | Text | Hover |
|---------|-----------|--------|------|-------|
| **Primary** | `var(--accent)` | none | `#FAFAFA` | `var(--accent-hover)` + subtle glow |
| **Secondary** | `transparent` | `1px solid var(--border-subtle)` | `var(--text-secondary)` | `var(--bg-tertiary)` + text lighten |
| **Ghost** | `transparent` | none | `var(--text-secondary)` | `var(--bg-tertiary)` |

```css
/* Primary button */
.btn-primary {
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 20px var(--accent-glow);
  transform: translateY(-1px);
}
```

#### 5.2.6 Decorative Elements

| Element | Implementation |
|---------|---------------|
| **Gradient text** | `background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); -webkit-background-clip: text; color: transparent;` |
| **Section dividers** | Horizontal line: `1px solid var(--border-default)` with `max-width: 80px` gradient accent bar above section titles |
| **Dot grid** | Subtle `radial-gradient` dot pattern at 2% opacity as hero background texture |
| **Noise texture** | SVG noise filter overlay at 3% opacity across page background for depth |
| **Spotlight** | Radial gradient following cursor on hero section (mouse-tracked, 600px radius, 5% opacity accent color) |
| **Glow orbs** | 2–3 large blurred gradient circles (violet/cyan, 30% opacity) positioned absolutely behind hero — `filter: blur(120px)` |

#### 5.2.7 Iconography & Badges

| Element | Spec |
|---------|------|
| **Icons** | Lucide React, `stroke-width: 1.5`, `20px` default size |
| **Tech badges** | `font-family: Geist Mono`, `font-size: 0.75rem`, `bg: var(--bg-tertiary)`, `border: 1px solid var(--border-default)`, `border-radius: 9999px`, `padding: 0.25rem 0.75rem` |
| **Status dots** | `8px` circles with `var(--success)` + pulse animation for "live" indicators |
| **Category pills** | Same as tech badges but with accent left-border: `border-left: 2px solid var(--accent)` |

### 5.3 Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **Mobile** | < 640px | Single column, hamburger nav (slide-in drawer), stacked cards, reduced section spacing |
| **Tablet** | 640–1024px | 2-column project grid, collapsed nav |
| **Desktop** | 1024–1280px | Full layout, sticky glass nav, 3-column project grid |
| **Wide** | > 1280px | `max-width: 1200px` container, centered, extra breathing room |

### 5.4 Internationalization (i18n)

| Property | Value |
|----------|-------|
| **Default Language** | Hebrew (`he`) |
| **Supported Languages** | Hebrew, English, Russian |
| **Direction** | RTL (Hebrew, default) / LTR (English, Russian) |
| **Implementation** | React Context + localStorage persistence |
| **Switcher** | Language toggle in navbar (flag icons or ISO codes) |

### 5.5 Accessibility Requirements

- WCAG 2.1 AA compliance minimum
- Integrated **AccessibilityWidget** component (from `D:\AccessibilityWidget\`)
- Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- Full keyboard navigation with visible focus indicators
- `aria-label`, `aria-describedby`, `role` attributes where needed
- Skip-to-content link
- Minimum contrast ratio 4.5:1 (text), 3:1 (large text)
- `prefers-reduced-motion` media query respect
- Screen reader tested (NVDA / VoiceOver)

### 5.6 SEO Strategy

| Element | Implementation |
|---------|---------------|
| **Meta Tags** | Dynamic `<title>`, `<meta description>`, Open Graph, Twitter Card |
| **Structured Data** | JSON-LD: `Person`, `WebSite`, `ItemList` (projects) |
| **Sitemap** | Auto-generated `sitemap.xml` via Next.js |
| **Robots** | `robots.txt` with proper allow rules |
| **Performance** | Target Lighthouse score ≥ 95 across all categories |
| **Images** | Next.js `<Image>` with WebP/AVIF, lazy loading, blur placeholder |
| **URLs** | Clean, semantic paths — no query parameters |

### 5.7 Performance Targets

| Metric | Target |
|--------|--------|
| **Lighthouse Performance** | ≥ 95 |
| **LCP** (Largest Contentful Paint) | < 2.5s |
| **FID** (First Input Delay) | < 100ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 |
| **Bundle Size** | < 150KB (first load JS, gzipped) |
| **TTI** (Time to Interactive) | < 3.5s |

---

## 6. Component Architecture

```
src/
├── app/
│   ├── layout.tsx                 # Root layout: fonts, metadata, providers
│   ├── page.tsx                   # Home: assembles all sections
│   ├── globals.css                # Tailwind base + custom utilities
│   ├── accessibility/page.tsx     # Accessibility statement
│   ├── privacy/page.tsx           # Privacy policy
│   └── terms/page.tsx             # Terms of service
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx             # Frosted glass sticky nav + language toggle
│   │   ├── Footer.tsx             # Minimal footer, social icons, gradient divider
│   │   └── MobileMenu.tsx         # Slide-in drawer with backdrop blur
│   │
│   ├── sections/
│   │   ├── Hero.tsx               # Hero with typing animation
│   │   ├── About.tsx              # Bio + animated counters
│   │   ├── Services.tsx           # Service cards grid
│   │   ├── Projects.tsx           # Filterable project gallery
│   │   ├── TechStack.tsx          # Technology icon grid
│   │   ├── Testimonials.tsx       # Carousel component
│   │   └── Contact.tsx            # Contact form + channels
│   │
│   ├── ui/
│   │   ├── ProjectCard.tsx        # Hover-glow card with cursor spotlight
│   │   ├── ServiceCard.tsx        # Bordered dark card with icon
│   │   ├── TechBadge.tsx          # Mono-font pill, Zinc background
│   │   ├── FilterBar.tsx          # Tabs with animated layoutId underline
│   │   ├── Counter.tsx            # Scroll-triggered count-up
│   │   ├── GradientText.tsx       # Reusable violet→cyan gradient text
│   │   ├── SpotlightBg.tsx        # Cursor-tracking radial gradient
│   │   └── LanguageSwitcher.tsx   # i18n language selector (ghost button)
│   │
│   ├── AccessibilityWidget.tsx    # Imported from D:\AccessibilityWidget\
│   └── accessibility.css          # Widget styles
│
├── lib/
│   ├── i18n.tsx                   # I18n context provider
│   ├── translations.ts           # All UI strings (he/en/ru)
│   ├── supabase.ts               # Supabase client init
│   └── constants.ts              # Project data, services, tech stack arrays
│
├── types/
│   └── index.ts                   # TypeScript interfaces
│
└── public/
    ├── images/
    │   ├── projects/              # Project screenshots/thumbnails
    │   ├── profile.webp           # Professional headshot
    │   └── og-image.webp          # Open Graph share image
    ├── fonts/                     # Self-hosted font files
    ├── favicon.ico
    ├── robots.txt
    └── sitemap.xml
```

---

## 7. Data Models

### 7.1 Project Interface

```typescript
interface Project {
  id: string;
  title: string;
  description: Record<Locale, string>;  // { he, en, ru }
  category: 'web-app' | 'desktop' | 'ai-bot' | 'civic-tech' | 'component';
  thumbnail: string;                     // path to image
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  order: number;
}
```

### 7.2 Contact Submission

```typescript
interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: 'general' | 'project' | 'collaboration' | 'other';
  message: string;
  createdAt: string;                     // ISO 8601
  locale: Locale;
  read: boolean;
}
```

### 7.3 Supabase Schema

```sql
CREATE TABLE contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  subject TEXT NOT NULL CHECK (subject IN ('general','project','collaboration','other')),
  message TEXT NOT NULL CHECK (char_length(message) >= 10),
  locale TEXT NOT NULL DEFAULT 'he',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: insert-only for anonymous, full access for authenticated (admin)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit" ON contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can read" ON contact_submissions
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 8. Animation & Micro-Interaction Specification

> **Principle:** Animations are felt, not seen. Every motion has purpose — guiding attention, confirming interaction, or adding spatial depth. No decorative animation that blocks content consumption.

### 8.1 Scroll Animations (Framer Motion)

| Element | Animation | Duration | Easing | Stagger |
|---------|-----------|----------|--------|--------|
| Section headings | `opacity: 0→1`, `y: 30→0` | `0.6s` | `[0.25, 0.4, 0, 1]` | — |
| Section descriptions | `opacity: 0→1`, `y: 20→0` | `0.6s` | `[0.25, 0.4, 0, 1]` | `0.1s` delay after heading |
| Project cards | `opacity: 0→1`, `y: 40→0`, `scale: 0.98→1` | `0.5s` | `[0.25, 0.4, 0, 1]` | `0.08s` per card |
| Service cards | `opacity: 0→1`, `y: 30→0` | `0.5s` | `[0.25, 0.4, 0, 1]` | `0.1s` per card |
| Tech badges | `opacity: 0→1`, `scale: 0.9→1` | `0.3s` | `spring(1, 80, 10)` | `0.03s` per badge |
| Counters | Count from `0` to target | `2s` | `easeOut` | — |
| Gradient accent bar | `width: 0→80px` | `0.8s` | `[0.25, 0.4, 0, 1]` | — |

**Trigger:** `whileInView` with `viewport={{ once: true, margin: "-100px" }}` — animate once, slightly before element enters viewport.

### 8.2 Interactive Animations

| Element | Interaction | Animation | Duration |
|---------|------------|-----------|----------|
| **Navbar** | Scroll > 50px | Glass blur fades in (`opacity: 0→1`), border appears | `0.3s` |
| **Project cards** | Hover | Border brightens, subtle `box-shadow` glow, `translateY(-2px)` | `0.25s` |
| **Project cards** | Hover | Inner gradient spotlight follows cursor (`onMouseMove`) | Realtime |
| **Buttons (primary)** | Hover | Glow expands (`box-shadow`), `translateY(-1px)` | `0.2s` |
| **Buttons (primary)** | Click | `scale: 0.97` snap | `0.1s` |
| **Filter tabs** | Active change | Framer `layoutId` animated underline slides to active tab | `0.3s spring` |
| **Social icons** | Hover | `color` transition + `scale: 1.1` | `0.2s` |
| **Hero titles** | Auto-rotate | `AnimatePresence` — current title exits (`opacity: 0, y: -20`), new enters (`opacity: 0→1, y: 20→0`) | `0.5s` / `3s` interval |
| **Hero spotlight** | Mouse move | Radial gradient follows cursor with `lerp` smoothing | `60fps` |
| **Scroll indicator** | Idle | Infinite `translateY(0→8px)` bounce | `2s` loop |
| **Status dots** | Idle | Infinite `scale(1→1.5)` + `opacity(1→0)` ping | `1.5s` loop |

### 8.3 Page Transitions

| Transition | Animation |
|-----------|----------|
| **Initial load** | Staggered entrance: navbar (0s) → hero headline (0.2s) → subtitle (0.4s) → CTAs (0.6s) → social (0.8s) |
| **Route change** | `opacity: 0→1` + `y: 10→0` on new page content (`0.3s`) |

### 8.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Framer Motion: wrap all variants with `useReducedMotion()` hook — replace animations with instant state changes.

---

## 9. Third-Party Integrations

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Hosting + CI/CD + Analytics | Free tier |
| **Supabase** | Contact form DB + auth (admin) | Free tier |
| **Google Analytics 4** | Traffic analytics | Free |
| **Cloudflare Turnstile** | Contact form bot protection | Free |

---

## 10. Deployment Pipeline

```
GitHub (main branch)
  └─→ Vercel (auto-deploy)
        ├── Preview deployments (PRs)
        ├── Production (main branch)
        └── Custom domain (DNS configured)
```

**Environment Variables (Vercel):**
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<cloudflare-key>
NEXT_PUBLIC_GA_ID=<google-analytics-id>
```

---

## 11. Development Milestones

| Phase | Scope | Priority |
|-------|-------|----------|
| **Phase 1 — Foundation** | Project scaffold, design system, Navbar, Footer, Hero, About | P0 |
| **Phase 2 — Content** | Services, Projects showcase, Tech Stack sections | P0 |
| **Phase 3 — Interaction** | Contact form, Supabase integration, animations | P0 |
| **Phase 4 — Polish** | i18n (he/en/ru), dark mode, accessibility widget, SEO | P1 |
| **Phase 5 — Launch** | Custom domain, analytics, Lighthouse audit, OG images | P1 |
| **Phase 6 — Enhancements** | Blog section, project case studies, admin dashboard | P2 |

---

## 12. Open Questions

- [ ] Custom domain name preference? (e.g., `eladsaadon.dev`, `elad.dev`)
- [ ] Professional headshot photo available?
- [ ] Project screenshots to capture or generate?
- [ ] Testimonial quotes from existing clients?
- [ ] Color palette preference different from proposed blue/violet?
- [ ] Blog/writing section desired for Phase 6?
- [ ] GitHub username for profile links? (discovered: `Bobikobi`)

---

*End of specification.*

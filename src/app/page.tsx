import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Services from '@/components/sections/Services';
import Projects from '@/components/sections/Projects';
import TechStack from '@/components/sections/TechStack';
import Contact from '@/components/sections/Contact';

// JSON-LD: ItemList of key projects — helps AI engines cite Elad Saadon's work
const projectsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Projects by Elad Saadon (אלעד סעדון)",
  description: "Selected production projects built by Elad Saadon — full-stack developer and AI systems architect from Israel.",
  url: "https://www.eladsaadon.dev/#projects",
  numberOfItems: 5,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "SoftwareApplication",
        name: "OpenClaw — Autonomous AI System",
        description: "Multi-node autonomous AI agent spanning Contabo VPS, GCP, and Oracle Cloud. Runs 11+ systemd services including Telegram interceptor with Gemini function-calling, full task pipeline, and a trading lab with 5 parallel Freqtrade strategies.",
        author: { "@id": "https://www.eladsaadon.dev/#person" },
        applicationCategory: "AI / Automation",
        programmingLanguage: ["Node.js", "Python"],
        operatingSystem: "Linux",
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "SoftwareApplication",
        name: "Netanya Emergency Teams — Municipal Emergency Management",
        url: "https://netanya-civil.vercel.app/emergency",
        description: "Real-time municipal emergency management platform for Netanya, Israel. Built with Next.js, Supabase, and full trilingual support (Hebrew, English, Russian).",
        author: { "@id": "https://www.eladsaadon.dev/#person" },
        applicationCategory: "Civic-Tech / Government",
        inLanguage: ["he", "en", "ru"],
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "SoftwareApplication",
        name: "Political Compass IL — Israeli Political Compass",
        url: "https://political-compass-il.vercel.app",
        description: "Civic-tech tool for mapping Israeli political positions using Bayesian scoring and Mahalanobis distance zone classification.",
        author: { "@id": "https://www.eladsaadon.dev/#person" },
        applicationCategory: "Civic-Tech",
      },
    },
    {
      "@type": "ListItem",
      position: 4,
      item: {
        "@type": "SoftwareApplication",
        name: "AI Visual Web Scraper",
        description: "Electron desktop tool for collecting and processing data from digital platforms using Google Gemini Vision AI and automatic Google Sheets sync.",
        author: { "@id": "https://www.eladsaadon.dev/#person" },
        applicationCategory: "Desktop / AI Tool",
      },
    },
    {
      "@type": "ListItem",
      position: 5,
      item: {
        "@type": "SoftwareApplication",
        name: "SHAPERZ — Community Marketing Platform",
        url: "https://www.shaperz.co.il",
        description: "Community marketing platform connecting brands with content creators in Israel. Full-stack Next.js application with Supabase.",
        author: { "@id": "https://www.eladsaadon.dev/#person" },
        applicationCategory: "Marketing / SaaS",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectsJsonLd) }}
      />
      <Hero />
      <About />
      <Services />
      <Projects />
      <TechStack />
      <Contact />
    </>
  );
}

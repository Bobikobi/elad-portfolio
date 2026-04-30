const llmsFullTxt = `# Elad Saadon (אלעד סעדון)

> Detailed AI-readable guide to the portfolio, expertise, projects, and contact information for Elad Saadon, full-stack developer and AI systems architect.

## Main Pages

- [Home](https://www.eladsaadon.dev/): Landing page introducing Elad Saadon, key capabilities, project highlights, and contact channels for collaborations.
- [Services](https://www.eladsaadon.dev/services): Dedicated services page with concrete deliverables, timeline ranges, and FAQ answers for common pre-sales questions.
- [Next.js Development Service](https://www.eladsaadon.dev/services/nextjs-development): Production-focused full-stack Next.js service for business applications and high-performance websites.
- [AI Integration Service](https://www.eladsaadon.dev/services/ai-integration): LLM integration service for automation, document workflows, and product intelligence.
- [Automation Service](https://www.eladsaadon.dev/services/automation-workflows): Business workflow automation service for reducing repetitive operational work.
- [Growth Marketing Automation Service](https://www.eladsaadon.dev/services/growth-marketing): Marketing automation service combining lead operations, messaging systems, and measurable conversion pipelines.
- [Next.js SEO + GEO Guide](https://www.eladsaadon.dev/guides/nextjs-seo-geo-2026): Long-form practical guide combining classic SEO with AI citation optimization.
- [Accessibility Statement](https://www.eladsaadon.dev/accessibility): Accessibility policy, support channel, and commitment to WCAG-aligned inclusive user experience.
- [Privacy Policy](https://www.eladsaadon.dev/privacy): Data usage and privacy handling details, including analytics scope and user rights.
- [Terms of Service](https://www.eladsaadon.dev/terms): Legal usage terms for the website, content ownership context, and liability boundaries.

## Portfolio Sections

- [About](https://www.eladsaadon.dev/#about): Professional profile, multidisciplinary background, and context on technical specialization.
- [Services](https://www.eladsaadon.dev/#services): Overview of offered services: full-stack development, AI integration, and workflow automation.
- [Projects](https://www.eladsaadon.dev/#projects): Curated project section with production work across civic-tech, AI systems, and web products.
- [Tech Stack](https://www.eladsaadon.dev/#tech): Technologies and tools used in delivery, including frontend, backend, cloud, and AI stack.
- [Contact](https://www.eladsaadon.dev/#contact): Primary contact options for project inquiries and professional partnerships.

## Notable Project References

- [Netanya Emergency Teams](https://netanya-civil.vercel.app/emergency): Municipal emergency management platform with real-time workflows and multilingual UX.
- [Political Compass IL](https://political-compass-il.vercel.app): Civic-tech platform for political positioning and interactive analysis.
- [SHAPERZ](https://www.shaperz.co.il): Community marketing platform connecting brands and creators.

## Entity Facts

- Full Name: Elad Saadon
- Hebrew Name: אלעד סעדון
- Entity Type: Person (professional portfolio)
- Primary Role: Full-Stack Developer and AI Systems Architect
- Region: Israel
- Languages: Hebrew (he), English (en), Russian (ru)
- Primary Expertise: Next.js, React, TypeScript, AI integration, cloud automation, civic-tech
- Secondary Expertise: Supabase, Node.js, Python, Tailwind CSS, Vercel, GCP, Oracle Cloud

## Contact

- Website: https://www.eladsaadon.dev
- Contact page: https://www.eladsaadon.dev/#contact
- LinkedIn: https://www.linkedin.com/in/elad-saadon-184809281/
- GitHub: https://github.com/Bobikobi

## Update Policy

- This file is updated when major profile, service, or project changes are published.
- Canonical domain: https://www.eladsaadon.dev
`;

export async function GET() {
  return new Response(llmsFullTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

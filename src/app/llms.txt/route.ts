const llmsTxt = `# Elad Saadon (אלעד סעדון)

> Personal portfolio of Elad Saadon, a full-stack developer and AI systems architect from Israel, specializing in Next.js, AI integration, and civic-tech products.

## Main Pages

- [Home](https://www.eladsaadon.dev/): Overview of Elad Saadon, core skills, featured projects, and direct contact options.
- [Services](https://www.eladsaadon.dev/services): Dedicated services page with delivery scope, timelines, and FAQ for Next.js, AI, and automation projects.
- [Next.js Development Service](https://www.eladsaadon.dev/services/nextjs-development): Full-stack Next.js implementation for production apps and websites.
- [AI Integration Service](https://www.eladsaadon.dev/services/ai-integration): Practical LLM integration for internal and customer-facing workflows.
- [Automation Service](https://www.eladsaadon.dev/services/automation-workflows): Workflow automation focused on saving manual operational time.
- [Growth Marketing Automation Service](https://www.eladsaadon.dev/services/growth-marketing): Data-driven marketing automation and lead-to-conversion workflow design.
- [Next.js SEO + GEO Guide](https://www.eladsaadon.dev/guides/nextjs-seo-geo-2026): Hands-on guide for ranking in Google and getting cited in AI engines.
- [Accessibility Statement](https://www.eladsaadon.dev/accessibility): Accessibility commitments, standards, and support details for inclusive browsing.
- [Privacy Policy](https://www.eladsaadon.dev/privacy): Explains data handling, analytics usage, and privacy practices on the portfolio website.
- [Terms of Service](https://www.eladsaadon.dev/terms): Terms governing website usage, intellectual property, and limitations of liability.

## Portfolio Sections

- [About](https://www.eladsaadon.dev/#about): Professional background, expertise areas, and multilingual profile details.
- [Services](https://www.eladsaadon.dev/#services): Available services in full-stack development, AI integration, and automation.
- [Projects](https://www.eladsaadon.dev/#projects): Selected production projects across civic-tech, AI systems, and web applications.
- [Tech Stack](https://www.eladsaadon.dev/#tech): Technologies and tools used in production work.
- [Contact](https://www.eladsaadon.dev/#contact): Direct channels to start a project or collaboration.

## Key Facts

- Person: Elad Saadon (Hebrew: אלעד סעדון)
- Role: Full-Stack Developer and AI Systems Architect
- Location: Israel
- Languages: Hebrew, English, Russian
- Focus: Next.js, React, TypeScript, AI integration, cloud automation, civic-tech

## Contact

- Website: https://www.eladsaadon.dev
- Contact page: https://www.eladsaadon.dev/#contact
- LinkedIn: https://www.linkedin.com/in/elad-saadon-184809281/
- GitHub: https://github.com/Bobikobi
`;

export async function GET() {
  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

import type { SectionId } from '@/lib/sections';
import About from '@/components/sections/About';
import Services from '@/components/sections/Services';
import Projects from '@/components/sections/Projects';
import TechStack from '@/components/sections/TechStack';
import Contact from '@/components/sections/Contact';

/**
 * A section route in CLASSIC view (F2).
 *
 * These five components are the site's original marketing sections. They already exist,
 * are already styled with the tokens, and are already rendered as one long scroll on the
 * home route - so classic view reuses them rather than restyling the world overlays,
 * which were written to float over a scene and are unusable without one.
 *
 * Each takes no props and reads its copy through `useI18n`, so a section works standalone
 * exactly as it works inside the home scroll. The only thing this wrapper adds is the
 * clearance the home scroll used to provide: every section already carries `py-14
 * md:py-20`, so all that is missing on its own route is the height of the fixed navbar.
 */
const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  about: About,
  services: Services,
  projects: Projects,
  technologies: TechStack,
  contact: Contact,
};

export default function ClassicSection({ id }: { id: SectionId }) {
  const Section = SECTION_COMPONENTS[id];
  return (
    <div className="pt-16">
      <Section />
    </div>
  );
}

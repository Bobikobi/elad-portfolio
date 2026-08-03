import type { Metadata } from 'next';
import SectionPage from '@/components/worlds/SectionPage';
import { sectionMetadata } from '@/lib/sections';

export const metadata: Metadata = sectionMetadata('technologies', 'he');

export default function Page() {
  return <SectionPage id="technologies" locale="he" />;
}

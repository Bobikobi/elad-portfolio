import type { Metadata } from 'next';
import SectionPage from '@/components/worlds/SectionPage';
import { sectionMetadata } from '@/lib/sections';

export const metadata: Metadata = sectionMetadata('services', 'he');

export default function Page() {
  return <SectionPage id="services" locale="he" />;
}

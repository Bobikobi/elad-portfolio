import type { Metadata } from 'next';
import SectionPage from '@/components/worlds/SectionPage';
import { sectionMetadata } from '@/lib/sections';

export const metadata: Metadata = sectionMetadata('services', 'ru');

export default function Page() {
  return <SectionPage id="services" locale="ru" />;
}

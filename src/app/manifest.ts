import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elad Saadon — Full-Stack Developer & AI Systems Architect',
    short_name: 'Elad Saadon',
    description:
      'Full-stack web development, AI integration, cloud automation, and civic-tech solutions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090B',
    theme_color: '#8B5CF6',
    lang: 'he',
    dir: 'rtl',
    icons: [
      { src: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
  };
}

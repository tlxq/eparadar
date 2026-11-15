import { CONTACT_EMAIL } from '@eparadar/legal';

export const SITE = {
  url: 'https://www.eparadar.se',
  contactEmail: CONTACT_EMAIL,
  routes: {
    home: '/',
    homeEn: '/en',
    privacy: '/integritetspolicy',
    terms: '/anvandarvillkor',
    community: '/communityregler',
    deleteAccount: '/radera-konto',
  },
  api: {
    waitlist: '/api/waitlist',
  },
  favicon: '/favicon.svg',
  ogImage: '/og-image.jpg',
  ogImageEn: '/og-image-en.jpg',
} as const;

export const urlFor = (path: string) => `${SITE.url}${path === SITE.routes.home ? '' : path}`;

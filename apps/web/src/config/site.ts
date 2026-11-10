import { CONTACT_EMAIL } from '@eparadar/legal';

export const SITE = {
  url: 'https://eparadar.se',
  contactEmail: CONTACT_EMAIL,
  routes: {
    home: '/',
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
} as const;

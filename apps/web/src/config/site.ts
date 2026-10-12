export const SITE = {
  url: 'https://eparadar.se',
  contactEmail: 'contact@eparadar.se',
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

import type { APIRoute } from 'astro';
import { SITE, urlFor } from '../config/site';

const PATHS = [
  SITE.routes.home,
  SITE.routes.homeEn,
  SITE.routes.privacy,
  SITE.routes.terms,
  SITE.routes.community,
  SITE.routes.deleteAccount,
];

export const GET: APIRoute = () => {
  const urls = PATHS.map((path) => `  <url><loc>${urlFor(path)}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

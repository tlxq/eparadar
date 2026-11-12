import { describe, expect, it } from '@jest/globals';

import { MAP_HTML } from '@/features/map/map-html';

describe('MAP_HTML', () => {
  it('ships MapLibre inside the page instead of loading it from the network', () => {
    expect(MAP_HTML).not.toContain('unpkg.com');
    expect(MAP_HTML).not.toMatch(/<script[^>]+src=/);
    expect(MAP_HTML).toContain('maplibregl');
  });

  it('keeps the tile source on openfreemap', () => {
    expect(MAP_HTML).toContain('https://tiles.openfreemap.org/styles/dark');
  });

  it('has scripts that parse as JavaScript', () => {
    const scripts = [...MAP_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts).toHaveLength(2);
    scripts.forEach((code) => expect(() => new Function(code)).not.toThrow());
  });
});

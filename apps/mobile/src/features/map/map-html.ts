import { Colors } from '@eparadar/theme/colors';

const SWEDEN_CENTER = { lat: 62.0, lng: 15.0, zoom: 4 };
const LONG_PRESS_MS = 450;
const MOVING_FRESH_MS = 3 * 60 * 1000;
const STALE_MS = 15 * 60 * 1000;
const TIMER_LOW_MS = 30 * 60 * 1000;
const STREET_ZOOM = 13;
const TOWN_ZOOM = 9.5;

const MAPLIBRE_VERSION = '5.24.0';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

const ICON_MEETUP =
  '<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="10" width="34" height="30" rx="7" fill="#2F6FED" fill-opacity=".5"/><rect x="7" y="10" width="34" height="30" rx="7" stroke="#F4F6F9" stroke-width="3"/><path d="M16 6v8M32 6v8M7 19h34" stroke="#F4F6F9" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="29" r="3" fill="#7EA6FF"/><circle cx="29" cy="29" r="3" fill="#7EA6FF"/></svg>';

const ICON_PIN =
  '<svg viewBox="0 0 48 48" fill="none"><path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" fill="#2F6FED" fill-opacity=".55"/><path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" stroke="#F4F6F9" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="22" r="4.5" fill="#F4F6F9"/></svg>';

const NIGHT = Colors.dark;

export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0E1320; }
    body { font-family: Inter, -apple-system, Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    .maplibregl-ctrl-attrib { background: rgba(14,19,32,0.7) !important; }
    .maplibregl-ctrl-attrib a, .maplibregl-ctrl-attrib-inner { color: ${NIGHT.textSecondary} !important; font-size: 9px; }
    .maplibregl-ctrl-attrib-button { filter: invert(1); }
    .mk { display: flex; align-items: center; justify-content: center; pointer-events: auto; }
    .mk.spot, .mk.meet, .mk.drop { z-index: 1; }
    .photo-pin {
      position: relative; width: 46px; height: 46px; border-radius: 12px; border: 2.5px solid ${NIGHT.text};
      background: #1C2230; box-shadow: 0 0 0 2px #0E1320, 0 6px 16px rgba(0,0,0,0.55); transform: rotate(-4deg);
    }
    .photo-pin .clip {
      position: absolute; inset: 0; border-radius: 9px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .photo-pin img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-pin::after {
      content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
      border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${NIGHT.text};
    }
    .z-town .photo-pin { width: 34px; height: 34px; border-radius: 9px; border-width: 2px; }
    .z-town .photo-pin .clip { border-radius: 7px; }
    .pdot { width: 12px; height: 12px; border-radius: 3px; background: ${NIGHT.text}; box-shadow: 0 0 0 2px #0E1320; }
    .mk.person { z-index: 2; }
    .mk.me { z-index: 3; }
    .below {
      position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 5px; white-space: nowrap;
    }
    .status-bubble {
      position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -8px); max-width: 160px;
      background: ${NIGHT.text}; color: ${NIGHT.background}; font-size: 11px; font-weight: 700; padding: 5px 9px; border-radius: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 12px rgba(0,0,0,0.45);
    }
    .status-bubble::after {
      content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
      border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${NIGHT.text};
    }
    .bubble { position: relative; width: 48px; height: 48px; }
    .z-town .bubble { width: 34px; height: 34px; }
    .ring {
      position: absolute; inset: 0; border-radius: 50%; border: 3px solid var(--ring);
      background: #1C2230; overflow: hidden; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 2px #0E1320, 0 6px 16px rgba(0,0,0,0.55);
    }
    .z-town .ring { border-width: 2.5px; }
    .ring img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .initials { color: ${NIGHT.text}; font-weight: 800; font-size: 15px; text-transform: uppercase; }
    .z-town .initials { font-size: 12px; }
    .dot {
      width: 14px; height: 14px; border-radius: 50%; background: var(--ring);
      box-shadow: 0 0 0 2px #0E1320, 0 0 10px var(--ring);
    }
    .dot.many {
      width: 22px; height: 22px; background: ${NIGHT.text}; color: ${NIGHT.background}; font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #0E1320, 0 4px 10px rgba(0,0,0,0.5);
    }
    .label {
      font-size: 11px; font-weight: 700; color: ${NIGHT.text};
      text-shadow: 0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9);
    }
    .label .ago { color: ${NIGHT.textSecondary}; }
    .is-stale .bubble, .is-stale .dot { opacity: 0.45; filter: grayscale(0.6); }
    .is-approx .bubble::before {
      content: ''; position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; transform: translate(-50%,-50%);
      border-radius: 50%; background: radial-gradient(circle, rgba(47,111,237,0.45), rgba(47,111,237,0.08) 60%, rgba(47,111,237,0) 72%);
    }
    .z-town .is-approx .bubble::before { width: 84px; height: 84px; }
    .car { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
    .car svg { width: 46px; height: 46px; filter: drop-shadow(0 0 8px var(--ring)) drop-shadow(0 4px 8px rgba(0,0,0,0.6)); transition: transform 0.4s ease; }
    .z-town .car { width: 34px; height: 34px; }
    .z-town .car svg { width: 34px; height: 34px; }
    .me .bubble { width: 58px; height: 58px; }
    .z-town .me .bubble { width: 42px; height: 42px; }
    .z-region .me .bubble { width: 34px; height: 34px; }
    .me .ring { box-shadow: 0 0 0 2px #0E1320, 0 0 22px 4px var(--ring), 0 6px 16px rgba(0,0,0,0.55); }
    .me .bubble::after {
      content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid var(--ring);
      animation: pulse 2.4s ease-out infinite;
    }
    .me .initials { font-size: 18px; }
    .z-town .me .initials, .z-region .me .initials { font-size: 13px; }
    .me.is-ghost .ring { border-style: dashed; opacity: 0.6; box-shadow: 0 0 0 2px #0E1320; }
    .me.is-ghost .bubble::after { display: none; }
    .pill {
      font-size: 10.5px; font-weight: 700; color: ${NIGHT.text}; background: rgba(21,26,37,0.88);
      border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 999px; display: flex; gap: 5px; align-items: center;
    }
    @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0; } }
    .cluster { display: flex; align-items: center; }
    .cluster .ring { position: relative; width: 38px; height: 38px; border-width: 2.5px; }
    .z-town .cluster .ring { width: 30px; height: 30px; border-width: 2px; }
    .cluster .ring + .ring { margin-left: -12px; }
    .z-town .cluster .ring + .ring { margin-left: -10px; }
    .cluster .more { font-weight: 800; font-size: 12px; color: ${NIGHT.background}; }
    .z-town .cluster .more { font-size: 11px; }
    .tile {
      position: relative; width: 44px; height: 44px; border-radius: 14px;
      border: 2px solid var(--kc); display: flex; align-items: center; justify-content: center;
      background: linear-gradient(180deg, var(--kf), var(--kf2)), #1C2230;
      box-shadow: 0 0 18px var(--kg), 0 6px 14px rgba(0,0,0,0.5);
    }
    .tile svg { width: 28px; height: 28px; }
    .z-town .tile { width: 32px; height: 32px; border-radius: 10px; border-width: 1.5px; }
    .z-town .tile svg { width: 20px; height: 20px; }
    .k-ragg { --kc: ${NIGHT.accent}; --kf: rgba(255,138,61,0.55); --kf2: rgba(255,138,61,0.3); --kg: rgba(255,138,61,0.55); }
    .k-meet { --kc: ${NIGHT.brandOnSurface}; --kf: rgba(47,111,237,0.7); --kf2: rgba(47,111,237,0.4); --kg: rgba(47,111,237,0.6); }
    .k-warn { --kc: ${NIGHT.warning}; --kf: rgba(245,197,24,0.42); --kf2: rgba(245,197,24,0.22); --kg: rgba(245,197,24,0.5); }
    .kdot { width: 12px; height: 12px; border-radius: 4px; background: var(--kc); box-shadow: 0 0 0 2px #0E1320, 0 0 10px var(--kg); }
    .tile.live { animation: live 1.8s ease-out infinite; }
    @keyframes live { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6), 0 6px 14px rgba(0,0,0,0.5); } 100% { box-shadow: 0 0 0 12px rgba(34,197,94,0), 0 6px 14px rgba(0,0,0,0.5); } }
    .count {
      position: absolute; top: -8px; right: -8px; min-width: 18px; padding: 2px 5px; border-radius: 8px;
      background: ${NIGHT.success}; color: #06210F; font-size: 10px; font-weight: 800; text-align: center; border: 2px solid #0E1320;
    }
    .tile .timer { position: absolute; left: -8px; top: -8px; width: calc(100% + 16px); height: calc(100% + 16px); pointer-events: none; }
    .timer rect { fill: none; stroke-width: 3; stroke-linecap: round; }
    .timer .track { stroke: rgba(255,255,255,0.22); }
    .timer .left { stroke: ${NIGHT.text}; }
    .timer.low .left { stroke: ${NIGHT.accent}; }
    .pin svg { width: 46px; height: 46px; filter: drop-shadow(0 0 10px rgba(47,111,237,0.8)); }
    .spot.is-hot::before {
      content: ''; position: absolute; left: 50%; top: 50%; width: 160px; height: 160px; transform: translate(-50%,-50%);
      border-radius: 50%; background: radial-gradient(circle, rgba(255,138,61,0.32), rgba(255,138,61,0.08) 45%, rgba(255,138,61,0) 70%);
      pointer-events: none; z-index: -1;
    }
    .pill .cam { display: inline-flex; align-items: center; gap: 2px; color: ${NIGHT.textSecondary}; }
    .pill .cam svg { width: 13px; height: 13px; }
    .pill .n { background: ${NIGHT.success}; color: #06210F; padding: 1px 5px; border-radius: 6px; font-weight: 800; }
    .pill .t { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
    .pill .when { color: ${NIGHT.brandOnSurface}; }
    .press-ring {
      width: 64px; height: 64px; border-radius: 50%; border: 2px solid ${NIGHT.brandOnSurface}; display: flex; align-items: center; justify-content: center;
      animation: pressGrow ${LONG_PRESS_MS}ms ease-out forwards;
    }
    .press-ring::after { content: ''; width: 14px; height: 14px; border-radius: 50%; background: ${NIGHT.brandOnSurface}; }
    @keyframes pressGrow { from { transform: scale(0.4); opacity: 0.3; } to { transform: scale(1); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .me .bubble::after, .tile.live { animation: none; } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
  <script>
    function sendToNative(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    const map = new maplibregl.Map({
      container: 'map',
      style: '${STYLE_URL}',
      center: [${SWEDEN_CENTER.lng}, ${SWEDEN_CENTER.lat}],
      zoom: ${SWEDEN_CENTER.zoom},
      attributionControl: false,
      maxPitch: 60,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-left');

    const NIGHT_PAINT = {
      background: { 'background-color': '#0E1320' },
      water: { 'fill-color': '#0A1626' },
      waterway: { 'line-color': '#0A1626' },
      landcover_wood: { 'fill-color': '#0F1D1B', 'fill-opacity': 0.8 },
      landuse_park: { 'fill-color': '#0F1D1B' },
      landuse_residential: { 'fill-color': '#111725', 'fill-opacity': 0.6 },
      building: { 'fill-color': '#161C2A' },
      highway_path: { 'line-color': '#18202F' },
      highway_minor: { 'line-color': '#1B2334' },
      highway_major_casing: { 'line-color': '#0E1320' },
      highway_major_inner: { 'line-color': '#2A3550' },
      highway_major_subtle: { 'line-color': '#2A3550' },
      highway_motorway_casing: { 'line-color': '#0E1320' },
      highway_motorway_inner: { 'line-color': '#5C3B26' },
      highway_motorway_subtle: { 'line-color': '#5C3B26' },
      railway: { 'line-color': '#1F2636' },
      railway_dashline: { 'line-color': '#0E1320' },
      railway_minor: { 'line-color': '#1F2636' },
      railway_transit: { 'line-color': '#1F2636' },
    };
    const DUSK_PAINT = {
      background: { 'background-color': '#161D2E' },
      water: { 'fill-color': '#102238' },
      waterway: { 'line-color': '#102238' },
      landcover_wood: { 'fill-color': '#15271F', 'fill-opacity': 0.8 },
      landuse_park: { 'fill-color': '#15271F' },
      landuse_residential: { 'fill-color': '#1A2234', 'fill-opacity': 0.6 },
      building: { 'fill-color': '#202940' },
      highway_path: { 'line-color': '#222C40' },
      highway_minor: { 'line-color': '#28334A' },
      highway_major_casing: { 'line-color': '#161D2E' },
      highway_major_inner: { 'line-color': '#3A4766' },
      highway_major_subtle: { 'line-color': '#3A4766' },
      highway_motorway_casing: { 'line-color': '#161D2E' },
      highway_motorway_inner: { 'line-color': '#6E4A30' },
      highway_motorway_subtle: { 'line-color': '#6E4A30' },
      railway: { 'line-color': '#2A3347' },
      railway_dashline: { 'line-color': '#161D2E' },
      railway_minor: { 'line-color': '#2A3347' },
      railway_transit: { 'line-color': '#2A3347' },
      'road-glow': { 'line-opacity': 0.12 },
      'building-3d': { 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#1F283C', 40, '#2B3654'] },
    };
    NIGHT_PAINT['road-glow'] = { 'line-opacity': 0.3 };
    NIGHT_PAINT['building-3d'] = { 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#151B29', 30, '#22283A', 60, '#3A2E2A'] };

    function sunAltitude(ms, lat, lng) {
      const rad = Math.PI / 180;
      const d = (ms - 946728000000) / 86400000;
      const M = rad * (357.5291 + 0.98560028 * d);
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
      const L = M + C + rad * 102.9372 + Math.PI;
      const e = rad * 23.4397;
      const dec = Math.asin(Math.sin(e) * Math.sin(L));
      const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
      const H = rad * (280.16 + 360.9856235 * d) + rad * lng - ra;
      const phi = rad * lat;
      return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;
    }
    let mood = null;
    function applyMood() {
      if (!map.isStyleLoaded()) return;
      const c = map.getCenter();
      const next = sunAltitude(Date.now(), c.lat, c.lng) < -0.83 ? 'night' : 'dusk';
      if (next === mood) return;
      mood = next;
      const paint = next === 'night' ? NIGHT_PAINT : DUSK_PAINT;
      Object.keys(paint).forEach(function (id) { setPaint(id, paint[id]); });
    }
    setInterval(applyMood, 5 * 60 * 1000);
    map.on('moveend', function () { if (map.getZoom() < 9) return; applyMood(); });

    let heatCells = [];
    function heatGeoJson() {
      return {
        type: 'FeatureCollection',
        features: heatCells.map(function (cell) {
          return { type: 'Feature', properties: { people: cell.people }, geometry: { type: 'Point', coordinates: [cell.lng, cell.lat] } };
        }),
      };
    }
    function renderHeat() {
      const source = map.getSource('evening-heat');
      if (source) source.setData(heatGeoJson());
    }

    const TEXT_LAYERS = ['water_name', 'highway_name_other', 'highway_name_motorway', 'place_other', 'place_suburb', 'place_village', 'place_town', 'place_city', 'place_city_large', 'place_state', 'place_country_other', 'place_country_minor', 'place_country_major'];

    function setPaint(id, props) {
      if (!map.getLayer(id)) return;
      Object.keys(props).forEach(function (key) {
        try { map.setPaintProperty(id, key, props[key]); } catch (e) {}
      });
    }

    map.on('style.load', function () {
      Object.keys(NIGHT_PAINT).forEach(function (id) { setPaint(id, NIGHT_PAINT[id]); });
      TEXT_LAYERS.forEach(function (id) {
        setPaint(id, { 'text-color': '${NIGHT.textSecondary}', 'text-halo-color': '${NIGHT.background}', 'text-halo-width': 1.4 });
      });
      if (map.getLayer('highway_major_casing')) {
        map.addLayer({
          id: 'road-glow',
          type: 'line',
          source: 'openmaptiles',
          'source-layer': 'transportation',
          filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '${NIGHT.accent}', '${NIGHT.brand}'],
            'line-opacity': 0.22,
            'line-blur': 6,
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 3, 14, 14, 18, 40],
          },
        }, 'highway_major_casing');
      }
      if (map.getLayer('building')) {
        map.setLayerZoomRange('building', 0, 15);
        map.addLayer({
          id: 'building-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#151B29', 40, '#1F2840'],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.92,
          },
        });
      }
      map.addSource('evening-heat', { type: 'geojson', data: heatGeoJson() });
      map.addLayer({
        id: 'evening-heat',
        type: 'heatmap',
        source: 'evening-heat',
        maxzoom: 17,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'people'], 2, 0.5, 6, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 15, 1.4],
          'heatmap-radius': ['interpolate', ['exponential', 1.6], ['zoom'], 9, 12, 13, 40, 16, 110],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(255,138,61,0)', 0.3, 'rgba(255,138,61,0.25)', 0.7, 'rgba(255,138,61,0.5)', 1, 'rgba(255,190,120,0.7)'],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0.85, 17, 0],
        },
      }, map.getLayer('highway_name_other') ? 'highway_name_other' : undefined);
      mood = null;
      applyMood();
    });

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
      });
    }
    function initials(label) {
      return escapeHtml(String(label || '?').split(/\\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('') || '?');
    }

    function stepFor(zoom) {
      if (zoom >= ${STREET_ZOOM}) return 'street';
      if (zoom >= ${TOWN_ZOOM}) return 'town';
      return 'region';
    }
    let step = stepFor(map.getZoom());
    document.body.className = 'z-' + step;
    const STACK_PX = { street: 46, town: 34, region: 16 };

    function carTop(color) {
      return '<svg viewBox="0 0 48 48" fill="none"><rect x="13" y="5" width="22" height="38" rx="8" fill="' + color + '"/><rect x="13" y="5" width="22" height="38" rx="8" stroke="${NIGHT.text}" stroke-width="2.5"/><path d="M16.5 15.5h15l-2 6h-11zM17.5 34h13l-1.5-4.5h-10z" fill="#0E1320" fill-opacity=".85"/><path d="M17 7.5h3M28 7.5h3" stroke="#FFF6D6" stroke-width="2.4" stroke-linecap="round"/></svg>';
    }
    function faceHtml(p) {
      return p.avatarUrl
        ? '<img src="' + escapeHtml(p.avatarUrl) + '" />'
        : '<span class="initials">' + initials(p.label) + '</span>';
    }
    function isDriving(p) {
      const fresh = !p.updatedAt || Date.now() - p.updatedAt < ${MOVING_FRESH_MS};
      return !!p.moving && fresh && !p.approximate && !p.ghost;
    }
    function isStale(p) {
      return !!p.updatedAt && Date.now() - p.updatedAt >= ${STALE_MS};
    }
    function agoText(ms) {
      const min = Math.floor(ms / 60000);
      if (min < 60) return min + ' min sedan';
      const h = Math.floor(min / 60);
      return h < 24 ? h + ' h sedan' : 'över ett dygn sedan';
    }
    function statusHtml(p) {
      if (step !== 'street' || !p.status || !p.statusExpiresAt || p.statusExpiresAt <= Date.now()) return '';
      return '<span class="status-bubble">' + escapeHtml(p.status) + '</span>';
    }
    function personHtml(p, below, isMe) {
      if (step === 'region' && !isMe) return '<div class="dot"></div>';
      const body = isDriving(p) && step !== 'region'
        ? '<div class="car"><span data-heading="' + (p.heading == null ? '' : p.heading) + '">' + carTop(p.ring) + '</span></div>'
        : '<div class="bubble"><div class="ring">' + faceHtml(p) + '</div></div>';
      return statusHtml(p) + body + (below || '');
    }
    function applyHeadings(el) {
      el.querySelectorAll('[data-heading]').forEach(function (node) {
        const raw = node.getAttribute('data-heading');
        const svg = node.querySelector('svg');
        if (!svg) return;
        const deg = raw === '' ? 0 : Number(raw) - map.getBearing();
        svg.style.transform = 'rotate(' + deg + 'deg)';
      });
    }

    let friends = [];
    let me = null;
    const friendMarkers = {};
    const clusterMarkers = [];
    let meMarker = null;

    function setClasses(el, cls) {
      const keep = Array.prototype.filter.call(el.classList, function (c) { return c.indexOf('maplibregl-') === 0; });
      el.className = cls + (keep.length ? ' ' + keep.join(' ') : '');
    }
    function makeEl(className, html) {
      const el = document.createElement('div');
      el.className = className;
      el.innerHTML = html;
      return el;
    }

    function renderMe() {
      if (!me) {
        if (meMarker) { meMarker.remove(); meMarker = null; }
        return;
      }
      const cls = 'mk person me' + (me.ghost ? ' is-ghost' : '') + (me.approximate ? ' is-approx' : '');
      const below = me.ghost && step === 'street' ? '<span class="below pill">Spökläge · bara du ser dig</span>' : '';
      const html = personHtml(me, below, true);
      if (!meMarker) {
        const el = makeEl(cls, html);
        el.addEventListener('click', function (e) { e.stopPropagation(); sendToNative({ type: 'ME_TAP' }); });
        meMarker = new maplibregl.Marker({ element: el }).setLngLat([me.lng, me.lat]).addTo(map);
      } else {
        const el = meMarker.getElement();
        setClasses(el, cls);
        el.innerHTML = html;
        meMarker.setLngLat([me.lng, me.lat]);
      }
      meMarker.getElement().style.setProperty('--ring', me.ring);
      applyHeadings(meMarker.getElement());
    }

    function clearClusters() {
      while (clusterMarkers.length) clusterMarkers.pop().remove();
    }

    function groupFriends() {
      const reach = STACK_PX[step];
      const placed = [];
      friends.forEach(function (f) {
        const pt = map.project([f.lng, f.lat]);
        const hit = placed.find(function (g) { return Math.hypot(g.x - pt.x, g.y - pt.y) < reach; });
        if (hit) { hit.members.push(f); }
        else { placed.push({ x: pt.x, y: pt.y, members: [f] }); }
      });
      return placed;
    }

    function friendLabel(f) {
      if (step !== 'street') return '';
      const extra = isStale(f)
        ? ' <span class="ago">· ' + agoText(Date.now() - f.updatedAt) + '</span>'
        : isDriving(f) ? ' · kör' : '';
      return '<span class="below label">' + escapeHtml(f.label) + extra + '</span>';
    }

    function renderFriends() {
      clearClusters();
      const groups = groupFriends();
      const solo = {};
      groups.forEach(function (g) {
        if (g.members.length === 1) { solo[g.members[0].id] = g.members[0]; return; }
        const shown = g.members.slice(0, 2);
        const rest = g.members.length - shown.length;
        const html = step === 'region' ? '<div class="dot many">' + g.members.length + '</div>' : '<div class="cluster">' + shown.map(function (f) {
          return '<div class="ring" style="--ring:' + f.ring + '">' + faceHtml(f) + '</div>';
        }).join('') + (rest > 0 ? '<div class="ring" style="--ring:${NIGHT.text};background:${NIGHT.text}"><span class="more">+' + rest + '</span></div>' : '') +
          '</div>' + (step === 'street' ? '<span class="below label">' + g.members.length + ' kompisar här</span>' : '');
        const el = makeEl('mk person', html);
        const lngLat = map.unproject([g.x, g.y]);
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          map.easeTo({ center: lngLat, zoom: Math.min(map.getZoom() + 2.5, 18) });
        });
        clusterMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map));
      });
      Object.keys(friendMarkers).forEach(function (id) {
        if (!solo[id]) { friendMarkers[id].remove(); delete friendMarkers[id]; }
      });
      Object.keys(solo).forEach(function (id) {
        const f = solo[id];
        const cls = 'mk person' + (f.approximate ? ' is-approx' : '') + (isStale(f) ? ' is-stale' : '');
        const html = personHtml(f, friendLabel(f), false);
        if (friendMarkers[id]) {
          const el = friendMarkers[id].getElement();
          setClasses(el, cls);
          el.innerHTML = html;
          el.style.setProperty('--ring', f.ring);
          friendMarkers[id].setLngLat([f.lng, f.lat]);
        } else {
          const el = makeEl(cls, html);
          el.style.setProperty('--ring', f.ring);
          el.addEventListener('click', function (e) {
            e.stopPropagation();
            const current = friends.find(function (x) { return x.id === id; });
            if (current) map.easeTo({ center: [current.lng, current.lat], zoom: Math.max(map.getZoom(), 15) });
            sendToNative({ type: 'FRIEND_TAP', id: id });
          });
          friendMarkers[id] = new maplibregl.Marker({ element: el }).setLngLat([f.lng, f.lat]).addTo(map);
        }
        applyHeadings(friendMarkers[id].getElement());
      });
    }
    setInterval(renderFriends, 60000);

    function timerHtml(item) {
      if (!item.mine || !item.expiresAt || !item.createdAt || step === 'region') return '';
      const total = item.expiresAt - item.createdAt;
      const left = item.expiresAt - Date.now();
      if (total <= 0 || left <= 0) return '';
      const share = Math.max(2, Math.min(100, Math.round((left / total) * 100)));
      return '<svg class="timer' + (left < ${TIMER_LOW_MS} ? ' low' : '') + '" viewBox="0 0 60 60"><rect class="track" x="2" y="2" width="56" height="56" rx="18"/>' +
        '<rect class="left" x="2" y="2" width="56" height="56" rx="18" pathLength="100" stroke-dasharray="' + share + ' 100"/></svg>';
    }
    function tileHtml(kind, icon, inner, live) {
      if (step === 'region') return '<div class="kdot ' + kind + '"></div>';
      return '<div class="tile ' + kind + (live ? ' live' : '') + '">' + icon + (inner || '') + '</div>';
    }

    const meetupMarkers = {};
    let longPressFired = false;
    function meetupHtml(m) {
      const count = m.interestCount > 0 && step === 'street' ? '<span class="count">' + m.interestCount + '</span>' : '';
      const chip = step === 'street'
        ? '<span class="below pill"><span class="t">' + escapeHtml(m.title) + '</span><span class="when">· ' + escapeHtml(m.time) + '</span></span>'
        : '';
      return tileHtml('k-meet', m.icon || '${ICON_MEETUP}', count, m.hereNowCount > 0) + chip;
    }
    function attachLongPress(el, onLong) {
      let timer = null;
      el.addEventListener('touchstart', function () {
        longPressFired = false;
        timer = setTimeout(function () { longPressFired = true; timer = null; onLong(); }, ${LONG_PRESS_MS});
      }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach(function (t) {
        el.addEventListener(t, function () { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true });
      });
    }
    let meetups = [];
    function renderMeetups() {
      const ids = meetups.map(function (m) { return m.id; });
      Object.keys(meetupMarkers).forEach(function (id) {
        if (ids.indexOf(id) === -1) { meetupMarkers[id].remove(); delete meetupMarkers[id]; }
      });
      meetups.forEach(function (m) {
        if (meetupMarkers[m.id]) {
          meetupMarkers[m.id].getElement().innerHTML = meetupHtml(m);
          meetupMarkers[m.id].setLngLat([m.lng, m.lat]);
          return;
        }
        const el = makeEl('mk meet', meetupHtml(m));
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          if (longPressFired) { longPressFired = false; return; }
          sendToNative({ type: 'MEETUP_TAP', id: m.id });
        });
        attachLongPress(el, function () { sendToNative({ type: 'MEETUP_LONG_PRESS', id: m.id }); });
        meetupMarkers[m.id] = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      });
    }

    const spotMarkers = {};
    let spots = [];
    const CAM_MINI = '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="3" stroke="${NIGHT.text}" stroke-width="2"/><path d="m9 7 1.5-2.5h3L15 7" stroke="${NIGHT.text}" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3" stroke="${NIGHT.brandOnSurface}" stroke-width="2"/></svg>';
    function spotKindClass(sp) {
      return sp.kind === 'varning' ? 'k-warn' : 'k-ragg';
    }
    function spotHtml(sp) {
      const chip = sp.kind === 'varning'
        ? escapeHtml(sp.title)
        : escapeHtml(sp.title) + (sp.photoCount > 0 ? ' <span class="cam">' + CAM_MINI + sp.photoCount + '</span>' : '') +
          (sp.hereNow > 0 ? ' <span class="n">' + sp.hereNow + '</span>' : '');
      return tileHtml(spotKindClass(sp), sp.icon, timerHtml(sp), false) +
        (step === 'street' ? '<span class="below pill">' + chip + '</span>' : '');
    }
    function renderSpots() {
      const now = Date.now();
      const live = spots.filter(function (sp) { return !sp.expiresAt || sp.expiresAt > now; });
      const ids = live.map(function (sp) { return sp.id; });
      Object.keys(spotMarkers).forEach(function (id) {
        if (ids.indexOf(id) === -1) { spotMarkers[id].remove(); delete spotMarkers[id]; }
      });
      live.forEach(function (sp) {
        const cls = 'mk spot' + (sp.hereNow > 0 && step !== 'region' ? ' is-hot' : '');
        if (spotMarkers[sp.id]) {
          const el = spotMarkers[sp.id].getElement();
          setClasses(el, cls);
          el.innerHTML = spotHtml(sp);
          spotMarkers[sp.id].setLngLat([sp.lng, sp.lat]);
          return;
        }
        const el = makeEl(cls, spotHtml(sp));
        el.addEventListener('click', function (e) { e.stopPropagation(); sendToNative({ type: 'SPOT_TAP', id: sp.id }); });
        spotMarkers[sp.id] = new maplibregl.Marker({ element: el }).setLngLat([sp.lng, sp.lat]).addTo(map);
      });
    }
    setInterval(renderSpots, 30000);

    const postMarkers = {};
    let posts = [];
    function postHtml(pt) {
      if (step === 'region') return '<div class="pdot"></div>';
      const inner = pt.imageUrl
        ? '<img src="' + escapeHtml(pt.imageUrl) + '" alt="" />'
        : '<span class="initials">' + initials(pt.label) + '</span>';
      const chip = step === 'street' ? '<span class="below pill">' + escapeHtml(pt.label) + '</span>' : '';
      return '<div class="photo-pin"><div class="clip">' + inner + '</div></div>' + chip;
    }
    function renderPosts() {
      const now = Date.now();
      const live = posts.filter(function (pt) { return pt.expiresAt > now; });
      const ids = live.map(function (pt) { return pt.id; });
      Object.keys(postMarkers).forEach(function (id) {
        if (ids.indexOf(id) === -1) { postMarkers[id].remove(); delete postMarkers[id]; }
      });
      live.forEach(function (pt) {
        if (postMarkers[pt.id]) {
          postMarkers[pt.id].getElement().innerHTML = postHtml(pt);
          postMarkers[pt.id].setLngLat([pt.lng, pt.lat]);
          return;
        }
        const el = makeEl('mk drop', postHtml(pt));
        el.addEventListener('click', function (e) { e.stopPropagation(); sendToNative({ type: 'POST_TAP', id: pt.id }); });
        postMarkers[pt.id] = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([pt.lng, pt.lat]).addTo(map);
      });
    }
    setInterval(renderPosts, 60000);

    map.on('zoom', function () {
      const next = stepFor(map.getZoom());
      if (next === step) return;
      step = next;
      document.body.className = 'z-' + step;
      renderMe();
      renderFriends();
      renderMeetups();
      renderSpots();
      renderPosts();
    });

    let heatNoticed = false;
    function checkHeatInView() {
      if (heatNoticed || !heatCells.length || map.getZoom() < ${TOWN_ZOOM}) return;
      const bounds = map.getBounds();
      const seen = heatCells.some(function (cell) { return bounds.contains([cell.lng, cell.lat]); });
      if (!seen) return;
      heatNoticed = true;
      sendToNative({ type: 'HEAT_IN_VIEW' });
    }
    map.on('moveend', checkHeatInView);

    let draftSpot = null;
    function showDraftSpot(lat, lng) {
      if (draftSpot) draftSpot.remove();
      draftSpot = new maplibregl.Marker({ element: makeEl('mk pin', '${ICON_PIN}'), anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
    }
    function clearDraftSpot() {
      if (draftSpot) { draftSpot.remove(); draftSpot = null; }
    }

    let mapPressTimer = null;
    let mapPressStart = null;
    let pressRing = null;
    function cancelMapPress() {
      if (mapPressTimer) { clearTimeout(mapPressTimer); mapPressTimer = null; }
      if (pressRing) { pressRing.remove(); pressRing = null; }
    }
    map.on('touchstart', function (e) {
      cancelMapPress();
      if (placing) return;
      const touches = e.originalEvent && e.originalEvent.touches;
      if (!touches || touches.length !== 1) return;
      const target = e.originalEvent.target;
      if (target && target.closest && target.closest('.mk')) return;
      mapPressStart = e.point;
      const at = e.lngLat;
      pressRing = new maplibregl.Marker({ element: makeEl('', '<div class="press-ring"></div>') }).setLngLat(at).addTo(map);
      mapPressTimer = setTimeout(function () {
        mapPressTimer = null;
        if (pressRing) { pressRing.remove(); pressRing = null; }
        sendToNative({ type: 'MAP_LONG_PRESS', lat: at.lat, lng: at.lng });
      }, ${LONG_PRESS_MS});
    });
    map.on('touchmove', function (e) {
      if (!mapPressStart) return;
      if (Math.hypot(e.point.x - mapPressStart.x, e.point.y - mapPressStart.y) > 8) cancelMapPress();
    });
    map.on('touchend', cancelMapPress);
    map.on('touchcancel', cancelMapPress);
    map.on('dragstart', cancelMapPress);
    map.on('zoomstart', cancelMapPress);

    let placing = false;
    let draftMarker = null;
    map.on('click', function (e) {
      if (!placing || draftMarker) return;
      const el = makeEl('mk pin', '${ICON_PIN}');
      draftMarker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true }).setLngLat(e.lngLat).addTo(map);
      draftMarker.on('dragend', function () {
        const ll = draftMarker.getLngLat();
        sendToNative({ type: 'DRAFT_PIN_MOVED', lat: ll.lat, lng: ll.lng });
      });
      sendToNative({ type: 'DRAFT_PIN_SET', lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('moveend', renderFriends);

    let following = false;
    function setFollowing(value) {
      if (following === value) return;
      following = value;
      sendToNative({ type: 'FOLLOW_CHANGED', following: value });
    }
    function followMe(first) {
      if (!following || !me) return;
      const opts = { center: [me.lng, me.lat], duration: first ? 1200 : 1000, easing: function (t) { return t; }, essential: true };
      if (me.moving) {
        opts.zoom = Math.max(map.getZoom(), 16);
        opts.pitch = 55;
        if (me.heading != null) opts.bearing = me.heading;
      } else if (first) {
        opts.zoom = Math.max(map.getZoom(), 15.5);
        opts.pitch = 45;
      }
      map.easeTo(opts);
    }
    function stopFollowingOnGesture(e) {
      if (e && e.originalEvent) setFollowing(false);
    }
    map.on('dragstart', function () { setFollowing(false); });
    map.on('zoomstart', stopFollowingOnGesture);
    map.on('rotatestart', stopFollowingOnGesture);
    map.on('pitchstart', stopFollowingOnGesture);
    map.on('rotate', function () {
      if (meMarker) applyHeadings(meMarker.getElement());
      Object.keys(friendMarkers).forEach(function (id) { applyHeadings(friendMarkers[id].getElement()); });
    });

    function handleMessage(event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type === 'SET_FRIENDS') { friends = msg.friends; renderFriends(); }
      if (msg.type === 'SET_ME') { me = msg.me; renderMe(); followMe(false); }
      if (msg.type === 'FOLLOW_ME') { setFollowing(true); followMe(true); }
      if (msg.type === 'STOP_FOLLOW') setFollowing(false);
      if (msg.type === 'SET_MEETUPS') { meetups = msg.meetups; renderMeetups(); }
      if (msg.type === 'SET_SPOTS') { spots = msg.spots; renderSpots(); }
      if (msg.type === 'SET_POSTS') { posts = msg.posts; renderPosts(); }
      if (msg.type === 'SET_HEAT') { heatCells = msg.cells; renderHeat(); checkHeatInView(); }
      if (msg.type === 'SHOW_DRAFT_SPOT') showDraftSpot(msg.lat, msg.lng);
      if (msg.type === 'CLEAR_DRAFT_SPOT') clearDraftSpot();
      if (msg.type === 'CENTER_ON') {
        if (!msg.keepFollow) setFollowing(false);
        map.flyTo({ center: [msg.lng, msg.lat], zoom: msg.zoom || 15, pitch: msg.pitch == null ? map.getPitch() : msg.pitch, speed: 1.4 });
      }
      if (msg.type === 'START_PLACING') placing = true;
      if (msg.type === 'CANCEL_PLACING') {
        placing = false;
        if (draftMarker) { draftMarker.remove(); draftMarker = null; }
      }
    }
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
    map.on('load', function () { sendToNative({ type: 'MAP_READY' }); });
  </script>
</body>
</html>`;

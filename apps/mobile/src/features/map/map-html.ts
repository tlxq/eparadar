export const SWEDEN_CENTER = { lat: 62.0, lng: 15.0, zoom: 4 };
export const LONG_PRESS_MS = 450;
export const MOVING_FRESH_MS = 3 * 60 * 1000;

const MAPLIBRE_VERSION = '5.24.0';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

const ICON_MEETUP =
  '<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="10" width="34" height="30" rx="7" fill="#2F6FED" fill-opacity=".5"/><rect x="7" y="10" width="34" height="30" rx="7" stroke="#F4F6F9" stroke-width="3"/><path d="M16 6v8M32 6v8M7 19h34" stroke="#F4F6F9" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="29" r="3" fill="#7EA6FF"/><circle cx="29" cy="29" r="3" fill="#7EA6FF"/></svg>';

const ICON_PIN =
  '<svg viewBox="0 0 48 48" fill="none"><path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" fill="#2F6FED" fill-opacity=".55"/><path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" stroke="#F4F6F9" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="22" r="4.5" fill="#F4F6F9"/></svg>';

export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0E1320; }
    body { font-family: Inter, -apple-system, Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    .maplibregl-ctrl-attrib { background: rgba(14,19,32,0.7) !important; }
    .maplibregl-ctrl-attrib a, .maplibregl-ctrl-attrib-inner { color: #A2AAB8 !important; font-size: 9px; }
    .maplibregl-ctrl-attrib-button { filter: invert(1); }
    .mk { display: flex; flex-direction: column; align-items: center; pointer-events: auto; }
    .bubble { position: relative; width: 48px; height: 48px; }
    .ring {
      position: absolute; inset: 0; border-radius: 50%; border: 3px solid var(--ring);
      background: #1C2230; overflow: hidden; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 2px #0E1320, 0 6px 16px rgba(0,0,0,0.55);
    }
    .ring img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .initials { color: #F4F6F9; font-weight: 800; font-size: 15px; text-transform: uppercase; }
    .carbadge {
      position: absolute; right: -5px; bottom: -3px; width: 20px; height: 20px; border-radius: 50%;
      background: var(--ring); border: 2px solid #0E1320; display: flex; align-items: center; justify-content: center;
    }
    .carbadge svg { width: 12px; height: 12px; }
    .label {
      margin-top: 5px; font-size: 11px; font-weight: 700; color: #F4F6F9; white-space: nowrap;
      text-shadow: 0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9);
    }
    .is-approx .bubble::before {
      content: ''; position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; transform: translate(-50%,-50%);
      border-radius: 50%; background: radial-gradient(circle, rgba(47,111,237,0.45), rgba(47,111,237,0.08) 60%, rgba(47,111,237,0) 72%);
    }
    .car { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
    .car svg { width: 46px; height: 46px; filter: drop-shadow(0 0 8px var(--ring)) drop-shadow(0 4px 8px rgba(0,0,0,0.6)); transition: transform 0.4s ease; }
    .me .bubble { width: 58px; height: 58px; }
    .me .ring { box-shadow: 0 0 0 2px #0E1320, 0 0 22px 4px var(--ring), 0 6px 16px rgba(0,0,0,0.55); }
    .me .bubble::after {
      content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid var(--ring);
      animation: pulse 2.4s ease-out infinite;
    }
    .me .initials { font-size: 18px; }
    .me.is-ghost .ring { border-style: dashed; opacity: 0.6; box-shadow: 0 0 0 2px #0E1320; }
    .me.is-ghost .bubble::after { display: none; }
    .ghost-chip {
      margin-top: 5px; font-size: 10px; font-weight: 700; color: #F4F6F9; background: rgba(21,26,37,0.85);
      border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 999px; white-space: nowrap;
    }
    @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0; } }
    .cluster { display: flex; align-items: center; }
    .cluster .ring { position: relative; width: 38px; height: 38px; border-width: 2.5px; }
    .cluster .ring + .ring { margin-left: -12px; }
    .cluster .more { font-weight: 800; font-size: 12px; color: #0B0E14; }
    .tile {
      position: relative; width: 44px; height: 44px; border-radius: 14px; background: #1C2230;
      border: 1.5px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 22px rgba(47,111,237,0.55), 0 6px 14px rgba(0,0,0,0.5);
    }
    .tile svg { width: 28px; height: 28px; }
    .tile.live { animation: live 1.8s ease-out infinite; }
    @keyframes live { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6), 0 6px 14px rgba(0,0,0,0.5); } 100% { box-shadow: 0 0 0 12px rgba(34,197,94,0), 0 6px 14px rgba(0,0,0,0.5); } }
    .count {
      position: absolute; top: -7px; right: -7px; min-width: 18px; padding: 2px 5px; border-radius: 8px;
      background: #22C55E; color: #06210F; font-size: 10px; font-weight: 800; text-align: center; border: 2px solid #0E1320;
    }
    .pin svg { width: 46px; height: 46px; filter: drop-shadow(0 0 10px rgba(47,111,237,0.8)); }
    .spot { display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
    .spot .tile { box-shadow: 0 0 22px rgba(255,138,61,0.55), 0 6px 14px rgba(0,0,0,0.5); }
    .spot.is-warning .tile::after { content: ''; position: absolute; inset: -6px; border-radius: 18px; border: 2px dashed rgba(255,138,61,0.6); }
    .spot.is-hot::before {
      content: ''; position: absolute; left: 50%; top: 22px; width: 160px; height: 160px; transform: translate(-50%,-50%);
      border-radius: 50%; background: radial-gradient(circle, rgba(255,138,61,0.32), rgba(255,138,61,0.08) 45%, rgba(255,138,61,0) 70%);
      pointer-events: none; z-index: -1;
    }
    .chip {
      font-size: 10.5px; font-weight: 700; color: #F4F6F9; background: rgba(21,26,37,0.85); white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 999px; display: flex; gap: 5px; align-items: center;
    }
    .chip .n { background: #22C55E; color: #06210F; padding: 1px 5px; border-radius: 6px; font-weight: 800; }
    .press-ring {
      width: 64px; height: 64px; border-radius: 50%; border: 2px solid #7EA6FF; display: flex; align-items: center; justify-content: center;
      animation: pressGrow ${LONG_PRESS_MS}ms ease-out forwards;
    }
    .press-ring::after { content: ''; width: 14px; height: 14px; border-radius: 50%; background: #7EA6FF; }
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

    const PAINT = {
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
    const TEXT_LAYERS = ['water_name', 'highway_name_other', 'highway_name_motorway', 'place_other', 'place_suburb', 'place_village', 'place_town', 'place_city', 'place_city_large', 'place_state', 'place_country_other', 'place_country_minor', 'place_country_major'];

    function setPaint(id, props) {
      if (!map.getLayer(id)) return;
      Object.keys(props).forEach(function (key) {
        try { map.setPaintProperty(id, key, props[key]); } catch (e) {}
      });
    }

    map.on('style.load', function () {
      Object.keys(PAINT).forEach(function (id) { setPaint(id, PAINT[id]); });
      TEXT_LAYERS.forEach(function (id) {
        setPaint(id, { 'text-color': '#A2AAB8', 'text-halo-color': '#0B0E14', 'text-halo-width': 1.4 });
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
            'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#FF8A3D', '#2F6FED'],
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
    });

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
      });
    }
    function initials(label) {
      return escapeHtml(String(label || '?').split(/\\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('') || '?');
    }
    const CAR_MINI = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 15v-3l2.4-5h11.2L20 12v3z" fill="#fff" fill-opacity=".92"/><circle cx="8" cy="15.5" r="2" fill="#0E1320"/><circle cx="16" cy="15.5" r="2" fill="#0E1320"/></svg>';
    function carTop(color) {
      return '<svg viewBox="0 0 48 48" fill="none"><rect x="13" y="5" width="22" height="38" rx="8" fill="' + color + '"/><rect x="13" y="5" width="22" height="38" rx="8" stroke="#F4F6F9" stroke-width="2.5"/><path d="M16.5 15.5h15l-2 6h-11zM17.5 34h13l-1.5-4.5h-10z" fill="#0E1320" fill-opacity=".85"/><path d="M17 7.5h3M28 7.5h3" stroke="#FFF6D6" stroke-width="2.4" stroke-linecap="round"/></svg>';
    }
    function bubbleHtml(p) {
      const face = p.avatarUrl
        ? '<img src="' + escapeHtml(p.avatarUrl) + '" />'
        : '<span class="initials">' + initials(p.label) + '</span>';
      return '<div class="bubble"><div class="ring">' + face + '</div><span class="carbadge">' + CAR_MINI + '</span></div>';
    }
    function isDriving(p) {
      const fresh = !p.updatedAt || Date.now() - p.updatedAt < ${MOVING_FRESH_MS};
      return !!p.moving && fresh && !p.approximate && !p.ghost;
    }
    function personHtml(p, extraLabel) {
      const body = isDriving(p)
        ? '<div class="car"><span data-heading="' + (p.heading == null ? '' : p.heading) + '">' + carTop(p.ring) + '</span></div>'
        : bubbleHtml(p);
      return body + (extraLabel || '');
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
      const cls = 'mk me' + (me.ghost ? ' is-ghost' : '') + (me.approximate ? ' is-approx' : '');
      const extra = me.ghost ? '<span class="ghost-chip">Spökläge · bara du ser dig</span>' : '';
      const html = personHtml(me, extra);
      if (!meMarker) {
        const el = makeEl(cls, html);
        el.addEventListener('click', function (e) { e.stopPropagation(); sendToNative({ type: 'ME_TAP' }); });
        meMarker = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -29] }).setLngLat([me.lng, me.lat]).addTo(map);
      } else {
        const el = meMarker.getElement();
        el.className = cls;
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
      const placed = [];
      friends.forEach(function (f) {
        const pt = map.project([f.lng, f.lat]);
        const hit = placed.find(function (g) { return Math.hypot(g.x - pt.x, g.y - pt.y) < 46; });
        if (hit) { hit.members.push(f); }
        else { placed.push({ x: pt.x, y: pt.y, members: [f] }); }
      });
      return placed;
    }

    function renderFriends() {
      clearClusters();
      const groups = groupFriends();
      const solo = {};
      groups.forEach(function (g) {
        if (g.members.length === 1) { solo[g.members[0].id] = g.members[0]; return; }
        const shown = g.members.slice(0, 2);
        const rest = g.members.length - shown.length;
        const html = '<div class="cluster">' + shown.map(function (f) {
          const face = f.avatarUrl ? '<img src="' + escapeHtml(f.avatarUrl) + '" />' : '<span class="initials">' + initials(f.label) + '</span>';
          return '<div class="ring" style="--ring:' + f.ring + '">' + face + '</div>';
        }).join('') + (rest > 0 ? '<div class="ring" style="--ring:#F4F6F9;background:#F4F6F9"><span class="more">+' + rest + '</span></div>' : '') +
          '</div><span class="label">' + g.members.length + ' vänner här</span>';
        const el = makeEl('mk', html);
        const lngLat = map.unproject([g.x, g.y]);
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          map.easeTo({ center: lngLat, zoom: Math.min(map.getZoom() + 2.5, 18) });
        });
        clusterMarkers.push(new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -19] }).setLngLat(lngLat).addTo(map));
      });
      Object.keys(friendMarkers).forEach(function (id) {
        if (!solo[id]) { friendMarkers[id].remove(); delete friendMarkers[id]; }
      });
      Object.keys(solo).forEach(function (id) {
        const f = solo[id];
        const cls = 'mk' + (f.approximate ? ' is-approx' : '');
        const label = '<span class="label">' + escapeHtml(f.label) + (isDriving(f) ? ' · kör' : '') + '</span>';
        const html = personHtml(f, label);
        if (friendMarkers[id]) {
          const el = friendMarkers[id].getElement();
          el.className = cls;
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
          });
          friendMarkers[id] = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -24] }).setLngLat([f.lng, f.lat]).addTo(map);
        }
        applyHeadings(friendMarkers[id].getElement());
      });
    }

    const meetupMarkers = {};
    let longPressFired = false;
    function meetupHtml(m) {
      return '<div class="tile' + (m.hereNowCount > 0 ? ' live' : '') + '">${ICON_MEETUP}' +
        (m.interestCount > 0 ? '<span class="count">' + m.interestCount + '</span>' : '') + '</div>';
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
    function syncMeetups(meetups) {
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
        const el = makeEl('mk', meetupHtml(m));
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
    function remainingText(expiresAt) {
      const ms = expiresAt - Date.now();
      const min = Math.max(1, Math.round(ms / 60000));
      if (min < 60) return min + ' min kvar';
      const h = Math.floor(min / 60);
      const rest = min % 60;
      return h + ' h' + (rest ? ' ' + rest + ' min' : '') + ' kvar';
    }
    function spotHtml(sp) {
      const warning = sp.kind === 'varning';
      const chip = warning
        ? escapeHtml(sp.title) + ' · ' + remainingText(sp.expiresAt)
        : escapeHtml(sp.title) + (sp.hereNow > 0 ? ' <span class="n">' + sp.hereNow + '</span>' : '');
      return '<div class="tile">' + sp.icon + '</div><span class="chip">' + chip + '</span>';
    }
    function renderSpots() {
      const now = Date.now();
      const live = spots.filter(function (sp) { return !sp.expiresAt || sp.expiresAt > now; });
      const ids = live.map(function (sp) { return sp.id; });
      Object.keys(spotMarkers).forEach(function (id) {
        if (ids.indexOf(id) === -1) { spotMarkers[id].remove(); delete spotMarkers[id]; }
      });
      live.forEach(function (sp) {
        const cls = 'mk spot' + (sp.kind === 'varning' ? ' is-warning' : '') + (sp.hereNow > 0 ? ' is-hot' : '');
        if (spotMarkers[sp.id]) {
          const el = spotMarkers[sp.id].getElement();
          el.className = cls;
          el.innerHTML = spotHtml(sp);
          spotMarkers[sp.id].setLngLat([sp.lng, sp.lat]);
          return;
        }
        const el = makeEl(cls, spotHtml(sp));
        el.addEventListener('click', function (e) { e.stopPropagation(); sendToNative({ type: 'SPOT_TAP', id: sp.id }); });
        spotMarkers[sp.id] = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -22] }).setLngLat([sp.lng, sp.lat]).addTo(map);
      });
    }
    setInterval(renderSpots, 30000);

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
    map.on('rotate', function () {
      if (meMarker) applyHeadings(meMarker.getElement());
      Object.keys(friendMarkers).forEach(function (id) { applyHeadings(friendMarkers[id].getElement()); });
    });

    function handleMessage(event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type === 'SET_FRIENDS') { friends = msg.friends; renderFriends(); }
      if (msg.type === 'SET_ME') { me = msg.me; renderMe(); }
      if (msg.type === 'SET_MEETUPS') syncMeetups(msg.meetups);
      if (msg.type === 'SET_SPOTS') { spots = msg.spots; renderSpots(); }
      if (msg.type === 'SHOW_DRAFT_SPOT') showDraftSpot(msg.lat, msg.lng);
      if (msg.type === 'CLEAR_DRAFT_SPOT') clearDraftSpot();
      if (msg.type === 'CENTER_ON') {
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

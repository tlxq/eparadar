export type EveningKind = 'ragg' | 'varning' | 'meet';

export type EveningPoint = { id: string; kind: EveningKind; lat: number; lng: number };

export type PlottedPoint = EveningPoint & { x: number; y: number };

const EVENING_START_HOUR = 18;
const EVENING_END_HOUR = 4;
const NEARBY_KM = 30;

export function isEvening(now: Date = new Date()): boolean {
  const hour = now.getHours();
  return hour >= EVENING_START_HOUR || hour < EVENING_END_HOUR;
}

export function isLive(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() > now.getTime();
}

export function isTonight(startsAt: string, now: Date = new Date()): boolean {
  const start = new Date(startsAt).getTime();
  const windowStart = new Date(now);
  if (now.getHours() < EVENING_END_HOUR) windowStart.setDate(windowStart.getDate() - 1);
  windowStart.setHours(12, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);
  windowEnd.setHours(6, 0, 0, 0);
  return start >= windowStart.getTime() && start < windowEnd.getTime();
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * 111;
  const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export function plotPoints(
  points: EveningPoint[],
  width: number,
  height: number,
  padding = 18,
): PlottedPoint[] {
  if (points.length === 0 || width <= 0 || height <= 0) return [];
  const center = { lat: median(points.map((p) => p.lat)), lng: median(points.map((p) => p.lng)) };
  const near = points.filter((p) => kmBetween(center, p) <= NEARBY_KM);
  const cos = Math.cos((center.lat * Math.PI) / 180);
  const xs = near.map((p) => p.lng * cos);
  const ys = near.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.01);
  const spanY = Math.max(maxY - minY, 0.01);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return near.map((p, index) => ({
    ...p,
    x: width / 2 + (xs[index] - midX) * scale,
    y: height / 2 - (ys[index] - midY) * scale,
  }));
}

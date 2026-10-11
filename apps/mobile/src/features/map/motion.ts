const MOVING_SPEED_MPS = 2.5;

export function motionFromCoords(coords: { speed: number | null; heading: number | null }) {
  const moving = coords.speed !== null && coords.speed >= MOVING_SPEED_MPS;
  const heading =
    moving && coords.heading !== null && coords.heading >= 0 && coords.heading < 360
      ? coords.heading
      : null;
  return { moving, heading };
}

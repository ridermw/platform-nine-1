export const HERO = Object.freeze({
  position: [-4.25, 2.50, -8.1] as const,
  target: [2.75, 1.05, 34.0] as const,
  fov: 46,
  near: 0.08,
  far: 180,
});

export const WORLD = Object.freeze({
  platform: 0.8,
  edge: 1.70,
  wall: 7.4,
  length: 76,
  roofCenter: -0.7,
  roofRadius: 8.1,
  roofSpring: 5.5,
  roofRise: 5.0,
});

export const MODEL_NAMES = [
  'locomotive', 'tender', 'carriage', 'trolley', 'bench', 'sign', 'lantern',
] as const;
export type ModelName = typeof MODEL_NAMES[number];
export const assetURL = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function seededRandom(seed = 9034) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

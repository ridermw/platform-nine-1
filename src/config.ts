import camera from './hero-camera.json';

export const HERO = Object.freeze({
  position: [camera.position[0],camera.position[1],camera.position[2]] as const,
  target: [camera.target[0],camera.target[1],camera.target[2]] as const,
  fov: camera.fov,
  near: camera.near,
  far: camera.far,
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
  'locomotive', 'tender', 'carriage', 'carriage-far', 'trolley', 'bench', 'sign', 'lantern',
] as const;
export type ModelName = typeof MODEL_NAMES[number];
export const assetURL = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function seededRandom(seed = 9034) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

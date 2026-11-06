import type { ImageMetadata } from 'astro';

const all = import.meta.glob<{ default: ImageMetadata }>('../assets/work/*.jpg', { eager: true });

/** Get a project photo by number, e.g. work(22) -> assets/work/work-22.jpg */
export function work(n: number): ImageMetadata {
  const key = `../assets/work/work-${String(n).padStart(2, '0')}.jpg`;
  const mod = all[key];
  if (!mod) throw new Error(`Missing photo ${key}`);
  return mod.default;
}

/** Our Work gallery — order and alt text from the design file (work-13 intentionally excluded). */
export const gallery: { n: number; alt: string }[] = [
  [22, 'Kitchen, island and arched niche'],
  [23, 'Kitchen, island and stair'],
  [24, 'Kitchen, island straight on'],
  [25, 'Kitchen, range wall'],
  [26, 'Kitchen, galley view'],
  [27, 'Entry, stair and arched niche'],
  [28, 'Mudroom, bench'],
  [29, 'Primary bath, tower and shower'],
  [30, 'Primary bath, double vanity'],
  [31, 'Primary bath, walk-in shower'],
  [32, 'Hall bath, tub and walnut vanity'],
  [33, 'Hall bath, green tile tub'],
  [34, 'Guest bath, green tile shower'],
  [21, 'Kitchen, island'],
  [4, 'Kitchen, range'],
  [19, 'Kitchen, galley'],
  [10, 'Kitchen, sink wall'],
  [7, 'Kitchen, sink'],
  [16, 'Breakfast nook'],
  [2, 'Closet into bath'],
  [5, 'Bath, wood vanity'],
  [11, 'Bath, vanity angle'],
  [14, 'Detail, open vanity tower'],
  [8, 'Detail, wall faucet'],
  [18, 'Bath, shower and vanity'],
  [20, 'Shower, glass door'],
  [17, 'Shower, tile'],
  [1, 'Bath, white double vanity'],
  [3, 'Bath, double vanity and shower'],
  [9, 'Bath, wide'],
  [6, 'Walk-in shower'],
  [15, 'Shower, straight on'],
  [12, 'Detail, shower niche'],
].map(([n, alt]) => ({ n: n as number, alt: alt as string }));

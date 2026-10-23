import { createElement } from 'react'
import {
  BatteryChargingIcon,
  CableIcon,
  CameraIcon,
  CpuIcon,
  Gamepad2Icon,
  HeadphonesIcon,
  HouseIcon,
  LaptopIcon,
  type LucideIcon,
  type LucideProps,
  ShapesIcon,
  ShirtIcon,
  SmartphoneIcon,
  SpeakerIcon,
  TabletIcon,
  TvIcon,
  WatchIcon,
} from 'lucide-react'

// M61: how a category (or a product tile) is coloured and which icon stands in for a missing
// image. Moved out of CategoryRow.tsx so the header, the category tiles and the cards share one
// mapping. Client-safe: lucide icons and class names only, no Payload import.

const ICONS: Array<[RegExp, LucideIcon]> = [
  [/phone|mobile/i, SmartphoneIcon],
  [/watch|smartwatch/i, WatchIcon],
  [/head|ear|audio|sound/i, HeadphonesIcon],
  [/speaker/i, SpeakerIcon],
  [/laptop|computer|pc\b/i, LaptopIcon],
  [/tablet|ipad/i, TabletIcon],
  [/camera|photo/i, CameraIcon],
  [/game|gaming|console/i, Gamepad2Icon],
  [/tv|television|display|monitor/i, TvIcon],
  [/power|charg|battery/i, BatteryChargingIcon],
  [/cable|accessor/i, CableIcon],
  [/fashion|cloth|apparel|wear\b/i, ShirtIcon],
  [/home|living|kitchen|lamp/i, HouseIcon],
  [/electronic|gadget/i, CpuIcon],
]

function categoryIcon(category: { slug: string; title: string }): LucideIcon {
  const label = `${category.slug} ${category.title}`
  return ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? ShapesIcon
}

// The icon for a category. A component rather than a function that returns one, so callers do not
// create a component during render.
export function CategoryIcon({ category, ...props }: { category: { slug: string; title: string } } & LucideProps) {
  return createElement(categoryIcon(category), props)
}

// The design's six pastels. `tile` is the background, `ink` the icon colour and `link` the text
// colour that keeps 4.5:1 on that background. Class names are written out in full so Tailwind
// finds them.
export type Tint = { tile: string; ink: string; link: string }

export const TINTS: Tint[] = [
  { tile: 'bg-tint-lavender', ink: 'text-tint-lavender-ink', link: 'text-tint-lavender-link' },
  { tile: 'bg-tint-pink', ink: 'text-tint-pink-ink', link: 'text-tint-pink-link' },
  { tile: 'bg-tint-blue', ink: 'text-tint-blue-ink', link: 'text-tint-blue-link' },
  { tile: 'bg-tint-mint', ink: 'text-tint-mint-ink', link: 'text-tint-mint-link' },
  { tile: 'bg-tint-yellow', ink: 'text-tint-yellow-icon', link: 'text-tint-yellow-link' },
  { tile: 'bg-tint-peach', ink: 'text-tint-peach-ink', link: 'text-tint-peach-link' },
]

export function tintFor(index: number): Tint {
  return TINTS[((index % TINTS.length) + TINTS.length) % TINTS.length]
}

// Product image tiles use the paler sibling of each pastel so a photo reads against it.
const TILES = ['bg-tile-lavender', 'bg-tile-blue', 'bg-tile-pink', 'bg-tile-mint', 'bg-tile-peach', 'bg-tile-yellow']

// A stable tile for a product, so a card keeps its colour on every page and every render.
export function tileFor(id: number | string): string {
  const n = typeof id === 'number' ? id : [...String(id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return TILES[Math.abs(Math.trunc(n)) % TILES.length]
}

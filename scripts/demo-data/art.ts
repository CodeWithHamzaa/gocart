// M90: SVG artwork builders for the demo seed (scripts/seed-demo.ts). Flat gradients and vector
// shapes only, and no <text> anywhere, so the generated images carry no lettering, logos or
// trademarks. Each motif is tied to a category and each product gets its own hue, which keeps
// the 24 products distinguishable in /admin and on the storefront. sharp rasterises the SVG
// to WebP; flat colour keeps each file small.

export type Motif =
  | 'collection'
  | 'headphones'
  | 'speaker'
  | 'smartwatch'
  | 'powerbank'
  | 'watch'
  | 'bag'
  | 'sunglasses'
  | 'lamp'
  | 'kitchen'
  | 'skincare'
  | 'fragrance'

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + hue / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

type Palette = { bg1: string; bg2: string; main: string; accent: string; light: string }

function palette(hue: number): Palette {
  return {
    bg1: hslToHex(hue, 45, 92),
    bg2: hslToHex(hue + 30, 50, 74),
    main: hslToHex(hue, 55, 32),
    accent: hslToHex(hue + 160, 65, 58),
    light: '#ffffff',
  }
}

function motifShapes(motif: Motif, c: Palette): string {
  const { main: m, accent: a, light: l } = c
  switch (motif) {
    case 'headphones':
      return (
        `<path d="M330 640 A270 270 0 0 1 870 640" fill="none" stroke="${m}" stroke-width="48" stroke-linecap="round"/>` +
        `<rect x="290" y="600" width="120" height="230" rx="60" fill="${m}"/>` +
        `<rect x="790" y="600" width="120" height="230" rx="60" fill="${m}"/>` +
        `<rect x="330" y="640" width="60" height="150" rx="30" fill="${a}"/>` +
        `<rect x="810" y="640" width="60" height="150" rx="30" fill="${a}"/>`
      )
    case 'speaker':
      return (
        `<rect x="400" y="250" width="400" height="700" rx="70" fill="${m}"/>` +
        `<circle cx="600" cy="450" r="130" fill="${l}" opacity="0.9"/>` +
        `<circle cx="600" cy="450" r="85" fill="${a}"/>` +
        `<circle cx="600" cy="450" r="35" fill="${m}"/>` +
        `<circle cx="600" cy="760" r="100" fill="${l}" opacity="0.9"/>` +
        `<circle cx="600" cy="760" r="55" fill="${a}"/>`
      )
    case 'smartwatch':
      return (
        `<rect x="480" y="200" width="240" height="220" rx="40" fill="${a}"/>` +
        `<rect x="480" y="780" width="240" height="220" rx="40" fill="${a}"/>` +
        `<rect x="400" y="380" width="400" height="440" rx="110" fill="${m}"/>` +
        `<rect x="440" y="420" width="320" height="360" rx="80" fill="${l}" opacity="0.92"/>` +
        `<circle cx="600" cy="600" r="90" fill="${a}"/>` +
        `<path d="M600 600 L600 535 M600 600 L655 600" stroke="${m}" stroke-width="18" stroke-linecap="round" fill="none"/>`
      )
    case 'powerbank':
      return (
        `<rect x="400" y="220" width="400" height="760" rx="70" fill="${m}"/>` +
        `<rect x="540" y="250" width="120" height="40" rx="20" fill="${l}"/>` +
        `<rect x="400" y="480" width="400" height="24" fill="${a}" opacity="0.6"/>` +
        `<circle cx="600" cy="610" r="70" fill="${l}"/>` +
        [0, 1, 2, 3].map((i) => `<rect x="${450 + i * 80}" y="800" width="60" height="40" rx="10" fill="${a}"/>`).join('')
      )
    case 'watch': {
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6
        const x1 = 600 + Math.sin(angle) * 175
        const y1 = 600 - Math.cos(angle) * 175
        const x2 = 600 + Math.sin(angle) * 150
        const y2 = 600 - Math.cos(angle) * 150
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${m}" stroke-width="12" stroke-linecap="round"/>`
      }).join('')
      return (
        `<rect x="500" y="180" width="200" height="240" rx="30" fill="${a}"/>` +
        `<rect x="500" y="780" width="200" height="240" rx="30" fill="${a}"/>` +
        `<circle cx="600" cy="600" r="250" fill="${m}"/>` +
        `<circle cx="600" cy="600" r="205" fill="${l}"/>` +
        ticks +
        `<path d="M600 600 L600 470 M600 600 L700 640" stroke="${m}" stroke-width="16" stroke-linecap="round" fill="none"/>` +
        `<circle cx="600" cy="600" r="18" fill="${a}"/>`
      )
    }
    case 'bag':
      return (
        `<path d="M470 480 C470 280 730 280 730 480" fill="none" stroke="${m}" stroke-width="36" stroke-linecap="round"/>` +
        `<path d="M360 480 L840 480 L900 920 L300 920 Z" fill="${m}" stroke="${m}" stroke-width="30" stroke-linejoin="round"/>` +
        `<path d="M360 480 L840 480 L810 620 L390 620 Z" fill="${a}"/>` +
        `<circle cx="600" cy="640" r="28" fill="${l}"/>`
      )
    case 'sunglasses':
      return (
        `<path d="M520 570 Q600 510 680 570" fill="none" stroke="${m}" stroke-width="28" stroke-linecap="round"/>` +
        `<path d="M250 560 L170 520 M950 560 L1030 520" stroke="${m}" stroke-width="28" stroke-linecap="round"/>` +
        `<rect x="250" y="520" width="300" height="220" rx="100" fill="${m}"/>` +
        `<rect x="650" y="520" width="300" height="220" rx="100" fill="${m}"/>` +
        `<ellipse cx="350" cy="590" rx="55" ry="25" fill="${l}" opacity="0.35" transform="rotate(-20 350 590)"/>` +
        `<ellipse cx="750" cy="590" rx="55" ry="25" fill="${l}" opacity="0.35" transform="rotate(-20 750 590)"/>` +
        `<rect x="250" y="520" width="300" height="220" rx="100" fill="none" stroke="${a}" stroke-width="12"/>` +
        `<rect x="650" y="520" width="300" height="220" rx="100" fill="none" stroke="${a}" stroke-width="12"/>`
      )
    case 'lamp':
      return (
        `<circle cx="600" cy="660" r="190" fill="${a}" opacity="0.3"/>` +
        `<path d="M440 300 L760 300 L860 560 L340 560 Z" fill="${m}"/>` +
        `<rect x="585" y="560" width="30" height="310" fill="${m}"/>` +
        `<ellipse cx="600" cy="880" rx="170" ry="34" fill="${a}"/>` +
        `<ellipse cx="600" cy="560" rx="260" ry="22" fill="${l}" opacity="0.55"/>`
      )
    case 'kitchen':
      return (
        `<rect x="780" y="585" width="320" height="70" rx="35" fill="${m}"/>` +
        `<circle cx="540" cy="620" r="270" fill="${m}"/>` +
        `<circle cx="540" cy="620" r="205" fill="${a}" opacity="0.55"/>` +
        `<circle cx="540" cy="620" r="150" fill="${l}" opacity="0.3"/>` +
        `<circle cx="1060" cy="620" r="14" fill="${l}"/>`
      )
    case 'skincare':
      return (
        `<rect x="500" y="280" width="200" height="160" rx="30" fill="${a}"/>` +
        `<rect x="440" y="420" width="320" height="500" rx="70" fill="${m}"/>` +
        `<rect x="480" y="560" width="240" height="200" rx="30" fill="${l}" opacity="0.9"/>` +
        `<circle cx="600" cy="660" r="50" fill="${a}"/>`
      )
    case 'fragrance':
      return (
        `<rect x="520" y="250" width="160" height="150" rx="24" fill="${m}"/>` +
        `<rect x="550" y="390" width="100" height="90" fill="${l}"/>` +
        `<rect x="400" y="470" width="400" height="430" rx="60" fill="${m}" opacity="0.92"/>` +
        `<rect x="430" y="620" width="340" height="250" rx="40" fill="${a}" opacity="0.8"/>` +
        `<circle cx="880" cy="400" r="14" fill="${a}"/>` +
        `<circle cx="930" cy="340" r="9" fill="${a}"/>` +
        `<circle cx="320" cy="380" r="11" fill="${a}"/>`
      )
    case 'collection':
    default:
      return (
        `<circle cx="480" cy="640" r="200" fill="${m}"/>` +
        `<circle cx="720" cy="640" r="200" fill="${a}" opacity="0.8"/>` +
        `<rect x="470" y="330" width="260" height="260" rx="60" fill="${l}" opacity="0.85"/>`
      )
  }
}

/**
 * One 1200x1200 SVG string. variant 1 is the straight-on view; variant 2 changes the background
 * angle, tilts and shrinks the motif and adds decorative circles, so the two images of a product
 * differ without any photography. Deterministic for a given (motif, hue, variant).
 */
export function renderArt(motif: Motif, hue: number, variant: 1 | 2): string {
  const c = palette(hue)
  const gradient =
    variant === 1
      ? '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
      : '<linearGradient id="bg" x1="1" y1="0" x2="0" y2="1">'
  const decor =
    variant === 2
      ? `<circle cx="1000" cy="200" r="260" fill="${c.accent}" opacity="0.18"/>` +
        `<circle cx="150" cy="1050" r="200" fill="${c.main}" opacity="0.12"/>`
      : `<circle cx="200" cy="200" r="150" fill="${c.light}" opacity="0.35"/>`
  const transform =
    variant === 2 ? ' transform="translate(600 600) scale(0.82) rotate(-6) translate(-600 -600)"' : ''
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">' +
    `<defs>${gradient}<stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient></defs>` +
    '<rect width="1200" height="1200" fill="url(#bg)"/>' +
    decor +
    '<ellipse cx="600" cy="1010" rx="270" ry="26" fill="#000000" opacity="0.12"/>' +
    `<g${transform}>${motifShapes(motif, c)}</g>` +
    '</svg>'
  )
}

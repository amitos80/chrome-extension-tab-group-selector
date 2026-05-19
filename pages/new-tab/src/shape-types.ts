/** CSS class names matching shape definitions in NewTab.scss */
export const shapeTypes = [
  'squircle',
  'blob',
  'dashed-circle',
  'sector',
  'arc',
  'breadcrumb',
  'folded-rectangle',
  'curved-rectangle',
  'pointy-box',
  'circle-cut',
  'triangle-cut',
  'polygon',
  'cube',
  'matrix-cubes',
  'thunder',
  'film-strip',
  'pixel-corner',
  'sparkle',
  'spiral',
  'lollipop',
  //'yin-yang',
  'infinity',
] as const

export type ShapeType = (typeof shapeTypes)[number]

/** Shape motion loops — keyframes defined in NewTab.scss */
export const ANIMATION_KEYS = ['rotate', 'pulse', 'float', 'slide'] as const

export type ShapeAnimationKey = (typeof ANIMATION_KEYS)[number]

/** WHY: Fisher–Yates avoids duplicates when sampling fewer than the full palette. */
export const pickEightRandomShapes = (): ShapeType[] => {
  const deck = [...shapeTypes]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck.slice(0, 8)
}

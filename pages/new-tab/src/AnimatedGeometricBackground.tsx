import { ANIMATION_KEYS, pickEightRandomShapes } from './shape-types'
import { useEffect, useMemo, useRef } from 'react'
import type { ShapeAnimationKey, ShapeType } from './shape-types'

const PARTICLE_COUNT = 100
const MOUSE_SPEED = 0.05

const randomAnimation = (): ShapeAnimationKey => {
  const idx = Math.floor(Math.random() * ANIMATION_KEYS.length)
  return ANIMATION_KEYS[idx] ?? 'rotate'
}

const shapeMotionStyles = (
  animation: ShapeAnimationKey,
): {
  animationTimingFunction: string
  animationDirection?: 'alternate'
} => {
  switch (animation) {
    case 'pulse':
      return { animationTimingFunction: 'linear', animationDirection: 'alternate' }
    case 'float':
      return { animationTimingFunction: 'ease-in-out' }
    default:
      return { animationTimingFunction: 'linear' }
  }
}

type ShapeConfig = {
  shapeClass: ShapeType
  animation: ShapeAnimationKey
  delayS: number
  durationS: number
}

/** Full-viewport decorative layer: particles, shapes, vignette; mouse nudges shapes via refs (no per-frame React state). */
const AnimatedGeometricBackground = () => {
  const { shapeConfigs, positions } = useMemo(() => {
    const classes = pickEightRandomShapes()
    const configs: ShapeConfig[] = classes.map(shapeClass => ({
      shapeClass,
      animation: randomAnimation(),
      delayS: Math.random() * 10,
      durationS: Math.random() * 10 + 10,
    }))
    const pos = classes.map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
    }))
    return { shapeConfigs: configs, positions: pos }
  }, [])

  const positionsRef = useRef(positions)

  const shapeRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      const speed = MOUSE_SPEED
      positionsRef.current.forEach((pos, i) => {
        pos.left += (x - 0.5) * speed
        pos.top += (y - 0.5) * speed
        const el = shapeRefs.current[i]
        if (el) {
          el.style.left = `${pos.left}%`
          el.style.top = `${pos.top}%`
        }
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        key: i,
        left: Math.random() * 111,
        top: Math.random() * 111,
        delayS: Math.random() * 8,
        durationS: Math.random() * 8 + 8,
      })),
    [],
  )

  return (
    <div
      className="animated-geometric-background-root pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden>
      <div className="particles">
        {particles.map(p => (
          <div
            key={p.key}
            className="particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationName: 'sparkle',
              animationDuration: `${p.durationS}s`,
              animationDelay: `${p.delayS}s`,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
          />
        ))}
      </div>
      <div className="geometric-background">
        {shapeConfigs.map((cfg, i) => {
          const motion = shapeMotionStyles(cfg.animation)
          const pos = positions[i]
          return (
            <div
              key={`${cfg.shapeClass}-${i}`}
              ref={el => {
                shapeRefs.current[i] = el
              }}
              className={`shape ${cfg.shapeClass}`}
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                animationName: cfg.animation,
                animationDuration: `${cfg.durationS}s`,
                animationDelay: `${cfg.delayS}s`,
                animationIterationCount: 'infinite',
                ...motion,
              }}
            />
          )
        })}
      </div>
      <div className="gradient-overlay" />
    </div>
  )
}

export default AnimatedGeometricBackground

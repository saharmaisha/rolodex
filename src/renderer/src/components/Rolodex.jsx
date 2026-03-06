import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef
} from 'react'
import Card from './Card'
import '../styles/rolodex.css'

const VISIBLE_SLOTS = 24
const RADIUS = 420

const clampRotation = (rotation, totalCards, sliceAngle) => {
  if (totalCards === 0) return 0
  const minRotation = 0 // First card at front
  const maxRotation = -((totalCards - 1) * sliceAngle) // Last card at front
  return Math.max(maxRotation, Math.min(minRotation, rotation))
}

const Rolodex = forwardRef(function Rolodex(
  { cards, schema, loading, onCardSelect, onIntroComplete },
  ref
) {
  const [rotation, setRotation] = useState(0)
  const [introPlaying, setIntroPlaying] = useState(true)
  const [hasCardsLoaded, setHasCardsLoaded] = useState(false)
  const velocityRef = useRef(0)
  const animFrameRef = useRef(null)
  const rotationRef = useRef(0)
  const containerRef = useRef(null)

  const totalCards = cards.length
  const sliceAngle = totalCards > 0 ? 360 / Math.max(totalCards, VISIBLE_SLOTS) : 360 / VISIBLE_SLOTS

  useEffect(() => {
    if (totalCards > 0 && !hasCardsLoaded) setHasCardsLoaded(true)
  }, [totalCards, hasCardsLoaded])

  const animateToAngle = useCallback((targetAngle, onComplete) => {
    cancelAnimationFrame(animFrameRef.current)
    const start = rotationRef.current
    const diff = targetAngle - start
    const duration = 600
    const startTime = performance.now()

    function step(now) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const current = start + diff * ease
      rotationRef.current = current
      setRotation(current)
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        onComplete?.()
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
  }, [])

  useImperativeHandle(ref, () => ({
    spinTo: (index) => {
      const clampedIndex = Math.max(0, Math.min(index, totalCards - 1))
      animateToAngle(-(clampedIndex * sliceAngle))
    }
  }), [totalCards, sliceAngle, animateToAngle])

  const snapToNearest = useCallback(() => {
    if (totalCards === 0) return
    const rawIndex = Math.round(-rotationRef.current / sliceAngle)
    const clampedIndex = Math.max(0, Math.min(rawIndex, totalCards - 1))
    const target = -(clampedIndex * sliceAngle)
    animateToAngle(target)
  }, [totalCards, sliceAngle, animateToAngle])

  useEffect(() => {
    if (!introPlaying || !hasCardsLoaded) return
    cancelAnimationFrame(animFrameRef.current)

    const startAngle = totalCards > 1 ? -((totalCards - 1) * sliceAngle) : 0
    const endAngle = 0
    const duration = Math.min(2200, Math.max(800, totalCards * 80))
    const startTime = performance.now()

    rotationRef.current = startAngle
    setRotation(startAngle)

    function step(now) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      const current = startAngle + (endAngle - startAngle) * ease
      rotationRef.current = current
      setRotation(current)
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        setIntroPlaying(false)
        rotationRef.current = 0
        setRotation(0)
        onIntroComplete?.()
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [hasCardsLoaded, introPlaying, onIntroComplete, totalCards, sliceAngle])

  useEffect(() => {
    if (introPlaying) return

    let lastTime = performance.now()
    function momentumLoop(now) {
      const dt = (now - lastTime) / 1000
      lastTime = now

      if (Math.abs(velocityRef.current) > 0.5) {
        velocityRef.current *= 0.95
        const unclamped = rotationRef.current + velocityRef.current * dt
        const clamped = clampRotation(unclamped, totalCards, sliceAngle)
        // Stop momentum if we hit a bound
        if (clamped !== unclamped) {
          velocityRef.current = 0
        }
        rotationRef.current = clamped
        setRotation(rotationRef.current)
      } else if (Math.abs(velocityRef.current) <= 0.5) {
        velocityRef.current = 0
      }

      animFrameRef.current = requestAnimationFrame(momentumLoop)
    }
    animFrameRef.current = requestAnimationFrame(momentumLoop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [introPlaying, totalCards, sliceAngle])

  const handleWheel = useCallback(
    (e) => {
      if (introPlaying) return
      e.preventDefault()
      const delta = -e.deltaY * 0.15
      const newRotation = clampRotation(rotationRef.current + delta, totalCards, sliceAngle)
      // Stop velocity if we hit a bound
      if (newRotation === rotationRef.current && delta !== 0) {
        velocityRef.current = 0
      } else {
        velocityRef.current = delta * 10
      }
      rotationRef.current = newRotation
      setRotation(rotationRef.current)
    },
    [introPlaying, totalCards, sliceAngle]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (introPlaying) return
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        rotationRef.current = clampRotation(rotationRef.current + sliceAngle, totalCards, sliceAngle)
        setRotation(rotationRef.current)
        snapToNearest()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        rotationRef.current = clampRotation(rotationRef.current - sliceAngle, totalCards, sliceAngle)
        setRotation(rotationRef.current)
        snapToNearest()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const idx = getFrontIndex()
        if (cards[idx]) onCardSelect?.(cards[idx])
      }
    },
    [introPlaying, sliceAngle, totalCards, cards, onCardSelect, snapToNearest]
  )

  const handleTabClick = useCallback(
    (card) => {
      if (introPlaying) return
      onCardSelect?.(card)
    },
    [introPlaying, onCardSelect]
  )

  const getFrontIndex = () => {
    if (totalCards === 0) return 0
    const idx = Math.round(-rotationRef.current / sliceAngle) % totalCards
    return ((idx % totalCards) + totalCards) % totalCards
  }

  const getVisibleCards = () => {
    if (totalCards === 0) return []
    const frontIdx = getFrontIndex()
    const half = Math.floor(VISIBLE_SLOTS / 2)
    const visible = []

    for (let i = -half; i <= half; i++) {
      const idx = ((frontIdx + i) % totalCards + totalCards) % totalCards
      visible.push({
        card: cards[idx],
        index: idx,
        offset: i,
        isFront: i === 0
      })
    }
    return visible
  }

  const visibleCards = getVisibleCards()

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      className="rolodex-container"
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    >
      <div className="rolodex-frame">
        <div
          className="rolodex-cylinder"
          style={{
            transform: `rotateX(${rotation}deg)`,
            '--radius': `${RADIUS}px`
          }}
        >
          {visibleCards.map(({ card, index, isFront, offset }) => (
            <Card
              key={`slot-${offset}`}
              card={card}
              schema={schema}
              index={index}
              totalCards={Math.max(totalCards, VISIBLE_SLOTS)}
              radius={RADIUS}
              isFront={isFront}
              onTabClick={handleTabClick}
            />
          ))}
        </div>
      </div>

      {loading && totalCards === 0 && (
        <div className="rolodex-loading">
          <div className="rolodex-loading-spinner" />
          <span>Loading cards...</span>
        </div>
      )}

      {!loading && totalCards === 0 && (
        <div className="rolodex-empty">
          <span>No cards found</span>
        </div>
      )}
    </div>
  )
})

export default Rolodex

import React, { useMemo } from 'react'
import '../styles/card.css'

const TAB_COLORS = [
  '#6b2d3e', '#2d4a3e', '#2a3548', '#7a5c2e',
  '#4a2d5c', '#3e4a2d', '#5c2d2d', '#2d3e5c'
]
const CARD_WIDTH = 440
const TAB_MAX_WIDTH = 160
const TAB_RIGHT_PADDING = 10

export default function Card({ card, schema, index, totalCards, radius, isFront, onTabClick }) {
  const angle = (index / totalCards) * 360
  const tabColor = TAB_COLORS[index % TAB_COLORS.length]
  const rawTabOffset = (index % 5) * 76 + 10
  const maxTabOffset = CARD_WIDTH - TAB_MAX_WIDTH - TAB_RIGHT_PADDING
  const tabOffset = Math.max(10, Math.min(rawTabOffset, maxTabOffset))

  const frontBoost = isFront ? 2 : 0
  const style = useMemo(
    () => ({
      transform: `rotateX(${angle}deg) translateZ(${radius + frontBoost}px)`,
      '--tab-color': tabColor,
      '--tab-offset': `${tabOffset}px`
    }),
    [angle, radius, frontBoost, tabColor, tabOffset]
  )

  const title = findTitle(card, schema)

  return (
    <div
      className={`card ${isFront ? 'card--front' : 'card--back'}`}
      style={style}
    >
      <div
        className="card-tab"
        onClick={(e) => {
          e.stopPropagation()
          onTabClick?.(card, index)
        }}
      >
        <span className="card-tab-name">{title}</span>
      </div>
      <div className="card-inner">
        <div className="card-lines" />
      </div>
    </div>
  )
}

function findTitle(card, schema) {
  if (schema) {
    for (const [name, prop] of Object.entries(schema)) {
      if (prop.type === 'title' && card[name]) return card[name]
    }
  }
  for (const [key, val] of Object.entries(card)) {
    if (key === 'id' || key.startsWith('_')) continue
    if (typeof val === 'string' && val.length > 0) return val
  }
  return 'Untitled'
}

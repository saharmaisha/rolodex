import React, { useMemo } from 'react'
import '../styles/card.css'

const TAB_COLORS = [
  '#5c4a3d', // Warm brown
  '#4a5c52', // Muted forest
  '#4d4a5c', // Muted plum
]
const CARD_WIDTH = 440
const TAB_MAX_WIDTH = 180
const TAB_LANES = 5
const TAB_BASE_OFFSET = 30
const TAB_LANE_STEP = 70

export default function Card({ card, schema, index, totalCards, radius, isFront, onTabClick }) {
  const angle = (index / totalCards) * 360
  const colorIndex = hashString(getCardStableKey(card, schema)) % TAB_COLORS.length
  const tabColor = TAB_COLORS[colorIndex]
  const lane = getTabLane(card, schema, TAB_LANES)
  const rawTabOffset = TAB_BASE_OFFSET + (lane * TAB_LANE_STEP)
  const maxTabOffset = CARD_WIDTH - TAB_MAX_WIDTH - 10
  const tabOffset = Math.max(20, Math.min(rawTabOffset, maxTabOffset))

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

function getTabLane(card, schema, laneCount) {
  const stableKey = getCardStableKey(card, schema)
  const hash = hashString(stableKey)
  return hash % laneCount
}

function getCardStableKey(card, schema) {
  if (card?.id) return String(card.id)
  const title = findTitle(card || {}, schema)
  return title || JSON.stringify(card || {})
}

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

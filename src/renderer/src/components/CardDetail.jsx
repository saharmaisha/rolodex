import React, { useState, useEffect, useCallback } from 'react'

const HIDE_TYPES = new Set([
  'unique_id', 'created_by', 'last_edited_by',
  'created_time', 'last_edited_time'
])

export default function CardDetail({ card, schema, onClose, onEdit, onDelete, deleting }) {
  const [closing, setClosing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), 300)
  }, [onClose])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        if (confirmDelete) {
          setConfirmDelete(false)
        } else {
          handleClose()
        }
      }
    },
    [handleClose, confirmDelete]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete?.(card.id)
  }

  const title = findTitle(card, schema)
  const fields = getFields(card, schema)

  return (
    <div
      className="card-detail-overlay"
      style={closing ? { animation: 'overlayFadeIn 0.25s ease reverse forwards' } : undefined}
      onClick={handleClose}
    >
      <div
        className="card-detail"
        style={closing ? { animation: 'cardPullOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-detail-header">
          <h2 className="card-detail-title">{title}</h2>
          <div className="card-detail-actions">
            {onEdit && (
              <button
                className="card-detail-btn card-detail-btn--edit"
                onClick={() => onEdit(card)}
                disabled={deleting}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className="card-detail-btn card-detail-btn--delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button className="card-detail-close" onClick={handleClose}>
              &times;
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="card-detail-confirm">
            <span>Delete this card? This cannot be undone.</span>
            <button
              className="card-detail-confirm-btn card-detail-confirm-btn--yes"
              onClick={() => onDelete?.(card.id)}
              disabled={deleting}
            >
              Delete
            </button>
            <button
              className="card-detail-confirm-btn card-detail-confirm-btn--no"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="card-detail-body">
          {fields.map(({ key, value, type }) => (
            <div key={key} className="card-detail-field">
              <span className="card-detail-field-label">{key}</span>
              <span className="card-detail-field-value">
                {renderValue(value, type)}
              </span>
            </div>
          ))}
          {card._url && (
            <div style={{ paddingTop: 12 }}>
              <a
                className="card-detail-notion-link"
                href={card._url}
                target="_blank"
                rel="noreferrer"
              >
                Open in Notion &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function findTitle(card, schema) {
  for (const [name, prop] of Object.entries(schema)) {
    if (prop.type === 'title' && card[name]) return card[name]
  }
  for (const [key, val] of Object.entries(card)) {
    if (key.startsWith('_') || key === 'id') continue
    if (typeof val === 'string' && val) return val
  }
  return 'Untitled'
}

function getFields(card, schema) {
  const fields = []
  for (const [name, prop] of Object.entries(schema)) {
    if (prop.type === 'title') continue
    if (HIDE_TYPES.has(prop.type)) continue
    const val = card[name]
    if (val === null || val === undefined || val === '') continue
    fields.push({ key: name, value: val, type: prop.type })
  }
  return fields
}

function renderValue(val, type) {
  if (val === null || val === undefined) return '\u2014'

  if (Array.isArray(val)) {
    if (val.length === 0) return '\u2014'
    return (
      <span className="card-detail-tags">
        {val.map((v, i) => (
          <span key={i} className="card-detail-tag">{v}</span>
        ))}
      </span>
    )
  }

  if (typeof val === 'boolean') return val ? 'Yes' : 'No'

  if (typeof val === 'object' && val !== null) {
    if (val.start) {
      return val.end ? `${val.start} \u2192 ${val.end}` : val.start
    }
    return JSON.stringify(val)
  }

  if (type === 'url' && typeof val === 'string') {
    return (
      <a className="card-detail-link" href={val} target="_blank" rel="noreferrer">
        {val}
      </a>
    )
  }

  if (type === 'email' && typeof val === 'string') {
    return (
      <a className="card-detail-link" href={`mailto:${val}`}>
        {val}
      </a>
    )
  }

  return String(val)
}

import React, { useState, useEffect, useCallback, useRef } from 'react'

const SKIP_TYPES = new Set([
  'unique_id', 'formula', 'rollup', 'created_time',
  'last_edited_time', 'created_by', 'last_edited_by',
  'files', 'people', 'relation'
])

function SelectCombo({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = (options || []).filter(
    (opt) => opt.toLowerCase().includes(search.toLowerCase())
  )
  const exactMatch = filtered.some((opt) => opt.toLowerCase() === search.trim().toLowerCase())
  const showCreate = search.trim() && !exactMatch

  const pick = (val) => {
    onChange(val)
    setSearch('')
    setOpen(false)
  }

  const handleFocus = () => {
    setOpen(true)
    setSearch('')
  }

  return (
    <div className="card-form-combo" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        className="card-form-input"
        value={open ? search : (value || '')}
        placeholder={placeholder || 'Select or type...'}
        onFocus={handleFocus}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (showCreate) pick(search.trim())
            else if (filtered.length === 1) pick(filtered[0])
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {value && !open && (
        <button
          type="button"
          className="card-form-combo-clear"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
        >
          &times;
        </button>
      )}
      {open && (filtered.length > 0 || showCreate) && (
        <div className="card-form-combo-dropdown">
          {filtered.map((opt) => (
            <div
              key={opt}
              className={`card-form-combo-option ${opt === value ? 'card-form-combo-option--active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(opt) }}
            >
              {opt}
            </div>
          ))}
          {showCreate && (
            <div
              className="card-form-combo-option card-form-combo-create"
              onMouseDown={(e) => { e.preventDefault(); pick(search.trim()) }}
            >
              Create &ldquo;{search.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MultiSelectInput({ options, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const selected = Array.isArray(value) ? value : []

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const allOptions = [...new Set([...(options || []), ...selected])]
  const unselected = allOptions.filter((opt) => !selected.includes(opt))
  const filtered = unselected.filter(
    (opt) => opt.toLowerCase().includes(search.toLowerCase())
  )
  const exactMatch = allOptions.some((opt) => opt.toLowerCase() === search.trim().toLowerCase())
  const showCreate = search.trim() && !exactMatch

  const addOption = (opt) => {
    onChange([...selected, opt])
    setSearch('')
  }

  const removeOption = (opt) => {
    onChange(selected.filter((v) => v !== opt))
  }

  return (
    <div className="card-form-multi-wrap" ref={wrapRef}>
      <div className="card-form-multi">
        {selected.map((opt) => (
          <span key={opt} className="card-form-chip card-form-chip--selected">
            <span>{opt}</span>
            <button
              type="button"
              className="card-form-chip-remove"
              onClick={() => removeOption(opt)}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          className="card-form-multi-input"
          value={search}
          placeholder={selected.length === 0 ? 'Select or type...' : 'Add...'}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (showCreate) addOption(search.trim())
              else if (filtered.length === 1) addOption(filtered[0])
            }
            if (e.key === 'Backspace' && !search && selected.length > 0) {
              removeOption(selected[selected.length - 1])
            }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="card-form-combo-dropdown">
          {filtered.map((opt) => (
            <div
              key={opt}
              className="card-form-combo-option"
              onMouseDown={(e) => { e.preventDefault(); addOption(opt) }}
            >
              {opt}
            </div>
          ))}
          {showCreate && (
            <div
              className="card-form-combo-option card-form-combo-create"
              onMouseDown={(e) => { e.preventDefault(); addOption(search.trim()) }}
            >
              Create &ldquo;{search.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CardForm({ schema, card, onSave, onClose, saving }) {
  const [values, setValues] = useState({})
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!schema) return
    const initial = {}
    for (const [name, prop] of Object.entries(schema)) {
      if (SKIP_TYPES.has(prop.type)) continue
      if (card) {
        const val = card[name]
        if (prop.type === 'multi_select' && Array.isArray(val)) {
          initial[name] = val
        } else if (prop.type === 'date' && val && typeof val === 'object') {
          initial[name] = val.start || ''
        } else {
          initial[name] = val ?? ''
        }
      } else {
        initial[name] = prop.type === 'checkbox' ? false : prop.type === 'multi_select' ? [] : ''
      }
    }
    setValues(initial)
  }, [schema, card])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), 300)
  }, [onClose])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const setValue = (name, val) => {
    setValues((prev) => ({ ...prev, [name]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleaned = {}
    for (const [name, val] of Object.entries(values)) {
      if (val === '' || val === null || val === undefined) continue
      if (Array.isArray(val) && val.length === 0) continue
      cleaned[name] = val
    }
    onSave(cleaned)
  }

  const editableFields = schema
    ? Object.entries(schema).filter(([, prop]) => !SKIP_TYPES.has(prop.type))
    : []

  return (
    <div
      className="card-detail-overlay"
      style={closing ? { animation: 'overlayFadeIn 0.25s ease reverse forwards' } : undefined}
      onClick={handleClose}
    >
      <div
        className="card-detail card-form"
        style={closing ? { animation: 'cardPullOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-detail-header">
          <h2 className="card-detail-title">
            {card ? 'Edit Card' : 'New Card'}
          </h2>
          <button className="card-detail-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        <form className="card-form-body" onSubmit={handleSubmit}>
          {editableFields.map(([name, prop]) => (
            <div key={name} className="card-form-field">
              <label className="card-form-label">{name}</label>
              {renderInput(prop, name, values[name], setValue)}
            </div>
          ))}
          <div className="card-form-actions">
            <button
              type="button"
              className="card-form-btn card-form-btn--cancel"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="card-form-btn card-form-btn--save"
              disabled={saving}
            >
              {saving ? 'Saving...' : card ? 'Save Changes' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function renderInput(prop, name, value, setValue) {
  switch (prop.type) {
    case 'title':
    case 'rich_text':
      return (
        <input
          type="text"
          className="card-form-input"
          value={value || ''}
          onChange={(e) => setValue(name, e.target.value)}
          placeholder={prop.type === 'title' ? 'Title...' : `${name}...`}
          autoFocus={prop.type === 'title'}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          className="card-form-input"
          value={value ?? ''}
          onChange={(e) => setValue(name, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          step="any"
        />
      )

    case 'select':
    case 'status':
      return (
        <SelectCombo
          options={prop.options || []}
          value={value || ''}
          onChange={(val) => setValue(name, val)}
          placeholder={`${name}...`}
        />
      )

    case 'multi_select':
      return (
        <MultiSelectInput
          options={prop.options || []}
          value={value}
          onChange={(val) => setValue(name, val)}
        />
      )

    case 'checkbox':
      return (
        <label className="card-form-toggle">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(name, e.target.checked)}
          />
          <span>{value ? 'Yes' : 'No'}</span>
        </label>
      )

    case 'date':
      return (
        <input
          type="date"
          className="card-form-input"
          value={value || ''}
          onChange={(e) => setValue(name, e.target.value)}
        />
      )

    case 'url':
    case 'email':
    case 'phone_number':
      return (
        <input
          type={prop.type === 'email' ? 'email' : prop.type === 'url' ? 'url' : 'tel'}
          className="card-form-input"
          value={value || ''}
          onChange={(e) => setValue(name, e.target.value)}
          placeholder={`${name}...`}
        />
      )

    default:
      return (
        <input
          type="text"
          className="card-form-input"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(name, e.target.value)}
          placeholder={`${name}...`}
        />
      )
  }
}

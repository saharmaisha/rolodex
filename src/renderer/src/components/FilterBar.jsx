import React, { useState, useCallback, useRef } from 'react'

const FILTERABLE_TYPES = new Set([
  'select', 'status', 'multi_select', 'checkbox',
  'rich_text', 'title', 'url', 'email', 'phone_number',
  'number', 'date'
])

export default function FilterBar({ schema, filters, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const debounceTimers = useRef({})

  const filterableProps = Object.entries(schema).filter(
    ([, prop]) => FILTERABLE_TYPES.has(prop.type)
  )

  if (filterableProps.length === 0) return null

  const updateFilter = useCallback(
    (name, value) => {
      const next = { ...filters, [name]: value }
      if (value === '' || value === null || value === undefined) {
        delete next[name]
      }
      onChange(next)
    },
    [filters, onChange]
  )

  const debouncedUpdate = useCallback(
    (name, value, delay = 400) => {
      clearTimeout(debounceTimers.current[name])
      debounceTimers.current[name] = setTimeout(() => {
        updateFilter(name, value)
      }, delay)
    },
    [updateFilter]
  )

  const clearAll = useCallback(() => {
    onChange({})
  }, [onChange])

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="filter-bar">
      <button
        className="filter-bar-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 3h14M4 8h8M6 13h4" />
        </svg>
        Filters
        {hasActiveFilters && ` (${Object.keys(filters).length})`}
      </button>

      {expanded && (
        <div className="filter-controls">
          {filterableProps.map(([name, prop]) => (
            <FilterControl
              key={name}
              name={name}
              prop={prop}
              value={filters[name]}
              onChange={updateFilter}
              onDebouncedChange={debouncedUpdate}
            />
          ))}
          {hasActiveFilters && (
            <button className="filter-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FilterControl({ name, prop, value, onChange, onDebouncedChange }) {
  switch (prop.type) {
    case 'select':
    case 'status':
      return (
        <div className="filter-group">
          <label className="filter-label">{name}</label>
          <select
            className="filter-select"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value || null)}
          >
            <option value="">All</option>
            {prop.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'multi_select':
      return (
        <div className="filter-group">
          <label className="filter-label">{name}</label>
          <select
            className="filter-select"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value || null)}
          >
            <option value="">All</option>
            {prop.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'checkbox':
      return (
        <div className="filter-checkbox-wrap">
          <input
            type="checkbox"
            className="filter-checkbox"
            id={`filter-${name}`}
            checked={value === true}
            onChange={(e) => {
              const checked = e.target.checked
              onChange(name, checked ? true : null)
            }}
          />
          <label className="filter-checkbox-label" htmlFor={`filter-${name}`}>
            {name}
          </label>
        </div>
      )

    case 'rich_text':
    case 'title':
    case 'url':
    case 'email':
    case 'phone_number':
      return (
        <div className="filter-group">
          <label className="filter-label">{name}</label>
          <input
            type="text"
            className="filter-input"
            placeholder={`Search ${name.toLowerCase()}...`}
            defaultValue={value || ''}
            onChange={(e) => onDebouncedChange(name, e.target.value)}
          />
        </div>
      )

    case 'number':
      return (
        <div className="filter-group">
          <label className="filter-label">{name}</label>
          <div className="filter-number-range">
            <input
              type="number"
              className="filter-input"
              placeholder="Min"
              defaultValue={value?.min ?? ''}
              onChange={(e) => {
                const min = e.target.value ? Number(e.target.value) : null
                const max = value?.max ?? null
                const v = min != null || max != null ? { min, max } : null
                onDebouncedChange(name, v)
              }}
            />
            <span className="filter-number-sep">–</span>
            <input
              type="number"
              className="filter-input"
              placeholder="Max"
              defaultValue={value?.max ?? ''}
              onChange={(e) => {
                const max = e.target.value ? Number(e.target.value) : null
                const min = value?.min ?? null
                const v = min != null || max != null ? { min, max } : null
                onDebouncedChange(name, v)
              }}
            />
          </div>
        </div>
      )

    case 'date':
      return (
        <div className="filter-group">
          <label className="filter-label">{name}</label>
          <div className="filter-date-range">
            <input
              type="date"
              className="filter-input"
              defaultValue={value?.after || ''}
              onChange={(e) => {
                const after = e.target.value || null
                const before = value?.before || null
                const v = after || before ? { after, before } : null
                onChange(name, v)
              }}
            />
            <span className="filter-number-sep">–</span>
            <input
              type="date"
              className="filter-input"
              defaultValue={value?.before || ''}
              onChange={(e) => {
                const before = e.target.value || null
                const after = value?.after || null
                const v = after || before ? { after, before } : null
                onChange(name, v)
              }}
            />
          </div>
        </div>
      )

    default:
      return null
  }
}

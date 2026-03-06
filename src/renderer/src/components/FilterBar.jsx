import React, { useState, useCallback, useRef } from 'react'

const FILTERABLE_TYPES = new Set([
  'select', 'status', 'multi_select', 'checkbox',
  'rich_text', 'title', 'url', 'email', 'phone_number',
  'number', 'date'
])

const ADVANCED_OPERATORS = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'does_not_contain', label: 'does not contain' },
    { value: 'equals', label: 'equals' },
    { value: 'does_not_equal', label: 'does not equal' }
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'does_not_equal', label: '!=' },
    { value: 'greater_than', label: '>' },
    { value: 'greater_than_or_equal_to', label: '>=' },
    { value: 'less_than', label: '<' },
    { value: 'less_than_or_equal_to', label: '<=' },
    { value: 'between', label: 'between' }
  ],
  select: [
    { value: 'equals', label: 'equals' },
    { value: 'does_not_equal', label: 'does not equal' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ],
  multi_select: [
    { value: 'contains', label: 'contains' },
    { value: 'does_not_contain', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ],
  checkbox: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' }
  ],
  date: [
    { value: 'on_or_after', label: 'on or after' },
    { value: 'on_or_before', label: 'on or before' },
    { value: 'equals', label: 'on' },
    { value: 'between', label: 'between' }
  ]
}

export default function FilterBar({ schema, filters, advancedFilters = [], onChange, onAdvancedChange }) {
  const [expanded, setExpanded] = useState(false)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const debounceTimers = useRef({})

  const filterableProps = Object.entries(schema).filter(
    ([, prop]) => FILTERABLE_TYPES.has(prop.type)
  )
  const filterableMap = Object.fromEntries(filterableProps)

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
    onAdvancedChange?.([])
  }, [onAdvancedChange, onChange])

  const activeAdvancedCount = advancedFilters.filter((filter) => isAdvancedFilterActive(filter)).length
  const activeFilterCount = Object.keys(filters).length + activeAdvancedCount
  const hasActiveFilters = activeFilterCount > 0

  const addAdvancedFilter = useCallback(() => {
    const firstName = filterableProps[0]?.[0]
    if (!firstName) return
    const firstType = filterableMap[firstName]?.type
    const next = [
      ...advancedFilters,
      {
        id: buildAdvancedRowId(),
        property: firstName,
        operator: getDefaultOperator(firstType),
        value: '',
        value2: ''
      }
    ]
    onAdvancedChange?.(next)
  }, [advancedFilters, filterableMap, filterableProps, onAdvancedChange])

  const removeAdvancedFilter = useCallback((id) => {
    onAdvancedChange?.(advancedFilters.filter((filter, index) => (filter.id || index) !== id))
  }, [advancedFilters, onAdvancedChange])

  const updateAdvancedFilter = useCallback((id, patch) => {
    const next = advancedFilters.map((filter, index) => {
      const rowId = filter.id || index
      if (rowId !== id) return filter
      const updated = { ...filter, ...patch }
      if (Object.hasOwn(patch, 'property')) {
        const nextType = filterableMap[patch.property]?.type
        updated.operator = getDefaultOperator(nextType)
        updated.value = ''
        updated.value2 = ''
      }
      return updated
    })
    onAdvancedChange?.(next)
  }, [advancedFilters, filterableMap, onAdvancedChange])

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
        {hasActiveFilters && ` (${activeFilterCount})`}
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
          <button className="filter-advanced-toggle" onClick={() => setAdvancedExpanded((prev) => !prev)}>
            Advanced {advancedExpanded ? '−' : '+'}
          </button>
          {advancedExpanded && (
            <div className="filter-advanced-panel">
              {advancedFilters.map((filter, index) => {
                const rowId = filter.id || index
                const selectedProp = filterableMap[filter.property]
                const operators = getOperators(selectedProp?.type)
                const needsValue = needsPrimaryValue(filter.operator)
                const needsValue2 = filter.operator === 'between'
                return (
                  <div className="filter-advanced-row" key={rowId}>
                    <select
                      className="filter-select filter-advanced-property"
                      value={filter.property || ''}
                      onChange={(e) => updateAdvancedFilter(rowId, { property: e.target.value })}
                    >
                      {filterableProps.map(([name]) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <select
                      className="filter-select filter-advanced-operator"
                      value={filter.operator || ''}
                      onChange={(e) => updateAdvancedFilter(rowId, { operator: e.target.value })}
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {needsValue && (
                      <AdvancedValueInput
                        prop={selectedProp}
                        value={filter.value ?? ''}
                        onChange={(nextValue) => updateAdvancedFilter(rowId, { value: nextValue })}
                      />
                    )}
                    {needsValue2 && (
                      <AdvancedValueInput
                        prop={selectedProp}
                        value={filter.value2 ?? ''}
                        placeholder="and"
                        onChange={(nextValue) => updateAdvancedFilter(rowId, { value2: nextValue })}
                      />
                    )}
                    <button className="filter-advanced-remove" onClick={() => removeAdvancedFilter(rowId)}>
                      Remove
                    </button>
                  </div>
                )
              })}
              <button className="filter-advanced-add" onClick={addAdvancedFilter}>
                + Add advanced filter
              </button>
            </div>
          )}
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

function AdvancedValueInput({ prop, value, onChange, placeholder = 'Value' }) {
  if (!prop) return null

  if (prop.type === 'select' || prop.type === 'status' || prop.type === 'multi_select') {
    return (
      <select
        className="filter-select filter-advanced-value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select value</option>
        {prop.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  const inputType = getInputType(prop.type)
  return (
    <input
      type={inputType}
      className="filter-input filter-advanced-value"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function getInputType(type) {
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  return 'text'
}

function getOperatorGroup(type) {
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  if (type === 'checkbox') return 'checkbox'
  if (type === 'select' || type === 'status') return 'select'
  if (type === 'multi_select') return 'multi_select'
  return 'text'
}

function getOperators(type) {
  return ADVANCED_OPERATORS[getOperatorGroup(type)] || ADVANCED_OPERATORS.text
}

function getDefaultOperator(type) {
  return getOperators(type)[0].value
}

function needsPrimaryValue(operator) {
  return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(operator)
}

function buildAdvancedRowId() {
  return `adv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAdvancedFilterActive(filter) {
  if (!filter?.operator || !filter?.property) return false
  if (!needsPrimaryValue(filter.operator)) return true
  if (filter.operator === 'between') return Boolean(filter.value) && Boolean(filter.value2)
  return Boolean(filter.value)
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

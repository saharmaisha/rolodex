import React, { useState, useCallback, useRef, useEffect } from 'react'
import Rolodex from './components/Rolodex'
import FilterBar from './components/FilterBar'
import CardDetail from './components/CardDetail'
import CardForm from './components/CardForm'
import { useNotion } from './hooks/useNotion'

export default function App() {
  const { schema, cards, loading, mutating, error, fetchCards, createCard, updateCard, deleteCard } = useNotion()
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeFilters, setActiveFilters] = useState({})
  const [advancedFilters, setAdvancedFilters] = useState([])
  const [nameQuery, setNameQuery] = useState('')
  const [introComplete, setIntroComplete] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const rolodexRef = useRef(null)
  const searchDebounceRef = useRef(null)
  const latestFilterStateRef = useRef({ activeFilters: {}, advancedFilters: [] })

  const applyFilters = useCallback(
    (simpleFilters, quickNameQuery, advFilters) => {
      const notionFilter = buildNotionFilter({
        filters: simpleFilters,
        properties: schema?.properties,
        nameQuery: quickNameQuery,
        advancedFilters: advFilters
      })
      fetchCards({ filter: notionFilter || undefined })
    },
    [fetchCards, schema]
  )

  const handleFilterChange = useCallback(
    (filters) => {
      setActiveFilters(filters)
      applyFilters(filters, nameQuery, advancedFilters)
    },
    [advancedFilters, applyFilters, nameQuery]
  )

  const handleAdvancedFilterChange = useCallback(
    (filters) => {
      setAdvancedFilters(filters)
      applyFilters(activeFilters, nameQuery, filters)
    },
    [activeFilters, applyFilters, nameQuery]
  )

  const handleNameQueryChange = useCallback(
    (event) => {
      const value = event.target.value
      setNameQuery(value)
    },
    []
  )

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current)
  }, [])

  useEffect(() => {
    latestFilterStateRef.current = { activeFilters, advancedFilters }
  }, [activeFilters, advancedFilters])

  useEffect(() => {
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const { activeFilters: latestActive, advancedFilters: latestAdvanced } = latestFilterStateRef.current
      applyFilters(latestActive, nameQuery, latestAdvanced)
    }, 350)
    return () => clearTimeout(searchDebounceRef.current)
  }, [nameQuery, applyFilters])

  const handleCardSelect = useCallback((card) => {
    setSelectedCard(card)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedCard(null)
  }, [])

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true)
  }, [])

  const handleAddCard = useCallback(() => {
    setEditingCard(null)
    setShowForm(true)
  }, [])

  const handleEditCard = useCallback((card) => {
    setSelectedCard(null)
    setEditingCard(card)
    setShowForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingCard(null)
  }, [])

  const handleSaveCard = useCallback(async (properties) => {
    if (editingCard) {
      const result = await updateCard(editingCard.id, properties)
      if (!result.error) {
        setShowForm(false)
        setEditingCard(null)
      }
    } else {
      const result = await createCard(properties)
      if (!result.error) {
        setShowForm(false)
      }
    }
  }, [editingCard, createCard, updateCard])

  const handleDeleteCard = useCallback(async (pageId) => {
    const result = await deleteCard(pageId)
    if (!result.error) {
      setSelectedCard(null)
    }
  }, [deleteCard])

  return (
    <div className="app">
      <div className="app-titlebar" />
      <header className="app-header">
        <h1 className="app-title">Rolodex</h1>
        {schema && (
          <span className="app-subtitle">{schema.title}</span>
        )}
        {schema && (
          <button className="add-card-btn" onClick={handleAddCard}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Add Card
          </button>
        )}
      </header>

      {error && (
        <div className="app-error">
          <p>{error}</p>
        </div>
      )}

      <div className="app-body">
        {schema && (
          <div className="name-search">
            <input
              type="text"
              className="name-search-input"
              placeholder="Search names..."
              value={nameQuery}
              onChange={handleNameQueryChange}
            />
          </div>
        )}
        {schema && (
          <FilterBar
            schema={schema.properties}
            filters={activeFilters}
            advancedFilters={advancedFilters}
            onChange={handleFilterChange}
            onAdvancedChange={handleAdvancedFilterChange}
          />
        )}

        <div className="rolodex-scene">
          <Rolodex
            ref={rolodexRef}
            cards={cards}
            schema={schema?.properties}
            loading={loading}
            onCardSelect={handleCardSelect}
            onIntroComplete={handleIntroComplete}
          />
          {cards.length > 0 && (
            <div className="card-count">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              {loading && ' (loading more...)'}
            </div>
          )}
        </div>
      </div>

      {selectedCard && schema && (
        <CardDetail
          card={selectedCard}
          schema={schema.properties}
          onClose={handleCloseDetail}
          onEdit={handleEditCard}
          onDelete={handleDeleteCard}
          deleting={mutating}
        />
      )}

      {showForm && schema && (
        <CardForm
          schema={schema.properties}
          card={editingCard}
          onSave={handleSaveCard}
          onClose={handleCloseForm}
          saving={mutating}
        />
      )}
    </div>
  )
}

function buildNotionFilter({ filters, properties, nameQuery, advancedFilters }) {
  if (!properties) return null
  const conditions = []

  const trimmedName = nameQuery?.trim()
  const titlePropName = Object.entries(properties).find(([, prop]) => prop.type === 'title')?.[0]
  if (trimmedName && titlePropName) {
    conditions.push({
      property: titlePropName,
      title: { contains: trimmedName }
    })
  }

  if (filters) {
    for (const [propName, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '') continue
      const prop = properties[propName]
      if (!prop) continue

      const condition = buildConditionForType(propName, prop.type, value)
      if (condition) conditions.push(condition)
    }
  }

  if (Array.isArray(advancedFilters)) {
    for (const filter of advancedFilters) {
      const condition = buildAdvancedConditionForType(filter, properties)
      if (condition) conditions.push(condition)
    }
  }

  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return { and: conditions }
}

function buildAdvancedConditionForType(filter, properties) {
  if (!filter?.property || !filter?.operator) return null
  const prop = properties[filter.property]
  if (!prop) return null

  const propName = filter.property
  const type = prop.type
  const value = filter.value
  const value2 = filter.value2

  if (type === 'select' || type === 'status') {
    if (filter.operator === 'is_empty') return { property: propName, [type]: { is_empty: true } }
    if (filter.operator === 'is_not_empty') return { property: propName, [type]: { is_not_empty: true } }
    if (!value) return null
    if (filter.operator === 'equals') return { property: propName, [type]: { equals: value } }
    if (filter.operator === 'does_not_equal') return { property: propName, [type]: { does_not_equal: value } }
    return null
  }

  if (type === 'multi_select') {
    if (filter.operator === 'is_empty') return { property: propName, multi_select: { is_empty: true } }
    if (filter.operator === 'is_not_empty') return { property: propName, multi_select: { is_not_empty: true } }
    if (!value) return null
    if (filter.operator === 'contains') return { property: propName, multi_select: { contains: value } }
    if (filter.operator === 'does_not_contain') return { property: propName, multi_select: { does_not_contain: value } }
    return null
  }

  if (type === 'checkbox') {
    if (filter.operator === 'is_true') return { property: propName, checkbox: { equals: true } }
    if (filter.operator === 'is_false') return { property: propName, checkbox: { equals: false } }
    return null
  }

  if (type === 'number') {
    const parsedValue = value === '' || value == null ? null : Number(value)
    const parsedValue2 = value2 === '' || value2 == null ? null : Number(value2)
    if ((parsedValue != null && Number.isNaN(parsedValue)) || (parsedValue2 != null && Number.isNaN(parsedValue2))) {
      return null
    }
    if (filter.operator === 'between') {
      if (parsedValue == null || parsedValue2 == null) return null
      return {
        and: [
          { property: propName, number: { greater_than_or_equal_to: parsedValue } },
          { property: propName, number: { less_than_or_equal_to: parsedValue2 } }
        ]
      }
    }
    if (parsedValue == null) return null
    if (filter.operator === 'equals') return { property: propName, number: { equals: parsedValue } }
    if (filter.operator === 'does_not_equal') return { property: propName, number: { does_not_equal: parsedValue } }
    if (filter.operator === 'greater_than') return { property: propName, number: { greater_than: parsedValue } }
    if (filter.operator === 'greater_than_or_equal_to') return { property: propName, number: { greater_than_or_equal_to: parsedValue } }
    if (filter.operator === 'less_than') return { property: propName, number: { less_than: parsedValue } }
    if (filter.operator === 'less_than_or_equal_to') return { property: propName, number: { less_than_or_equal_to: parsedValue } }
    return null
  }

  if (type === 'date') {
    if (filter.operator === 'between') {
      if (!value || !value2) return null
      return {
        and: [
          { property: propName, date: { on_or_after: value } },
          { property: propName, date: { on_or_before: value2 } }
        ]
      }
    }
    if (!value) return null
    if (filter.operator === 'on_or_after') return { property: propName, date: { on_or_after: value } }
    if (filter.operator === 'on_or_before') return { property: propName, date: { on_or_before: value } }
    if (filter.operator === 'equals') return { property: propName, date: { equals: value } }
    return null
  }

  if (type === 'rich_text' || type === 'title' || type === 'url' || type === 'email' || type === 'phone_number') {
    if (!value) return null
    if (filter.operator === 'contains') return { property: propName, [type]: { contains: value } }
    if (filter.operator === 'does_not_contain') return { property: propName, [type]: { does_not_contain: value } }
    if (filter.operator === 'equals') return { property: propName, [type]: { equals: value } }
    if (filter.operator === 'does_not_equal') return { property: propName, [type]: { does_not_equal: value } }
  }

  return null
}

function buildConditionForType(propName, type, value) {
  switch (type) {
    case 'select':
    case 'status':
      return value ? { property: propName, [type]: { equals: value } } : null

    case 'multi_select':
      return value
        ? { property: propName, multi_select: { contains: value } }
        : null

    case 'checkbox':
      return typeof value === 'boolean'
        ? { property: propName, checkbox: { equals: value } }
        : null

    case 'rich_text':
    case 'title':
    case 'url':
    case 'email':
    case 'phone_number':
      return value
        ? { property: propName, [type]: { contains: value } }
        : null

    case 'number':
      if (value.min != null && value.max != null) {
        return {
          and: [
            { property: propName, number: { greater_than_or_equal_to: value.min } },
            { property: propName, number: { less_than_or_equal_to: value.max } }
          ]
        }
      }
      if (value.min != null)
        return { property: propName, number: { greater_than_or_equal_to: value.min } }
      if (value.max != null)
        return { property: propName, number: { less_than_or_equal_to: value.max } }
      return null

    case 'date':
      if (value.after && value.before) {
        return {
          and: [
            { property: propName, date: { on_or_after: value.after } },
            { property: propName, date: { on_or_before: value.before } }
          ]
        }
      }
      if (value.after)
        return { property: propName, date: { on_or_after: value.after } }
      if (value.before)
        return { property: propName, date: { on_or_before: value.before } }
      return null

    default:
      return null
  }
}

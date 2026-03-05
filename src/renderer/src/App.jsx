import React, { useState, useCallback, useRef } from 'react'
import Rolodex from './components/Rolodex'
import FilterBar from './components/FilterBar'
import CardDetail from './components/CardDetail'
import CardForm from './components/CardForm'
import { useNotion } from './hooks/useNotion'

export default function App() {
  const { schema, cards, loading, mutating, error, fetchCards, createCard, updateCard, deleteCard } = useNotion()
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeFilters, setActiveFilters] = useState({})
  const [introComplete, setIntroComplete] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const rolodexRef = useRef(null)

  const handleFilterChange = useCallback(
    (filters) => {
      setActiveFilters(filters)
      const notionFilter = buildNotionFilter(filters, schema?.properties)
      fetchCards({ filter: notionFilter || undefined })
    },
    [fetchCards, schema]
  )

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
          <FilterBar
            schema={schema.properties}
            filters={activeFilters}
            onChange={handleFilterChange}
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

function buildNotionFilter(filters, properties) {
  if (!properties || !filters) return null
  const conditions = []

  for (const [propName, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue
    const prop = properties[propName]
    if (!prop) continue

    const condition = buildConditionForType(propName, prop.type, value)
    if (condition) conditions.push(condition)
  }

  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return { and: conditions }
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

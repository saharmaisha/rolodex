import { useState, useEffect, useCallback, useRef } from 'react'

export function useNotion() {
  const [schema, setSchema] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutating, setMutating] = useState(false)
  const abortRef = useRef(0)
  const lastFilterRef = useRef({})

  const refreshSchema = useCallback(async () => {
    const result = await window.notion.getSchema()
    if (result.error) {
      setError(result.error)
      return
    }
    setSchema(result)
  }, [])

  useEffect(() => {
    async function loadSchema() {
      const result = await window.notion.getSchema()
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      setSchema(result)
    }
    loadSchema()
  }, [])

  const fetchCards = useCallback(async ({ filter, sorts } = {}) => {
    const requestId = ++abortRef.current
    lastFilterRef.current = { filter, sorts }
    setLoading(true)
    setError(null)

    try {
      let allResults = []
      let cursor = undefined
      let hasMore = true

      while (hasMore) {
        const result = await window.notion.query({ filter, sorts, startCursor: cursor })
        if (requestId !== abortRef.current) return

        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }

        allResults = allResults.concat(result.results)
        hasMore = result.hasMore
        cursor = result.nextCursor

        setCards([...allResults])
      }

      setLoading(false)
    } catch (err) {
      if (requestId === abortRef.current) {
        setError(err.message)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (schema) fetchCards()
  }, [schema, fetchCards])

  const createCard = useCallback(async (properties) => {
    if (!schema) return { error: 'Schema not loaded' }
    setMutating(true)
    setError(null)
    try {
      const result = await window.notion.create({ properties, schema: schema.properties })
      if (result.error) {
        setError(result.error)
        setMutating(false)
        return result
      }
      await Promise.all([fetchCards(lastFilterRef.current), refreshSchema()])
      setMutating(false)
      return result
    } catch (err) {
      setError(err.message)
      setMutating(false)
      return { error: err.message }
    }
  }, [schema, fetchCards, refreshSchema])

  const updateCard = useCallback(async (pageId, properties) => {
    if (!schema) return { error: 'Schema not loaded' }
    setMutating(true)
    setError(null)
    try {
      const result = await window.notion.update({ pageId, properties, schema: schema.properties })
      if (result.error) {
        setError(result.error)
        setMutating(false)
        return result
      }
      await Promise.all([fetchCards(lastFilterRef.current), refreshSchema()])
      setMutating(false)
      return result
    } catch (err) {
      setError(err.message)
      setMutating(false)
      return { error: err.message }
    }
  }, [schema, fetchCards, refreshSchema])

  const deleteCard = useCallback(async (pageId) => {
    setMutating(true)
    setError(null)
    try {
      const result = await window.notion.archive({ pageId })
      if (result.error) {
        setError(result.error)
        setMutating(false)
        return result
      }
      await fetchCards(lastFilterRef.current)
      setMutating(false)
      return result
    } catch (err) {
      setError(err.message)
      setMutating(false)
      return { error: err.message }
    }
  }, [fetchCards])

  return { schema, cards, loading, mutating, error, fetchCards, createCard, updateCard, deleteCard }
}

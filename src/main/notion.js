import { Client } from '@notionhq/client'

let notion = null
let databaseId = null

function getClient() {
  if (!notion) {
    const token = process.env.NOTION_API_KEY
    databaseId = process.env.NOTION_DATABASE_ID
    if (!token || !databaseId) {
      throw new Error(
        'Missing NOTION_API_KEY or NOTION_DATABASE_ID in .env file. ' +
        'Copy .env.example to .env and fill in your credentials.'
      )
    }
    notion = new Client({ auth: token })
  }
  return notion
}

function extractPropertyValue(prop) {
  if (!prop) return null
  switch (prop.type) {
    case 'title':
      return prop.title?.map((t) => t.plain_text).join('') || ''
    case 'rich_text':
      return prop.rich_text?.map((t) => t.plain_text).join('') || ''
    case 'number':
      return prop.number
    case 'select':
      return prop.select?.name || null
    case 'multi_select':
      return prop.multi_select?.map((s) => s.name) || []
    case 'status':
      return prop.status?.name || null
    case 'date':
      return prop.date
        ? { start: prop.date.start, end: prop.date.end }
        : null
    case 'checkbox':
      return prop.checkbox
    case 'url':
      return prop.url
    case 'email':
      return prop.email
    case 'phone_number':
      return prop.phone_number
    case 'people':
      return prop.people?.map((p) => p.name || p.id) || []
    case 'files':
      return prop.files?.map((f) => f.name || f.external?.url || f.file?.url) || []
    case 'relation':
      return prop.relation?.map((r) => r.id) || []
    case 'formula':
      if (prop.formula) return extractFormulaValue(prop.formula)
      return null
    case 'rollup':
      return prop.rollup?.number ?? prop.rollup?.date ?? null
    case 'created_time':
      return prop.created_time
    case 'last_edited_time':
      return prop.last_edited_time
    case 'created_by':
      return prop.created_by?.name || prop.created_by?.id
    case 'last_edited_by':
      return prop.last_edited_by?.name || prop.last_edited_by?.id
    case 'unique_id':
      return prop.unique_id ? `${prop.unique_id.prefix || ''}${prop.unique_id.number}` : null
    default:
      return null
  }
}

function extractFormulaValue(formula) {
  switch (formula.type) {
    case 'string': return formula.string
    case 'number': return formula.number
    case 'boolean': return formula.boolean
    case 'date': return formula.date
    default: return null
  }
}

function normalizeResult(page) {
  const card = { id: page.id }
  for (const [key, prop] of Object.entries(page.properties)) {
    card[key] = extractPropertyValue(prop)
  }
  card._lastEditedTime = page.last_edited_time
  card._createdTime = page.created_time
  card._url = page.url
  return card
}

function normalizeSchema(properties) {
  const schema = {}
  for (const [name, prop] of Object.entries(properties)) {
    const entry = { type: prop.type, name }
    if (prop.type === 'select' || prop.type === 'status') {
      entry.options = prop[prop.type]?.options?.map((o) => o.name) || []
    }
    if (prop.type === 'multi_select') {
      entry.options = prop.multi_select?.options?.map((o) => o.name) || []
    }
    schema[name] = entry
  }
  return schema
}

export async function getSchema() {
  const client = getClient()
  const db = await client.databases.retrieve({ database_id: databaseId })
  return {
    title: db.title?.map((t) => t.plain_text).join('') || 'Untitled',
    properties: normalizeSchema(db.properties)
  }
}

export async function queryDatabase({ filter, sorts, startCursor } = {}) {
  const client = getClient()
  const params = { database_id: databaseId, page_size: 100 }
  if (filter) params.filter = filter
  if (sorts) params.sorts = sorts
  if (startCursor) params.start_cursor = startCursor

  const response = await client.databases.query(params)
  return {
    results: response.results.map(normalizeResult),
    hasMore: response.has_more,
    nextCursor: response.next_cursor
  }
}

function buildNotionProperty(type, value) {
  if (value === null || value === undefined || value === '') return undefined
  switch (type) {
    case 'title':
      return { title: [{ text: { content: String(value) } }] }
    case 'rich_text':
      return { rich_text: [{ text: { content: String(value) } }] }
    case 'number':
      return { number: typeof value === 'number' ? value : parseFloat(value) || null }
    case 'select':
      return { select: value ? { name: String(value) } : null }
    case 'status':
      return { status: value ? { name: String(value) } : null }
    case 'multi_select':
      return {
        multi_select: (Array.isArray(value) ? value : [value])
          .filter(Boolean)
          .map((v) => ({ name: String(v) }))
      }
    case 'date': {
      if (typeof value === 'object' && value.start) return { date: value }
      if (typeof value === 'string') return { date: { start: value } }
      return undefined
    }
    case 'checkbox':
      return { checkbox: Boolean(value) }
    case 'url':
      return { url: String(value) || null }
    case 'email':
      return { email: String(value) || null }
    case 'phone_number':
      return { phone_number: String(value) || null }
    default:
      return undefined
  }
}

export async function createPage({ properties, schema }) {
  const client = getClient()
  const notionProps = {}
  for (const [name, value] of Object.entries(properties)) {
    const type = schema?.[name]?.type
    if (!type) continue
    const built = buildNotionProperty(type, value)
    if (built) notionProps[name] = built
  }
  const page = await client.pages.create({
    parent: { database_id: databaseId },
    properties: notionProps
  })
  return normalizeResult(page)
}

export async function updatePage({ pageId, properties, schema }) {
  const client = getClient()
  const notionProps = {}
  for (const [name, value] of Object.entries(properties)) {
    const type = schema?.[name]?.type
    if (!type) continue
    const built = buildNotionProperty(type, value)
    if (built) notionProps[name] = built
  }
  const page = await client.pages.update({
    page_id: pageId,
    properties: notionProps
  })
  return normalizeResult(page)
}

export async function archivePage({ pageId }) {
  const client = getClient()
  await client.pages.update({
    page_id: pageId,
    archived: true
  })
  return { success: true }
}

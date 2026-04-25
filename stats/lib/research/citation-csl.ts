import Citeproc from 'citeproc'
import type { CitationRecord } from './citation-types'
import { buildCitationString } from './citation-apa-formatter'
import type { LiteratureItem } from '@/lib/types/literature'
import type { DocumentBlueprint } from './document-blueprint-types'

interface CslName {
  family?: string
  given?: string
  literal?: string
}

interface CslDate {
  'date-parts': number[][]
}

interface CslItem {
  id: string
  type: string
  title: string
  author?: CslName[]
  issued?: CslDate
  'container-title'?: string
  DOI?: string
  URL?: string
}

interface CslEngine {
  updateItems(ids: string[]): void
  makeBibliography(): [{ bibstart: string; bibend: string }, string[]]
  appendCitationCluster(citation: {
    citationItems: Array<{ id: string }>
    properties: Record<string, unknown>
  }): Array<[number, string, string]>
}

interface CslModule {
  Engine: new (
    sys: {
      retrieveLocale: (locale: string) => string
      retrieveItem: (id: string) => CslItem | undefined
    },
    style: string,
    locale: string,
  ) => CslEngine
}

const INLINE_CITATION_SCHEME = 'citation:'
const INLINE_CITATION_RE = /\[([^\]]*?)\]\(citation:([^)]+)\)/g

const CSL_LOCALE_EN_US = `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" xml:lang="en-US">
  <terms>
    <term name="and">and</term>
    <term name="et-al">et al.</term>
  </terms>
</locale>`

const CSL_STYLE_APA_LITE = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" version="1.0" class="in-text" default-locale="en-US">
  <info>
    <title>BioHub Narrative APA Lite</title>
    <id>http://biohub.local/styles/apa-lite</id>
  </info>
  <citation>
    <layout prefix="(" suffix=")" delimiter="; ">
      <group delimiter=", ">
        <names variable="author">
          <name form="short" and="symbol" delimiter=", "/>
          <substitute>
            <text variable="title" form="short"/>
          </substitute>
        </names>
        <date variable="issued">
          <date-part name="year"/>
        </date>
      </group>
    </layout>
  </citation>
  <bibliography hanging-indent="true">
    <layout suffix=".">
      <group delimiter=". ">
        <names variable="author">
          <name and="symbol" delimiter=", " name-as-sort-order="all" sort-separator=", " initialize-with=". "/>
          <substitute>
            <text variable="title"/>
          </substitute>
        </names>
        <date variable="issued" prefix="(" suffix=")">
          <date-part name="year"/>
        </date>
        <text variable="title"/>
        <text variable="container-title"/>
        <choose>
          <if variable="DOI">
            <text variable="DOI" prefix="https://doi.org/"/>
          </if>
          <else-if variable="URL">
            <text variable="URL"/>
          </else-if>
        </choose>
      </group>
    </layout>
  </bibliography>
</style>`

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#38;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeAuthor(author: string): CslName {
  const trimmed = author.trim()
  if (!trimmed) {
    return { literal: 'Unknown' }
  }

  if (trimmed.includes(',')) {
    const [family, ...given] = trimmed.split(',')
    return {
      family: family.trim(),
      given: given.join(',').trim() || undefined,
    }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 2 && parts[1] && parts[1].length <= 3) {
    return {
      family: parts[0],
      given: parts[1],
    }
  }

  return { literal: trimmed }
}

function createCslItem(record: CitationRecord): CslItem {
  const item = record.item
  return {
    id: record.id,
    type: 'article-journal',
    title: item.title,
    author: item.authors.length > 0
      ? item.authors.map((author) => normalizeAuthor(author))
      : undefined,
    issued: item.year != null
      ? { 'date-parts': [[item.year]] }
      : undefined,
    'container-title': item.journal,
    DOI: item.doi,
    URL: item.url,
  }
}

function createEngine(records: readonly CitationRecord[]): CslEngine {
  const items = new Map(records.map((record) => [record.id, createCslItem(record)] as const))
  const citeproc = Citeproc as unknown as CslModule
  return new citeproc.Engine({
    retrieveLocale: () => CSL_LOCALE_EN_US,
    retrieveItem: (id: string) => items.get(id),
  }, CSL_STYLE_APA_LITE, 'en-US')
}

export function renderCitationBibliography(
  records: readonly CitationRecord[],
): string[] {
  if (records.length === 0) {
    return []
  }

  try {
    const engine = createEngine(records)
    engine.updateItems(records.map((record) => record.id))
    const [, entries] = engine.makeBibliography()
    return entries.map((entry) => stripHtml(entry))
  } catch {
    return records.map((record) => buildCitationString(record.item))
  }
}

export function renderInlineCitation(record: CitationRecord): string {
  try {
    const engine = createEngine([record])
    engine.updateItems([record.id])
    const rendered = engine.appendCitationCluster({
      citationItems: [{ id: record.id }],
      properties: {},
    })
    return stripHtml(rendered[0]?.[1] ?? '')
  } catch {
    return buildFallbackInlineCitation(record.item)
  }
}

export function buildInlineCitationMarkdown(record: CitationRecord): string {
  return `[${renderInlineCitation(record)}](${INLINE_CITATION_SCHEME}${record.id})`
}

export function collectInlineCitationIds(content: string | undefined): string[] {
  if (!content) {
    return []
  }

  const seen = new Set<string>()
  const ids: string[] = []
  for (const match of content.matchAll(INLINE_CITATION_RE)) {
    const citationId = match[2]?.trim()
    if (!citationId || seen.has(citationId)) {
      continue
    }
    seen.add(citationId)
    ids.push(citationId)
  }
  return ids
}

export function resolveInlineCitationMarkdown(
  content: string | undefined,
  records?: readonly CitationRecord[],
): string {
  if (!content) {
    return ''
  }

  if (!content.includes(`](${INLINE_CITATION_SCHEME}`)) {
    return content
  }

  const recordMap = new Map((records ?? []).map((record) => [record.id, record] as const))
  return content.replace(INLINE_CITATION_RE, (_match, label: string, citationId: string) => {
    const record = recordMap.get(citationId.trim())
    return record ? renderInlineCitation(record) : label
  })
}

export function resolveDocumentInlineCitations(
  document: DocumentBlueprint,
  records?: readonly CitationRecord[],
): DocumentBlueprint {
  return {
    ...document,
    sections: document.sections.map((section) => (
      section.content
        ? {
            ...section,
            content: resolveInlineCitationMarkdown(section.content, records),
          }
        : section
    )),
  }
}

function buildFallbackInlineCitation(item: LiteratureItem): string {
  const authorLabel = item.authors.length > 0
    ? item.authors[0]
    : item.title
  const yearLabel = item.year != null ? String(item.year) : 'n.d.'
  return `(${authorLabel}, ${yearLabel})`
}

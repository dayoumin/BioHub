import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import {
  createTargetJournalProfileSnapshot,
  formatTargetJournalProfileForWriting,
  getDocumentTargetJournalProfileSnapshot,
  getDocumentTargetJournalProfileVersion,
} from '../document-journal-profile'
import { buildSectionWritingContext } from '../document-section-writing-context'

function makeDocument(metadata: DocumentBlueprint['metadata'] = {}): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Draft',
    language: 'en',
    sections: [{
      id: 'methods',
      title: 'Methods',
      content: '',
      sourceRefs: [],
      editable: true,
      generatedBy: 'llm',
    }],
    metadata,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

describe('document-journal-profile', () => {
  it('creates a stable profile snapshot for document writing and freshness', () => {
    const profile = createTargetJournalProfileSnapshot({
      stylePreset: 'imrad',
      label: 'IMRAD manuscript',
      articleType: 'research article',
    })
    const document = makeDocument({ targetJournalProfile: profile })

    expect(getDocumentTargetJournalProfileSnapshot(document)).toEqual(profile)
    expect(getDocumentTargetJournalProfileVersion(document)).toBe(profile.version)
    expect(formatTargetJournalProfileForWriting(profile)).toEqual(expect.arrayContaining([
      'Profile: IMRAD manuscript',
      'Style preset: imrad',
      'Article type: research article',
    ]))
  })

  it('falls back to legacy targetJournal metadata', () => {
    const document = makeDocument({ targetJournal: 'Aquaculture' })

    expect(getDocumentTargetJournalProfileSnapshot(document)).toEqual(expect.objectContaining({
      stylePreset: 'general',
      targetJournal: 'Aquaculture',
      version: 'legacy-target-journal:Aquaculture',
    }))
  })

  it('injects journal requirements into section writing context', () => {
    const profile = {
      ...createTargetJournalProfileSnapshot({
        stylePreset: 'apa',
        label: 'APA journal',
        targetJournal: 'Example Journal',
        abstractWordLimit: 250,
        referenceStyle: 'APA 7',
        requiredStatements: ['Funding statement'],
      }),
    }
    const document = makeDocument({ targetJournalProfile: profile })
    const section = document.sections[0]
    expect(section).toBeDefined()

    const context = buildSectionWritingContext({
      document,
      section: section ?? document.sections[0],
    })

    expect(context.journalRequirements).toEqual(expect.arrayContaining([
      'Profile: APA journal',
      'Target journal: Example Journal',
      'Abstract limit: 250 words',
      'Reference style: APA 7',
      'Required statement: Funding statement',
    ]))
  })

  it('changes profile version when requirement fields change', () => {
    const first = createTargetJournalProfileSnapshot({
      stylePreset: 'apa',
      targetJournal: 'Example Journal',
      requiredStatements: ['Funding statement'],
    })
    const second = createTargetJournalProfileSnapshot({
      stylePreset: 'apa',
      targetJournal: 'Example Journal',
      requiredStatements: ['Funding statement', 'Data availability statement'],
    })

    expect(first.version).not.toBe(second.version)
  })
})

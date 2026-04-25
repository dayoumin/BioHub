/**
 * DocumentPreset 레지스트리 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  createEmptySections,
  createSectionBlueprints,
  getPresetRegistry,
  PRESET_REGISTRY,
} from '../document-preset-registry'

describe('createEmptySections', () => {
  describe('paper preset', () => {
    it('should create 5 sections in Korean', () => {
      const sections = createEmptySections('paper', 'ko')

      expect(sections).toHaveLength(5)
      expect(sections.map(s => s.id)).toEqual([
        'introduction', 'methods', 'results', 'discussion', 'references',
      ])
    })

    it('should use Korean titles for ko language', () => {
      const sections = createEmptySections('paper', 'ko')

      expect(sections[0].title).toBe('서론')
      expect(sections[1].title).toBe('연구 방법')
      expect(sections[2].title).toBe('결과')
      expect(sections[3].title).toBe('고찰')
      expect(sections[4].title).toBe('참고문헌')
    })

    it('should use English titles for en language', () => {
      const sections = createEmptySections('paper', 'en')

      expect(sections[0].title).toBe('Introduction')
      expect(sections[1].title).toBe('Methods')
      expect(sections[2].title).toBe('Results')
      expect(sections[3].title).toBe('Discussion')
      expect(sections[4].title).toBe('References')
    })

    it('should set methods and results as template-generated', () => {
      const sections = createEmptySections('paper', 'ko')

      expect(sections[1].generatedBy).toBe('template') // methods
      expect(sections[2].generatedBy).toBe('template') // results
    })

    it('should set introduction and discussion as user-generated', () => {
      const sections = createEmptySections('paper', 'ko')

      expect(sections[0].generatedBy).toBe('user') // intro
      expect(sections[3].generatedBy).toBe('user') // discussion
    })

    it('should create empty content for all sections', () => {
      const sections = createEmptySections('paper', 'ko')

      for (const section of sections) {
        expect(section.content).toBe('')
        expect(section.sourceRefs).toEqual([])
        expect(section.editable).toBe(true)
      }
    })
  })

  describe('report preset', () => {
    it('should create 6 sections', () => {
      const sections = createEmptySections('report', 'ko')

      expect(sections).toHaveLength(6)
      expect(sections.map(s => s.id)).toEqual([
        'summary', 'background', 'methods', 'results', 'conclusion', 'appendix',
      ])
    })

    it('should use Korean titles', () => {
      const sections = createEmptySections('report', 'ko')

      expect(sections[0].title).toBe('요약')
      expect(sections[5].title).toBe('부록')
    })
  })

  describe('custom preset', () => {
    it('should create 1 blank section', () => {
      const sections = createEmptySections('custom', 'ko')

      expect(sections).toHaveLength(1)
      expect(sections[0].id).toBe('section-1')
      expect(sections[0].generatedBy).toBe('user')
    })
  })

  describe('custom section blueprints', () => {
    it('should build sections from caller-provided blueprints', () => {
      const sections = createEmptySections('paper', 'ko', {
        sectionBlueprints: [
          { id: 'intro', title: '문헌 동향', generatedBy: 'user' },
          { id: 'results', title: '연구 결과', generatedBy: 'template' },
          { title: '결론', generatedBy: 'user' },
        ],
      })

      expect(sections.map((section) => section.id)).toEqual(['intro', 'results', 'section-3'])
      expect(sections.map((section) => section.title)).toEqual(['문헌 동향', '연구 결과', '결론'])
      expect(sections[1]?.generatedBy).toBe('template')
    })

    it('should normalize duplicate or blank ids when building blueprints', () => {
      const blueprints = createSectionBlueprints('custom', 'ko', [
        { title: '결론', generatedBy: 'user' },
        { title: '결론', generatedBy: 'user' },
        { id: 'results', title: '결과 재정리', generatedBy: 'template' },
      ])

      expect(blueprints.map((section) => section.id)).toEqual(['section-1', 'section-2', 'results'])
    })
  })
})

describe('getPresetRegistry', () => {
  it('should return 3 presets', () => {
    const presets = getPresetRegistry()

    expect(presets).toHaveLength(3)
    expect(presets.map(p => p.id)).toEqual(['paper', 'report', 'custom'])
  })

  it('should match section counts', () => {
    const presets = getPresetRegistry()

    expect(presets[0].sectionCount).toBe(5) // paper
    expect(presets[1].sectionCount).toBe(6) // report
    expect(presets[2].sectionCount).toBe(1) // custom
  })

  it('should have both ko and en labels', () => {
    for (const preset of PRESET_REGISTRY) {
      expect(preset.label.ko).toBeTruthy()
      expect(preset.label.en).toBeTruthy()
      expect(preset.description.ko).toBeTruthy()
      expect(preset.description.en).toBeTruthy()
    }
  })
})

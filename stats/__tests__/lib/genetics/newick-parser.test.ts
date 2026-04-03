import { describe, it, expect } from 'vitest'
import { parseNewick } from '@/lib/genetics/newick-parser'

describe('parseNewick', () => {
  it('단순 2종 트리를 파싱한다', () => {
    const tree = parseNewick('(A:0.1,B:0.2);')
    expect(tree.children).toHaveLength(2)
    expect(tree.children![0].name).toBe('A')
    expect(tree.children![0].value).toBeCloseTo(0.1)
    expect(tree.children![1].name).toBe('B')
    expect(tree.children![1].value).toBeCloseTo(0.2)
  })

  it('중첩 트리 ((A,B),C)를 파싱한다', () => {
    const tree = parseNewick('((A:0.1,B:0.2):0.3,C:0.4);')
    expect(tree.children).toHaveLength(2)

    const inner = tree.children![0]
    expect(inner.value).toBeCloseTo(0.3)
    expect(inner.children).toHaveLength(2)
    expect(inner.children![0].name).toBe('A')
    expect(inner.children![1].name).toBe('B')

    expect(tree.children![1].name).toBe('C')
    expect(tree.children![1].value).toBeCloseTo(0.4)
  })

  it('거리 없는 노드를 처리한다', () => {
    const tree = parseNewick('(A,B);')
    expect(tree.children![0].name).toBe('A')
    expect(tree.children![0].value).toBeUndefined()
  })

  it('빈 내부 노드 이름을 허용한다', () => {
    const tree = parseNewick('((A:0.1,B:0.2):0.05,(C:0.3,D:0.4):0.06);')
    expect(tree.children).toHaveLength(2)
    expect(tree.children![0].name).toBe('')
    expect(tree.children![1].name).toBe('')
    expect(tree.children![0].children).toHaveLength(2)
  })

  it('single-quoted 라벨 (메타문자 포함)을 파싱한다', () => {
    const tree = parseNewick("('sample:1':0.1,'A,B':0.2);")
    expect(tree.children![0].name).toBe('sample:1')
    expect(tree.children![0].value).toBeCloseTo(0.1)
    expect(tree.children![1].name).toBe('A,B')
  })

  it('escaped single-quote를 처리한다', () => {
    const tree = parseNewick("('it''s':0.1,B:0.2);")
    expect(tree.children![0].name).toBe("it's")
  })

  it('3종 이상 다분기를 파싱한다', () => {
    const tree = parseNewick('(A:0.1,B:0.2,C:0.3);')
    expect(tree.children).toHaveLength(3)
  })

  it('세미콜론 없이도 파싱한다', () => {
    const tree = parseNewick('(A:0.1,B:0.2)')
    expect(tree.children).toHaveLength(2)
  })

  it('공백이 포함된 Newick을 처리한다', () => {
    const tree = parseNewick('  (A:0.1, B:0.2) ;  ')
    expect(tree.children).toHaveLength(2)
  })
})

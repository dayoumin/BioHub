import {
  findForbiddenSubmissionCopy,
  hasForbiddenSubmissionCopy,
} from '../submission-readiness-terminology'

describe('submission readiness terminology', () => {
  it('detects copy that implies acceptance prediction', () => {
    const text = '이 화면은 합격 가능성과 acceptance probability를 보여주지 않는다.'

    expect(findForbiddenSubmissionCopy(text)).toEqual([
      '합격 가능성',
      'acceptance probability',
    ])
    expect(hasForbiddenSubmissionCopy(text)).toBe(true)
  })

  it('allows checklist and scope-signal language', () => {
    const text = '투고 전 체크리스트와 연구 범위 일치 신호를 확인합니다.'

    expect(findForbiddenSubmissionCopy(text)).toEqual([])
    expect(hasForbiddenSubmissionCopy(text)).toBe(false)
  })
})

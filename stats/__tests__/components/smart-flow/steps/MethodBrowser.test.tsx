/**
 * MethodBrowser Tests
 *
 * 전략: L1 (Store-level) + L2 (data-testid) + render simulation
 *
 * 검증 항목:
 * 1. 불가(incompatible) 메서드 필터링 — 리스트에서 숨김
 * 2. 기술통계 카테고리 제거 — method-catalog 변경 반영
 * 3. 우측 상세 패널 — hover 시 표시
 * 4. warning 메서드는 여전히 표시
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { MethodBrowser } from '@/components/smart-flow/steps/purpose/MethodBrowser'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { StatisticalMethod } from '@/types/smart-flow'
import type { CompatibilityResult } from '@/lib/statistics/data-method-compatibility'

// Mock stores
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: vi.fn()
}))

// Mock terminology
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    methodBrowser: {
      aiRecommendation: { label: 'AI 추천', badge: 'AI' },
      searchPlaceholder: '검색...',
      methodsLabel: '개 방법',
      selectedLabel: '선택됨',
      selectedPrefix: '선택: ',
      useThisButton: '사용',
      requirementsNotMet: '요구사항 미충족',
      compatibilityStatus: { warning: '주의', incompatible: '불가' },
      tooltips: { warning: '주의 필요', incompatible: '사용 불가' },
      noResultsMessage: (q: string) => `"${q}" 결과 없음`,
      clearSearchButton: '초기화',
    },
  }),
}))

// Mock Radix ScrollArea (JSDOM has no scroll)
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}))

// --- Test Fixtures ---
const createMethod = (
  id: string,
  name: string,
  category: StatisticalMethod['category'],
  description = ''
): StatisticalMethod => ({
  id,
  name,
  description: description || `${name} 설명`,
  category,
})

const METHODS = {
  tTest: createMethod('t-test', '독립표본 t-검정', 't-test', '두 독립 그룹 간 평균 차이 검정'),
  pairedT: createMethod('paired-t', '대응표본 t-검정', 't-test', '같은 대상의 전후 차이 검정'),
  anova: createMethod('one-way-anova', '일원분산분석', 'anova', '3개 이상 그룹 간 평균 차이'),
  mannWhitney: createMethod('mann-whitney', 'Mann-Whitney U', 'nonparametric', '비모수 두 그룹 비교'),
  descriptive: createMethod('descriptive', '기술통계량', 'descriptive', '평균, 표준편차, 분위수 등'),
  correlation: createMethod('correlation', '피어슨 상관분석', 'correlation', '두 변수 간 선형 관계'),
}

const defaultGroups = [
  { category: 't-test', categoryLabel: 'T-검정', methods: [METHODS.tTest, METHODS.pairedT] },
  { category: 'anova', categoryLabel: '분산분석 (ANOVA)', methods: [METHODS.anova] },
  { category: 'nonparametric', categoryLabel: '비모수 검정', methods: [METHODS.mannWhitney] },
  { category: 'correlation', categoryLabel: '상관분석', methods: [METHODS.correlation] },
]

const dataProfile = { totalRows: 100, numericVars: 3, categoricalVars: 2 }

// --- Helpers ---
function createCompatMap(entries: Record<string, { status: 'compatible' | 'warning' | 'incompatible'; reasons: string[] }>): Map<string, CompatibilityResult> {
  const map = new Map<string, CompatibilityResult>()
  for (const [key, value] of Object.entries(entries)) {
    map.set(key, { methodId: key, ...value } as CompatibilityResult)
  }
  return map
}

function setupStore(compatibilityMap: Map<string, CompatibilityResult> | null = null) {
  (useSmartFlowStore as unknown as Mock).mockImplementation(
    (selector: (state: { methodCompatibility: Map<string, CompatibilityResult> | null }) => unknown) =>
      selector({ methodCompatibility: compatibilityMap })
  )
}

function renderBrowser(props: Partial<Parameters<typeof MethodBrowser>[0]> = {}) {
  return render(
    <MethodBrowser
      methodGroups={defaultGroups}
      selectedMethod={null}
      onMethodSelect={vi.fn()}
      dataProfile={dataProfile}
      {...props}
    />
  )
}

// =============================================
// Tests
// =============================================
describe('MethodBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStore(null) // no compatibility data
  })

  // ----- 1. 기본 렌더링 -----
  describe('기본 렌더링', () => {
    it('모든 카테고리 헤더가 렌더링된다', () => {
      renderBrowser()

      expect(screen.getByText('T-검정')).toBeInTheDocument()
      expect(screen.getByText('분산분석 (ANOVA)')).toBeInTheDocument()
      expect(screen.getByText('비모수 검정')).toBeInTheDocument()
      // 상관분석은 카테고리명 + 메서드명이 다르므로 카테고리 확인
      expect(screen.getAllByText('상관분석').length).toBeGreaterThanOrEqual(1)
    })

    it('총 메서드 수가 표시된다', () => {
      renderBrowser()

      expect(screen.getByText(/5개 분석 방법/)).toBeInTheDocument()
    })

    it('검색 입력이 존재한다', () => {
      renderBrowser()

      expect(screen.getByTestId('method-search-input')).toBeInTheDocument()
    })

    it('메서드가 선택되지 않았을 때 패널 placeholder가 DOM에 존재한다', () => {
      renderBrowser()

      // lg:block = hidden by default in JSDOM, but exists in DOM
      expect(screen.getByText(/마우스를 올리면/)).toBeInTheDocument()
    })
  })

  // ----- 2. 불가(incompatible) 메서드 필터링 -----
  describe('불가 메서드 필터링', () => {
    it('incompatible 메서드는 리스트에서 숨겨진다', () => {
      const compatMap = createCompatMap({
        't-test': { status: 'incompatible', reasons: ['그룹 변수 필요'] },
        'paired-t': { status: 'compatible', reasons: [] },
        'one-way-anova': { status: 'compatible', reasons: [] },
        'mann-whitney': { status: 'incompatible', reasons: ['그룹 변수 필요'] },
        'correlation': { status: 'compatible', reasons: [] },
      })
      setupStore(compatMap)
      renderBrowser()

      // incompatible → hidden
      expect(screen.queryByText('독립표본 t-검정')).not.toBeInTheDocument()
      expect(screen.queryByText('Mann-Whitney U')).not.toBeInTheDocument()

      // compatible → visible
      expect(screen.getByText('대응표본 t-검정')).toBeInTheDocument()
      expect(screen.getByText('일원분산분석')).toBeInTheDocument()
      expect(screen.getByText('피어슨 상관분석')).toBeInTheDocument()
    })

    it('전체 카테고리가 incompatible이면 카테고리도 숨겨진다', () => {
      const compatMap = createCompatMap({
        't-test': { status: 'incompatible', reasons: ['필요 변수 없음'] },
        'paired-t': { status: 'incompatible', reasons: ['필요 변수 없음'] },
        'one-way-anova': { status: 'compatible', reasons: [] },
        'mann-whitney': { status: 'compatible', reasons: [] },
        'correlation': { status: 'compatible', reasons: [] },
      })
      setupStore(compatMap)
      renderBrowser()

      // T-검정 카테고리 전체 incompatible → 카테고리 헤더도 사라져야 함
      expect(screen.queryByText('T-검정')).not.toBeInTheDocument()

      // 다른 카테고리는 존재
      expect(screen.getByText('분산분석 (ANOVA)')).toBeInTheDocument()
    })

    it('warning 메서드는 여전히 표시된다', () => {
      const compatMap = createCompatMap({
        't-test': { status: 'warning', reasons: ['표본 크기 부족 (권장: 30+)'] },
        'paired-t': { status: 'compatible', reasons: [] },
        'one-way-anova': { status: 'compatible', reasons: [] },
        'mann-whitney': { status: 'compatible', reasons: [] },
        'correlation': { status: 'compatible', reasons: [] },
      })
      setupStore(compatMap)
      renderBrowser()

      // warning → still visible with badge
      expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()
      expect(screen.getByText('주의')).toBeInTheDocument()
    })

    it('메서드 수가 필터링 후 올바르게 표시된다', () => {
      const compatMap = createCompatMap({
        't-test': { status: 'incompatible', reasons: [] },
        'paired-t': { status: 'compatible', reasons: [] },
        'one-way-anova': { status: 'incompatible', reasons: [] },
        'mann-whitney': { status: 'compatible', reasons: [] },
        'correlation': { status: 'compatible', reasons: [] },
      })
      setupStore(compatMap)
      renderBrowser()

      // 5 total - 2 incompatible = 3 visible
      expect(screen.getByText(/3개 분석 방법/)).toBeInTheDocument()
    })
  })

  // ----- 3. 기술통계 카테고리 제거 -----
  describe('기술통계 카테고리', () => {
    it('MethodBrowser는 전달된 groups를 렌더링한다 (카탈로그 레벨에서 제거됨)', () => {
      const groupsWithDescriptive = [
        ...defaultGroups,
        { category: 'descriptive' as const, categoryLabel: '기술통계', methods: [METHODS.descriptive] },
      ]
      renderBrowser({ methodGroups: groupsWithDescriptive })

      // MethodBrowser 자체는 전달된 groups를 그대로 렌더링
      expect(screen.getByText('기술통계')).toBeInTheDocument()
    })
  })

  // ----- 4. method-catalog 변경 검증 (unit test) -----
  describe('method-catalog: descriptive 제거 검증', () => {
    it('getAllMethodsGrouped()에 descriptive 카테고리가 없다', async () => {
      const { getAllMethodsGrouped } = await import('@/lib/statistics/method-catalog')
      const groups = getAllMethodsGrouped()

      const descriptiveGroup = groups.find(g => g.category === 'descriptive')
      expect(descriptiveGroup).toBeUndefined()
    })

    it('distribution 목적에 descriptive 카테고리가 포함되지 않는다', async () => {
      const { PURPOSE_CATEGORY_MAP } = await import('@/lib/statistics/method-catalog')

      expect(PURPOSE_CATEGORY_MAP.distribution).not.toContain('descriptive')
    })
  })

  // ----- 5. 검색 기능 -----
  describe('검색 필터링', () => {
    it('검색어에 맞는 메서드만 표시된다', () => {
      renderBrowser()

      const searchInput = screen.getByTestId('method-search-input')
      fireEvent.change(searchInput, { target: { value: 'anova' } })

      expect(screen.getByText('일원분산분석')).toBeInTheDocument()
      expect(screen.queryByText('독립표본 t-검정')).not.toBeInTheDocument()
    })

    it('검색 결과가 없으면 안내 메시지가 표시된다', () => {
      renderBrowser()

      const searchInput = screen.getByTestId('method-search-input')
      fireEvent.change(searchInput, { target: { value: 'zzzznotexist' } })

      expect(screen.getByText(/"zzzznotexist" 결과 없음/)).toBeInTheDocument()
    })
  })

  // ----- 6. 우측 상세 패널 -----
  describe('상세 패널 (hover)', () => {
    it('hover 전에는 description이 리스트에만 1회, hover 후에는 리스트+패널 2회 나타난다', () => {
      renderBrowser()

      // hover 전: description은 리스트에서만 1회
      expect(screen.getAllByText('두 독립 그룹 간 평균 차이 검정')).toHaveLength(1)

      // hover 후: 리스트 + 상세 패널 = 2회
      const tTestButton = screen.getByText('독립표본 t-검정').closest('button')
      expect(tTestButton).not.toBeNull()
      fireEvent.mouseEnter(tTestButton as HTMLElement)

      expect(screen.getAllByText('독립표본 t-검정')).toHaveLength(2) // list + h4 header
      expect(screen.getAllByText('두 독립 그룹 간 평균 차이 검정')).toHaveLength(2) // list + panel body
    })

    it('hover 해제 시 placeholder로 돌아간다 (선택된 메서드 없을 때)', () => {
      renderBrowser()

      const tTestButton = screen.getByText('독립표본 t-검정').closest('button')
      expect(tTestButton).not.toBeNull()

      // hover → 패널 나타남, placeholder 사라짐
      fireEvent.mouseEnter(tTestButton as HTMLElement)
      expect(screen.queryByText(/마우스를 올리면/)).not.toBeInTheDocument()

      // unhover → placeholder 복귀
      fireEvent.mouseLeave(tTestButton as HTMLElement)
      expect(screen.getByText(/마우스를 올리면/)).toBeInTheDocument()
    })

    it('선택된 메서드가 있으면: 초기=선택메서드, hover=다른메서드, unhover=선택메서드 복귀', () => {
      renderBrowser({ selectedMethod: METHODS.correlation })

      // 초기 상태: 선택된 correlation의 description이 리스트(1) + 패널(1) = 2회
      expect(screen.getAllByText('두 변수 간 선형 관계')).toHaveLength(2)
      // anova description은 리스트에서만 1회
      expect(screen.getAllByText('3개 이상 그룹 간 평균 차이')).toHaveLength(1)

      // hover anova → anova가 패널에 표시되어 2회
      const anovaButton = screen.getByText('일원분산분석').closest('button')
      expect(anovaButton).not.toBeNull()
      fireEvent.mouseEnter(anovaButton as HTMLElement)
      expect(screen.getAllByText('3개 이상 그룹 간 평균 차이')).toHaveLength(2)
      // correlation description은 리스트에서만 1회로 돌아감
      expect(screen.getAllByText('두 변수 간 선형 관계')).toHaveLength(1)

      // unhover → 선택된 correlation 복귀
      fireEvent.mouseLeave(anovaButton as HTMLElement)
      expect(screen.getAllByText('두 변수 간 선형 관계')).toHaveLength(2)
      expect(screen.getAllByText('3개 이상 그룹 간 평균 차이')).toHaveLength(1)
    })

    it('데이터 프로필이 패널에 정확한 숫자로 표시된다', () => {
      renderBrowser({ selectedMethod: METHODS.tTest })

      // 상세 패널의 "현재 데이터" 섹션 확인
      // 패널 안에 grid > div 구조로 숫자+라벨 쌍이 존재
      const totalRowsEl = screen.getByText('100')
      expect(totalRowsEl).toBeInTheDocument()
      // 100의 부모 div 안에 '표본' 라벨이 형제로 존재
      const totalRowsContainer = totalRowsEl.closest('.rounded-lg')
      expect(totalRowsContainer).not.toBeNull()
      expect(totalRowsContainer?.textContent).toContain('표본')

      const numericEl = screen.getByText('3')
      const numericContainer = numericEl.closest('.rounded-lg')
      expect(numericContainer).not.toBeNull()
      expect(numericContainer?.textContent).toContain('연속형')

      // '2'는 badge count 등에서도 나올 수 있으므로, 범주형 라벨과 함께 있는 것을 확인
      const allTwos = screen.getAllByText('2')
      const categoricalTwo = allTwos.find(el => {
        const container = el.closest('.rounded-lg')
        return container?.textContent?.includes('범주형')
      })
      expect(categoricalTwo).toBeDefined()
    })

    it('패널의 "선택됨" 버튼이 선택된 메서드에서 보인다', () => {
      renderBrowser({ selectedMethod: METHODS.tTest })

      const selectButton = screen.getByRole('button', { name: '선택됨' })
      expect(selectButton).toBeInTheDocument()
    })

    it('패널의 "이 방법 사용" 버튼 클릭 시 정확한 메서드 객체로 onMethodSelect가 호출된다', () => {
      const mockSelect = vi.fn()
      renderBrowser({ onMethodSelect: mockSelect })

      // hover 전: "이 방법 사용" 버튼 없음 (placeholder 상태)
      expect(screen.queryByRole('button', { name: '이 방법 사용' })).not.toBeInTheDocument()

      // hover → 패널에 버튼 나타남
      const anovaButton = screen.getByText('일원분산분석').closest('button')
      expect(anovaButton).not.toBeNull()
      fireEvent.mouseEnter(anovaButton as HTMLElement)

      const useButton = screen.getByRole('button', { name: '이 방법 사용' })
      fireEvent.click(useButton)

      // 정확한 메서드 객체로 호출됨
      expect(mockSelect).toHaveBeenCalledTimes(1)
      expect(mockSelect).toHaveBeenCalledWith(METHODS.anova)
    })
  })

  // ----- 7. AI 추천 헤더 -----
  describe('AI 추천 표시', () => {
    it('추천 메서드가 있으면 헤더에 표시된다', () => {
      renderBrowser({ recommendedMethodId: 't-test' })

      expect(screen.getByText('AI 추천')).toBeInTheDocument()
    })

    it('추천 메서드가 incompatible이면 비활성 스타일로 표시된다', () => {
      const compatMap = createCompatMap({
        't-test': { status: 'incompatible', reasons: ['그룹 변수 없음'] },
        'paired-t': { status: 'compatible', reasons: [] },
        'one-way-anova': { status: 'compatible', reasons: [] },
        'mann-whitney': { status: 'compatible', reasons: [] },
        'correlation': { status: 'compatible', reasons: [] },
      })
      setupStore(compatMap)
      renderBrowser({ recommendedMethodId: 't-test' })

      // AI recommendation header still shows (even if incompatible)
      expect(screen.getByText('AI 추천')).toBeInTheDocument()
      expect(screen.getByText('요구사항 미충족')).toBeInTheDocument()
    })
  })
})

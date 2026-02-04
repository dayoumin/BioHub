# Smart Flow 디자인 일관성 개선 계획

## 현재 상태 분석

### 스텝별 UI 패턴 비교

| 요소 | Step 1 (탐색) | Step 2 (방법) | Step 3 (변수) | Step 4a (실행) | Step 4b (결과) |
|------|:---:|:---:|:---:|:---:|:---:|
| **Card 래핑** | ✅ 사용 | ❌ 없음 | ❌ 없음 | ❌ 없음 | ✅ 사용 |
| **헤더 패턴** | Icon+Title+Btn | 없음 | Icon+Title+Badge | 없음 | Title+Time |
| **Tab/Collapsible** | ContentTabs | FilterToggle | Alert | 단계 리스트 | Collapsible |
| **Badge** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Tooltip** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **StepNavigation** | ✅ 사용 | ❌ 내부처리 | ❌ 내부처리 | ❌ 자동진행 | ❌ 없음 |
| **루트 간격** | space-y-6 | space-y-6 | space-y-6 | space-y-6 | space-y-4 |

### 핵심 문제점

1. **Card 래핑 불일치**: Step 1, 4b만 Card 사용
2. **헤더 패턴 불일치**: 각 스텝마다 다른 헤더 구조
3. **상태 표시 패턴 불일치**: Badge, Alert, 커스텀 div 혼용
4. **도움말 시스템 부재**: Step 4b에만 Tooltip 적용
5. **네비게이션 중복**: 플로팅 버튼 + 기존 StepNavigation 역할 분담 불명확

---

## 기존 공통 컴포넌트 현황 (추가됨)

### 이미 존재하는 컴포넌트 (재활용 필요)

| 컴포넌트 | 위치 | 용도 | 계획과의 관계 |
|----------|------|------|---------------|
| **StepNavigation** | `smart-flow/StepNavigation.tsx` | 이전/다음 버튼 | 플로팅 버튼과 역할 분담 필요 |
| **GuidanceCard** | `common/analysis/GuidanceCard.tsx` | 완료 안내 카드 | StatusIndicator와 유사 → 확장 |
| **FloatingStepIndicator** | `common/FloatingStepIndicator.tsx` | 스텝 표시 | 이미 SmartFlowLayout에서 사용 |
| **AIAnalysisProgress** | `common/analysis/AIAnalysisProgress.tsx` | AI 분석 진행 표시 | 재활용 |
| **PurposeCard** | `common/analysis/PurposeCard.tsx` | 목적 선택 카드 | 재활용 |

### 중복 방지 전략

1. **StepNavigation vs 플로팅 버튼**
   - StepNavigation: 스텝 내부 하단 (상세 옵션 있을 때)
   - 플로팅 버튼: 전역 (빠른 이동용)
   - **규칙**: 둘 다 표시하지 않음 (플로팅 버튼 우선)

2. **GuidanceCard vs StatusIndicator**
   - GuidanceCard: 완료/성공 안내 + CTA 버튼 포함
   - StatusIndicator: 단순 상태 표시 (성공/경고/오류)
   - **결론**: StatusIndicator는 GuidanceCard를 확장하는 형태로 구현

---

## 개선 계획

### Phase 1: 공통 컴포넌트 생성 (Priority: High)

#### 1-1. StepContainer 컴포넌트
```tsx
// components/smart-flow/common/StepContainer.tsx
interface StepContainerProps {
  children: ReactNode
  title: string
  icon: LucideIcon
  badge?: { label: string; variant?: 'default' | 'secondary' | 'outline' }
  action?: ReactNode // 우측 버튼/메뉴
  helpText?: string  // Tooltip 내용
  className?: string
}
```

**역할**: 모든 스텝에 일관된 헤더 + 컨테이너 제공

#### 1-2. StepHeader 컴포넌트
```tsx
// components/smart-flow/common/StepHeader.tsx
// 패턴: Icon (5x5) + Title (text-xl font-semibold) + Badge + | + Right Action
interface StepHeaderProps {
  icon: LucideIcon
  title: string
  badge?: { label: string; variant?: 'default' | 'secondary' | 'outline' }
  action?: ReactNode
  helpText?: string
}
```

#### 1-3. StatusIndicator 컴포넌트 (GuidanceCard 확장)
```tsx
// components/smart-flow/common/StatusIndicator.tsx
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending'
  title: string
  description?: string
  ctaText?: string
  onCtaClick?: () => void
}
```

**예시**:
- success: 초록 배경 + CheckCircle2 (GuidanceCard 스타일 유지)
- warning: 노란 배경 + AlertCircle
- error: 빨간 배경 + XCircle
- pending: 회색 배경 + Loader2

---

### Phase 2: 각 스텝 리팩토링 (Priority: Medium)

#### 2-1. VariableSelectionStep 개선
- [ ] StepContainer 래핑 추가
- [ ] 헤더 패턴 통일 (Icon + "변수 선택" + Method Badge)
- [ ] Alert → StatusIndicator 변경
- [ ] **StepNavigation 제거** (플로팅 버튼 사용)

#### 2-2. PurposeInputStep 개선
- [ ] 모드별 StepContainer 래핑 (AI / Browse / Category)
- [ ] FilterToggle 스타일 유지 (기능적으로 적합)
- [ ] 선택된 방법 미리보기 Card 추가
- [ ] **내부 네비게이션 제거** (플로팅 버튼 사용)

#### 2-3. AnalysisExecutionStep 개선
- [ ] StepContainer 래핑 (중앙 정렬 레이아웃 유지)
- [ ] Progress UI를 Card로 감싸기
- [ ] 완료 상태 → StatusIndicator 사용
- [ ] 취소/일시정지 버튼 스타일 통일

#### 2-4. DataExplorationStep 개선
- [ ] 헤더 패턴 StepHeader로 교체
- [ ] Tooltip 추가 (데이터 크기 제한 등)
- [ ] **기존 StepNavigation 유지** (상세 옵션 때문)

---

### Phase 3: 반응형 및 접근성 (Priority: Medium) - 추가됨

#### 3-1. 반응형 디자인 가이드
| 화면 | 브레이크포인트 | 레이아웃 변화 |
|------|---------------|--------------|
| 모바일 | < 640px (sm) | 단일 컬럼, 플로팅 버튼 작게 |
| 태블릿 | 640-1024px | 2컬럼 가능 |
| 데스크탑 | > 1024px | 최대 3컬럼 |

#### 3-2. 접근성 체크리스트
- [ ] 모든 버튼에 `aria-label` 추가
- [ ] 키보드 네비게이션 지원 (Tab, Enter, Escape)
- [ ] 색상 대비 검증 (WCAG AA 기준)
- [ ] `prefersReducedMotion` 지원 (GuidanceCard 참고)
- [ ] 스크린 리더 테스트

#### 3-3. 다크 모드 검증
- [ ] 모든 새 컴포넌트에 `dark:` 클래스 적용
- [ ] 색상 팔레트 다크 모드 대응 확인
- [ ] 테두리 색상 다크 모드 대응

---

### Phase 4: 스타일 가이드 문서화 (Priority: Low)

#### 4-1. 버튼 스타일 가이드
| 용도 | variant | size | 예시 |
|------|---------|------|------|
| 주요 액션 | default | md/lg | "분석 실행", "저장" |
| 보조 액션 | outline | sm | "PDF 내보내기", "복사" |
| 취소/닫기 | ghost | sm | "취소", "X" |
| 더보기 | outline | sm (icon) | MoreHorizontal |

#### 4-2. 색상 의미 가이드
| 색상 | 의미 | CSS 클래스 |
|------|------|-----------|
| green-500/50 | 성공/유의함 | `bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200` |
| amber-500/50 | 경고/주의 | `bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200` |
| red-500/50 | 오류/실패 | `bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200` |
| blue-500/50 | 정보/안내 | `bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200` |
| gray-500/50 | 중립/미정 | `bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300` |

#### 4-3. 아이콘 크기 가이드
| 위치 | 크기 | 예시 |
|------|------|------|
| 헤더 아이콘 | w-5 h-5 | StepHeader의 Icon |
| 버튼 내 아이콘 | w-4 h-4 | Button 내 Icon |
| 상태 아이콘 | w-5 h-5 | StatusIndicator |
| 카드 내 아이콘 | w-4 h-4 | Badge, 작은 표시 |

#### 4-4. 애니메이션 가이드 - 추가됨
| 용도 | 클래스 | 조건 |
|------|--------|------|
| 페이드 인 | `animate-in fade-in` | `!prefersReducedMotion` |
| 슬라이드 업 | `slide-in-from-bottom-4` | `!prefersReducedMotion` |
| 로딩 스핀 | `animate-spin` | 항상 |
| 펄스 | `animate-pulse` | 항상 (미세 효과) |

---

### Phase 5: 테스트 업데이트 - 추가됨

#### 5-1. 기존 테스트 호환성
- [ ] `ResultsActionStep.test.tsx` 업데이트
- [ ] `PurposeInputStep.test.tsx` 업데이트
- [ ] `DataExplorationStep` 관련 테스트 확인

#### 5-2. 새 컴포넌트 테스트
- [ ] `StepContainer.test.tsx` 작성
- [ ] `StepHeader.test.tsx` 작성
- [ ] `StatusIndicator.test.tsx` 작성

#### 5-3. 접근성 테스트
- [ ] `jest-axe` 또는 `@axe-core/react` 활용
- [ ] 키보드 네비게이션 테스트

---

## 구현 우선순위

### 즉시 구현 (1-2일)
1. StepContainer 컴포넌트 생성
2. StepHeader 컴포넌트 생성
3. StatusIndicator 컴포넌트 생성 (GuidanceCard 확장)

### 단기 구현 (3-5일)
4. VariableSelectionStep 리팩토링
5. AnalysisExecutionStep 리팩토링
6. PurposeInputStep 헤더 추가
7. StepNavigation vs 플로팅 버튼 역할 정리

### 중기 구현 (1주)
8. DataExplorationStep Tooltip 추가
9. 반응형 디자인 검증
10. 다크 모드 검증
11. 접근성 검증

### 장기 구현 (2주)
12. 스타일 가이드 문서 완성
13. Design System 페이지 업데이트
14. 테스트 코드 업데이트

---

## 리스크 및 의존성 - 추가됨

### 리스크
1. **기존 테스트 실패 가능성**: UI 변경으로 인한 스냅샷/DOM 테스트 실패
2. **사용자 혼란**: 갑작스러운 UI 변경으로 인한 적응 필요
3. **성능 영향**: 새 컴포넌트 추가로 인한 번들 크기 증가

### 의존성
1. **shadcn/ui**: Card, Badge, Button, Tooltip 등 의존
2. **lucide-react**: 아이콘 의존
3. **tailwindcss**: 다크 모드, 반응형 클래스 의존

### 완화 전략
1. 점진적 마이그레이션 (한 스텝씩)
2. Feature Flag로 새 UI 선택적 적용 가능
3. Tree-shaking으로 미사용 코드 제거

---

## 예상 결과

### Before
- 각 스텝별 다른 UI 패턴
- 사용자가 단계 전환 시 시각적 혼란
- 새 기능 추가 시 패턴 불일치 위험

### After
- 모든 스텝에서 일관된 헤더/컨테이너
- 색상, 아이콘, 버튼 패턴 통일
- 새 기능 추가 시 공통 컴포넌트 재사용
- 접근성 및 반응형 디자인 보장

---

## 파일 생성 계획

```
components/smart-flow/common/
├── StepContainer.tsx      # 공통 스텝 래퍼
├── StepHeader.tsx         # 공통 헤더
├── StatusIndicator.tsx    # 상태 표시 (GuidanceCard 확장)
├── index.ts               # 배럴 파일
└── __tests__/
    ├── StepContainer.test.tsx
    ├── StepHeader.test.tsx
    └── StatusIndicator.test.tsx
```

---

**작성일**: 2026-02-04
**작성자**: Claude Code
**상태**: 계획 수립 완료 - 승인 대기
**버전**: v2 (기존 컴포넌트 분석, 반응형, 접근성, 테스트, 리스크 추가)

# 📅 Week 3 개발 계획 (2025-09-15 ~ 19)

## 🎯 핵심 목표
**"단일 페이지 통합 분석 인터페이스 구현"**
- 한 화면에서 모든 통계 분석 과정 완성
- 단계별 가이드와 진행 상태 표시
- 결과 후 다음 액션 자동 제안

## 📋 Day-by-Day 작업 계획

### 📆 Day 1 (월요일) - 기본 구조 설계
**오전**
- [ ] `/app/(dashboard)/smart-flow/page.tsx` 생성
- [ ] 기본 레이아웃 구성
- [ ] 5단계 플로우 설계

**오후**
- [ ] `ProgressStepper` 컴포넌트 개발
- [ ] 단계 이동 로직 구현
- [ ] URL 상태 동기화

### 📆 Day 2 (화요일) - 상태 관리
**오전**
- [ ] Zustand store 설정 (`/lib/stores/analysisFlow.ts`)
- [ ] 각 단계별 상태 정의
- [ ] 상태 유지 로직 구현

**오후**
- [ ] 네비게이션 컨트롤 구현
- [ ] 이전/다음 버튼 로직
- [ ] 단계 검증 시스템

### 📆 Day 3 (수요일) - 데이터 입력/검증
**오전**
- [ ] `DataUploadStep` 컴포넌트
- [ ] 드래그 앤 드롭 UI
- [ ] 파일 형식 검증

**오후**
- [ ] `DataValidationStep` 컴포넌트
- [ ] 실시간 검증 표시
- [ ] 검증 결과 시각화

### 📆 Day 4 (목요일) - 분석 설정
**오전**
- [ ] `PurposeInputStep` 컴포넌트
- [ ] 자연어 입력 폼
- [ ] 예시 문장 제공

**오후**
- [ ] AI 추천 시스템 연결
- [ ] 통계 방법 추천 UI
- [ ] 방법 선택 인터페이스

### 📆 Day 5 (금요일) - 분석 실행/결과
**오전**
- [ ] `AnalysisExecutionStep` 컴포넌트
- [ ] 실시간 진행 표시
- [ ] 로딩 애니메이션

**오후**
- [ ] `ResultsActionStep` 컴포넌트
- [ ] 결과 시각화
- [ ] 통계 수치 표시

### 📆 Day 6 (토요일) - 다음 액션
**오전**
- [ ] 다음 액션 추천 엔진
- [ ] 추가 분석 제안
- [ ] 사후검정 가이드

**오후**
- [ ] PDF 보고서 생성
- [ ] 결과 다운로드
- [ ] 공유 기능

### 📆 Day 7 (일요일) - 통합 테스트
**오전**
- [ ] 전체 플로우 E2E 테스트
- [ ] 엣지 케이스 처리
- [ ] 에러 핸들링

**오후**
- [ ] 애니메이션 적용
- [ ] 반응형 디자인
- [ ] 성능 최적화

## 🛠️ 기술 구현 상세

### 컴포넌트 구조
```
/app/(dashboard)/smart-flow/
├── page.tsx                    # 메인 페이지
├── components/
│   ├── ProgressStepper.tsx     # 진행 상태 표시
│   ├── steps/
│   │   ├── DataUploadStep.tsx
│   │   ├── DataValidationStep.tsx
│   │   ├── PurposeInputStep.tsx
│   │   ├── AnalysisExecutionStep.tsx
│   │   └── ResultsActionStep.tsx
│   └── NavigationControls.tsx  # 이전/다음 버튼
```

### 상태 관리 구조
```typescript
// /lib/stores/analysisFlow.ts
interface AnalysisFlowStore {
  // Current state
  currentStep: 1 | 2 | 3 | 4 | 5
  isLoading: boolean
  
  // Step 1: Upload
  uploadedFile: File | null
  uploadedData: any[] | null
  
  // Step 2: Validation
  validationResults: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    stats: DataStats
  } | null
  
  // Step 3: Purpose
  analysisPurpose: string
  recommendedMethods: StatisticalMethod[]
  
  // Step 4: Analysis
  selectedMethod: StatisticalMethod | null
  analysisProgress: number
  
  // Step 5: Results
  analysisResults: AnalysisResult | null
  nextActions: Action[]
  
  // Actions
  setStep: (step: number) => void
  uploadFile: (file: File) => Promise<void>
  validateData: () => Promise<void>
  setPurpose: (purpose: string) => void
  executeAnalysis: () => Promise<void>
  reset: () => void
}
```

## ✅ 완료 기준

### 필수 기능
- [ ] 5단계 플로우 완전 동작
- [ ] 각 단계 데이터 유지
- [ ] 진행 상태 시각적 표시
- [ ] 다음 액션 자동 제안
- [ ] 모바일 반응형

### 품질 기준
- [ ] 3초 이내 페이지 로드
- [ ] 모든 액션 즉각 반응
- [ ] 에러 시 복구 가능
- [ ] 접근성 WCAG 2.1 AA

### 테스트 시나리오
1. CSV 파일 업로드 → 검증 → 분석 → 결과
2. Excel 파일 업로드 → 에러 처리
3. 큰 파일 (100MB+) 처리
4. 네트워크 끊김 시 복구
5. 브라우저 새로고침 후 상태 유지

## 📚 참고 자료

### UI/UX 레퍼런스
- **Typeform**: 단계별 진행 UX
- **Google Forms**: 조건부 로직
- **Airtable**: 데이터 업로드 UI
- **Tableau**: 분석 워크플로우

### 기술 문서
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand 상태 관리](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [Framer Motion](https://www.framer.com/motion/)

## 🎊 Week 3 완료 시 기대 결과

1. **사용자 경험**
   - 페이지 이동 없이 완전한 분석 수행
   - 초보자도 5분 내 분석 완료
   - 전문가급 결과 획득

2. **기술적 성과**
   - 완전한 SPA 분석 플로우
   - 실시간 상태 관리
   - 최적화된 성능

3. **비즈니스 가치**
   - 사용자 이탈률 50% 감소
   - 분석 완료율 80% 달성
   - 재사용률 향상

---

## 📝 메모

- **중요**: 기존 메뉴와 페이지는 그대로 유지
- **포커스**: 단일 페이지 플로우에 집중
- **목표**: "가장 쉬운 통계 분석 도구"

---

*Last updated: 2025-09-12*
*Next review: 2025-09-15 (Week 3 시작)*
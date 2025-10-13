# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri

## 🔴 현재 상태

### ✅ Phase 1 완료 (2025-09-11 ~ 09-26)
- Next.js 15 + TypeScript + shadcn/ui 프로젝트 구축
- 38개 통계 페이지 100% 구현
- 스마트 분석 플로우 (파일 업로드 → 검증 → 분석 → 결과)

### ✅ Phase 2 완료 (2025-10-01)
**목표 달성**: 2,488줄 Switch 문 → 112줄 라우터 기반 (95.5% 감소)

**성과**:
- 50/50 메서드 (100% 완료)
- 16개 핸들러 파일 (6,651줄)
- 27개 테스트 100% 통과
- 코드 리뷰 평균 97.5/100점

**📄 상세**: [statistical-platform/docs/phase2-complete.md](statistical-platform/docs/phase2-complete.md)

### ✅ Phase 3 완료 (2025-10-01)
**목표 달성**: Groups 5-6 고급 통계 메서드 9개 Python 구현 완료

**성과**:
- pyodide-statistics.ts (2,518 → 3,434줄)
- 9개 Python 메서드 (936줄)
- 17개 통합 테스트 100% 통과
- **50/50 메서드 Python 구현 완료**

**📄 상세**: [statistical-platform/docs/phase3-complete.md](statistical-platform/docs/phase3-complete.md)

### ✅ Phase 4-1 완료 (2025-10-02)
**목표 달성**: Pyodide 런타임 테스트 완료

**성과**:
- E2E 테스트 3/3 통과 (100%)
- 30개 Python 메서드 import 문제 해결
- 싱글톤 패턴 44배 성능 개선 검증 (11.8초 → 0.27초)
- Pyodide + NumPy + SciPy 브라우저 작동 확인

**📄 상세**: [statistical-platform/docs/phase4-runtime-test-complete.md](statistical-platform/docs/phase4-runtime-test-complete.md)

### 🔄 Phase 4-2 다음 (시작 예정: 2025-10-03)
**다음 단계**:
1. **다양한 통계 메서드 런타임 테스트** ⭐ 다음
2. **성능 최적화** - 예정
3. **고급 시각화** - 예정

**📄 상세 계획**: [statistical-platform/docs/phase4-next-steps.md](statistical-platform/docs/phase4-next-steps.md)

## 📋 개발 가이드라인

### ⚠️ 중요 원칙

1. **TypeScript 타입 안전성** (CRITICAL)
   - ❌ `any` 타입 사용 절대 금지
   - ✅ `unknown` 사용 후 타입 가드로 안전하게 타입 좁히기
   - ✅ 제네릭과 유니온 타입 적극 활용
   - ✅ 타입 가드 함수 작성으로 런타임 안전성 보장

2. **통계 계산 규칙** (CRITICAL)
   - ❌ JavaScript로 통계 함수 직접 구현 금지
   - ✅ Pyodide + Python 라이브러리 사용 (SciPy, statsmodels, pingouin)
   - ✅ 신뢰성: R/SPSS와 0.0001 오차 이내 보장
   - ✅ Pyodide는 CDN에서 로드 (npm 패키지 사용 금지)
   - ✅ `pyodideService` 통합 서비스 사용 (직접 로딩 금지)

3. **코드 스타일**
   - ❌ 이모지 사용 절대 금지 (변수명, 함수명, 주석)
   - ✅ Next.js 15 App Router 사용 (Pages Router 금지)
   - ✅ shadcn/ui 컴포넌트 우선 사용

4. **AI 코딩 3단계 프로세스**
   1. 타입 설계 우선 (interface/type 정의 먼저)
   2. 코드 생성 (타입 안전한 구현)
   3. 자동 검증 (생성 후 즉시 컴파일 확인)

5. **윈도우 경로 처리**
   - ✅ 모든 경로는 POSIX 형식 (슬래시 `/`)
   - ❌ 백슬래시 `\` 사용 금지

6. **AI 코딩 엄격 규칙** (CRITICAL - 사람이 아닌 AI 작업)

   **타입 안전성 강화**:
   - ✅ 모든 함수에 명시적 타입 지정 (파라미터 + 리턴)
   - ✅ `Promise<T>` 리턴 타입 명시 (async 함수)
   - ✅ null/undefined 체크 필수 (early return 패턴)
   - ✅ 옵셔널 체이닝 (`?.`) 적극 사용
   - ❌ Non-null assertion (`!`) 절대 금지 → 타입 가드로 대체

   **Null 안전성**:
   ```typescript
   // ❌ 나쁜 예
   function process(data: any) {
     return data.value!  // Non-null assertion
   }

   // ✅ 좋은 예
   function process(data: unknown): number {
     if (!data || typeof data !== 'object') {
       throw new Error('Invalid data')
     }
     if (!('value' in data) || typeof data.value !== 'number') {
       throw new Error('Missing or invalid value')
     }
     return data.value
   }
   ```

   **Pyodide 서비스 호출 규칙**:
   - ✅ `pyodideService.descriptiveStats()` ← 실제 메서드 확인 후 사용
   - ✅ `pyodideService.shapiroWilkTest()` ← 카멜케이스 준수
   - ❌ `pyodideService.testNormality()` ← 구버전 메서드 사용 금지
   - ✅ 새 메서드 추가 전 `Grep`으로 기존 메서드 검색

   **컴파일 체크 필수**:
   - ✅ 코드 작성 후 즉시 `npx tsc --noEmit` 실행
   - ✅ 타입 오류 0개 확인 후 커밋
   - ✅ 빌드 성공 확인 (`npm run build`)

7. **리팩토링 후 정리 체크리스트** (CRITICAL)
   - ✅ 타입/인터페이스 변경 시 전체 코드베이스에서 이전 이름 검색
   - ✅ `Grep` 도구로 이전 타입명 완전 제거 확인
   - ✅ `.backup`, `.old`, `.new` 같은 임시 파일 삭제
   - ✅ TypeScript 컴파일 체크로 타입 오류 0개 확인
   - ✅ 문서/주석에서도 이전 명칭 업데이트
   - ❌ 이전 파일/타입을 남겨두고 새 이름만 추가 금지

## 🛠️ 기술 스택

```
Frontend: Next.js 15 + TypeScript + shadcn/ui + Tailwind
통계 엔진: Pyodide + SciPy + NumPy + Pandas
상태 관리: Zustand + TanStack Query
데스크탑: Tauri
```

## 🏗️ 핵심 구조

```
statistical-platform/
├── lib/statistics/
│   ├── method-router.ts (115줄)         - 라우터
│   ├── method-parameter-types.ts        - 50+ 타입
│   └── calculator-handlers/ (16개 파일) - 핸들러
├── lib/services/
│   └── pyodide-statistics.ts (3,434줄)  - 50개 Python 메서드
└── docs/
    ├── phase2-complete.md        - Phase 2 상세
    ├── phase3-complete.md        - Phase 3 상세 (최신)
    └── [기타 기술 문서들]
```

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트
npx tsc --noEmit     # 타입 체크
npm run lint         # 린터
```

## 📊 통계 메서드 (50/50 완료)

- 기본 통계: 10개
- 회귀/상관: 10개
- 비모수: 9개
- 분산분석: 9개
- 고급분석: 12개

**상세 목록**: [docs/phase2-complete.md](statistical-platform/docs/phase2-complete.md#구현된-50개-메서드)

## 🎨 UI 컴포넌트

**4단계 워크플로우**: 방법론 소개 → 데이터 업로드 → 변수 선택 → 결과 해석

**핵심 컴포넌트**:
- `StatisticsPageLayout` - 4단계 마법사
- `DataUploadStep` - 업로드
- `VariableSelector` - 변수 선택
- `PValueBadge` - p-value 표시

## 📚 참조 문서

- [Phase 2 완료 보고서](statistical-platform/docs/phase2-complete.md) - 리팩토링 상세
- [Phase 3 완료 보고서](statistical-platform/docs/phase3-complete.md) - Pyodide 통합 상세
- [통계 메서드 구현 가이드](statistical-platform/docs/STATISTICAL_METHODS_IMPLEMENTATION_STATUS.md)
- [통계 검증 가이드](statistical-platform/docs/STATISTICAL_VERIFICATION_GUIDE.md)

### 외부 링크
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Pyodide: https://pyodide.org

## 🔍 자주 하는 작업

### 새 통계 메서드 추가
1. `method-parameter-types.ts`에 타입 정의
2. 적절한 핸들러 파일에 구현
3. `method-router.ts`에 등록
4. 테스트 작성

### 통계 계산 추가
1. `pyodide-statistics.ts`에 Python 코드 추가
2. SciPy/statsmodels 함수 활용
3. R/SPSS 결과와 검증 (0.0001 오차 이내)

---

## 🔧 최근 업데이트

### 2025-10-02: Phase 4-1 완료 (Pyodide 런타임 테스트)
- ✅ E2E 테스트 3/3 통과
- ✅ 30개 메서드 import 문제 해결
- ✅ 싱글톤 패턴 44배 성능 개선
- 📄 [완료 보고서](statistical-platform/docs/phase4-runtime-test-complete.md)
- 📄 [작업 일지](statistical-platform/docs/daily-log-2025-10-02.md)

---

**Updated**: 2025-10-02 | **Version**: Phase 4-1 Complete

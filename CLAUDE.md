# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재**: Phase 6 완료 (PyodideCore 직접 연결, Facade 제거 완료)

## ⚠️ AI 코딩 엄격 규칙 (CRITICAL)

### 1. TypeScript 타입 안전성 (최우선)

**필수 규칙**:
- ❌ `any` 타입 절대 금지 → `unknown` 사용 후 타입 가드
- ✅ 모든 함수에 명시적 타입 지정 (파라미터 + 리턴)
- ✅ null/undefined 체크 필수 (early return 패턴)
- ✅ 옵셔널 체이닝 (`?.`) 적극 사용
- ❌ Non-null assertion (`!`) 절대 금지

**상세 예제**: [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md)

### 2. Pyodide 통계 계산 규칙 (CRITICAL)

**통계 계산 구현 원칙**:
- ❌ **JavaScript/Python으로 통계 알고리즘 직접 구현 절대 금지**
- ✅ **반드시 검증된 통계 라이브러리 사용** (SciPy, statsmodels, pingouin)
- ✅ 직접 구현 시 사용자 사전 승인 필수

### 3. 통계 페이지 코딩 표준 (CRITICAL)

**45개 통계 페이지 일관성 유지 필수!**

⚠️ **상세 규칙**: [STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md)

**핵심 원칙**:
- ✅ `useStatisticsPage` hook 사용 (useState 금지)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴 사용** (setTimeout 사용 금지)
- ✅ `any` 타입 절대 금지 (unknown + 타입 가드)
- ✅ TypeScript 컴파일 에러 0개

**참고 문서**:
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방

---

### 4. AI 코딩 품질 보증 워크플로우 (CRITICAL)

**핵심 원칙**: 수정 → 검증 → 리뷰 + 테스트 → 커밋 → (사용자 승인) → 푸시

#### 📍 Step 1: 코드 수정
- Write/Edit Tool 사용
- 문법 에러 자동 감지 (VSCode TypeScript 서버)

#### 📍 Step 2: 검증 (필수/선택)

**2-1. TypeScript 체크** (✅ 필수)
```bash
cd statistical-platform
npx tsc --noEmit
```

**2-2. 빌드 체크** (🟡 선택 - 10+ 파일 수정 시)
```bash
npm run build
```

**2-3. 테스트 실행** (🟡 선택 - 로직 변경 시)
```bash
npm test [파일명]
```

#### 📍 Step 3: 코드 리뷰 + 테스트 (필수)

**🔍 AI 자체 코드 리뷰**:
1. 수정 파일 목록 정리 (파일명 + 라인 번호)
2. 주요 변경 사항 요약 (무엇을, 왜, 어떻게)
3. 예상 영향 범위 분석
4. 알려진 이슈 문서화

**📋 리뷰 체크리스트**:
- [ ] 타입 안전성: `any` 타입 사용 없음
- [ ] 에러 처리: try-catch 적절히 사용
- [ ] Null 체크: Optional chaining (`?.`) 사용
- [ ] 일관성: 기존 코드 패턴 준수
- [ ] 부작용: 다른 파일에 영향 없음

**✅ 테스트 검증**:

**통합 테스트** (✅ 필수 - 모든 작업 완료 시)
```bash
npm run dev
# → 브라우저에서 실제 동작 확인
```

**통합 테스트 체크리스트**:
1. **UI 렌더링**
   - [ ] 새 컴포넌트가 화면에 표시되는가?
   - [ ] 레이아웃이 깨지지 않는가?

2. **기능 동작**
   - [ ] 버튼/드롭다운 클릭 시 정상 작동하는가?
   - [ ] 상태 변경이 UI에 반영되는가?
   - [ ] localStorage 저장/로드가 정상인가?

3. **에러 처리**
   - [ ] 잘못된 입력 시 에러 메시지가 표시되는가?
   - [ ] 콘솔에 에러가 없는가?

**테스트 우선순위**:

| 작업 유형 | 단위 테스트 | 통합 테스트 |
|----------|----------|----------|
| 신규 UI 컴포넌트 | 🟡 선택 | ✅ 필수 |
| 신규 서비스 로직 | ✅ 필수 | ✅ 필수 |
| 기존 코드 수정 | 🟡 선택 | ✅ 필수 |
| 버그 수정 | ✅ 필수 | ✅ 필수 |

#### 📍 Step 4: Git 커밋 (검증 통과 후)

```bash
git add -A
git commit -m "커밋 메시지"
```

**커밋 메시지 형식**:
```
feat/fix/refactor: 작업 요약 (1줄)

변경 내역:
- 파일 1 (Line X-Y): 변경 내용

검증 결과:
- TypeScript: 0 errors ✓

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

#### 📍 Step 5: 푸시 (사용자 승인 필요)

**❌ AI가 자동으로 푸시하지 않음**
- 커밋 완료 후 사용자에게 보고
- 사용자가 명시적으로 "푸시해" 요청 시에만 푸시

#### 🎯 워크플로우 요약

| 단계 | 필수/선택 | 명령어 | 시점 |
|------|----------|--------|------|
| Step 1: 코드 수정 | ✅ 필수 | Write/Edit | 항상 |
| Step 2-1: 타입 체크 | ✅ 필수 | `npx tsc --noEmit` | 수정 후 즉시 |
| Step 2-2: 빌드 | 🟡 선택 | `npm run build` | 10+ 파일 수정 |
| Step 3: 리뷰+테스트 | ✅ 필수 | 브라우저 테스트 | 커밋 전 |
| Step 4: 커밋 | ✅ 필수 | `git commit` | 검증 통과 후 |
| Step 5: 푸시 | ⏸️ 대기 | `git push` | **사용자 승인 후** |

### 5. 코드 스타일

- ❌ 식별자에 이모지 절대 금지 (변수명, 함수명, 클래스명)
- ✅ Next.js 15 App Router 사용 (Pages Router 금지)
- ✅ shadcn/ui 컴포넌트 우선 사용

---

## 🏗️ 아키텍처 (Phase 6)

### 구조 개요
```
사용자 → Groups → PyodideCore → Python Workers (SciPy/statsmodels)
         ↓        ↓
    데이터 가공   직접 호출 (callWorkerMethod<T>)
    UI 포맷팅    타입 안전성 향상
```

### 핵심 원칙
- **Groups**: TypeScript로 데이터 검증/가공, UI 포맷팅만
- **PyodideCore**: Python Workers 호출 관리
- **Python Workers**: 실제 통계 계산 (SciPy/statsmodels)
- ❌ Groups에서 통계 직접 계산 금지

### 핵심 디렉토리
```
statistical-platform/
├── lib/statistics/
│   ├── groups/                      - 6개 그룹 (TypeScript)
│   └── registry/                    - 60개 메서드 메타데이터
├── lib/services/
│   └── pyodide-core.ts              - PyodideCore (421 lines)
└── public/workers/python/           - Python Workers (4개)
```

---

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트
npx tsc --noEmit     # 타입 체크
```

---

## 📋 현재 작업 상태

**최신 상태** (2025-10-31):
- ✅ Phase 6 완료: PyodideCore 직접 연결
  - ✅ 10개 handler 완전 변환 (39개 메서드, 100%)
  - ✅ TypeScript 컴파일 에러: **0개** (core groups/handlers)
  - ✅ 코드 품질: **5.0/5** ⭐⭐⭐⭐⭐
- ✅ Phase 1 완료: setTimeout 패턴 제거
  - ✅ 27/27 페이지 (100%) 표준 패턴으로 전환
  - ✅ isAnalyzing Critical 버그 10개 수정
- ✅ Phase 2-2 진행 중: 코드 품질 개선
  - ✅ 34/45 페이지 (76%) 완료
  - ✅ TypeScript 에러: 717 → 409 (-308, -42.9%)

**다음 작업**:
- 🔜 Phase 2-2 완료: 남은 11개 통계 페이지
- 🔜 Phase 7 계획 수립 (Tauri or 추가 메서드)
- 🔜 Phase 8 RAG 시스템 (선택)

**📝 상세 작업 기록**: [dailywork.md](dailywork.md) | [STATUS.md](STATUS.md)

---

## 📚 문서 구조

### 루트 문서 (5개만 유지)
- **[CLAUDE.md](CLAUDE.md)** - AI 코딩 규칙 (이 파일)
- **[README.md](README.md)** - 프로젝트 개요
- **[ROADMAP.md](ROADMAP.md)** - 개발 로드맵
- **[STATUS.md](STATUS.md)** - 프로젝트 현재 상태
- **[dailywork.md](dailywork.md)** - 작업 기록 (최근 7일만)

### statistical-platform/docs/ (구현 상세)
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 예제
- [STATISTICS_PAGE_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md) - 통계 페이지 코딩 표준 ⭐
- [TROUBLESHOOTING_ISANALYZING_BUG.md](statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md) - Critical 버그 예방 🚨

### 문서 관리 규칙
- **dailywork.md**: 최근 7일만 유지 (주말마다 `archive/dailywork/`로 이동)
- **STATUS.md**: Phase 완료 시 또는 주요 마일스톤만 업데이트
- ❌ 분석/검토 문서: 새 파일 생성 금지 → STATUS.md에 요약만 추가

---

**Updated**: 2025-11-01 | **Version**: Phase 6 Complete | **Next**: Phase 2-2 완료, Phase 7/8 계획

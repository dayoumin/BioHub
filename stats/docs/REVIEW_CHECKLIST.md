# BioHub 코드 리뷰 체크리스트

범용 가이드: `d:\Projects\dev-playbook\quality\code-review-checklist.md`
이 문서는 BioHub 프로젝트에 맞춘 **구체적인 검토 대상과 요청 템플릿**이다.

---

## 한눈에 보기

| # | 관점 | BioHub 핵심 대상 |
|---|------|-----------------|
| 1 | 코드 품질 | statistical-executor.ts, Python Worker, echarts-converter.ts |
| 2-A | 사용성 | Smart Flow 3단계, Graph Studio 패널, 변수 선택기 |
| 2-B | 디자인 완성도 | 여백/정렬 일관성, 색상 토큰 준수, 빈 상태, 경쟁 제품 비교 |
| 3 | 데이터 정합성 | p-value, 효과 크기, 신뢰구간 — R/SPSS 비교 필수 |
| 4 | 엣지 케이스 | 빈 데이터, 그룹 1개, 전체 NaN, 한글 컬럼명 |
| 5 | 보안 | Pyodide exec, 사용자 데이터 파일 처리 |
| 6 | 성능 | Pyodide 로드, 대용량 ECharts 렌더링, Worker 타임아웃 |
| 7 | 아키텍처 | CLAUDE.md 5대 규칙, 네이밍 컨벤션, 타입 단일 정의 |
| 8 | 회귀 영향도 | 공유 executor 함수, echarts-converter, Worker I/O |

---

## 1. 코드 품질

### 핵심 파일

| 파일 | 위험도 | 이유 |
|------|--------|------|
| `lib/services/statistical-executor.ts` | 높음 | 43개 메서드 분기, 1000행+, 공유 함수 다수 |
| `public/workers/python/worker2-*.py` | 높음 | camelCase I/O + snake_case 내부 혼용 |
| `lib/graph-studio/echarts-converter.ts` | 중간 | 차트 타입별 분기, facet 로직 복잡 |
| `lib/services/executors/*-executor.ts` | 중간 | 메서드별 실행기, Worker 호출 패턴 |

### 자주 발생하는 버그

- Python Worker에서 camelCase 변수를 f-string에서 snake_case로 참조
- `WorkerMethodParam` 타입 불일치 (number vs string)
- `postHoc` 결과의 `group1`/`group2` vs `comparison` 문자열 파싱 누락
- null/undefined 그룹 필터링 누락 → ANCOVA에서 빈 그룹 에러

### 요청 템플릿

```
statistical-executor.ts의 [메서드명] 분기를 비판적으로 검토해줘.
특히:
- Worker 호출 파라미터의 타입 안전성
- 결과 매핑에서 누락된 필드
- null/undefined 방어
```

---

## 2-A. 사용성

### 핵심 흐름

| 흐름 | 파일 | 확인 포인트 |
|------|------|------------|
| Smart Flow: 데이터 → 변수 → 분석 | `components/smart-flow/steps/` | 단계 전환 피드백, 에러 메시지 명확성 |
| Graph Studio: 차트 생성 → 커스텀 | `components/graph-studio/panels/` | 차트 옵션 직관성, 빈 상태 안내 |
| 변수 선택기 | `components/statistics/common/VariableSelectorModern.tsx` | role 제약 피드백, 드래그 힌트 |

### 자주 발생하는 UX 문제

- 분석 실행 중 로딩 표시 없음 → 사용자가 버튼 재클릭
- 에러 메시지가 Python traceback 그대로 노출
- 변수 role 미지정 시 왜 분석 버튼이 비활성인지 설명 없음
- Graph Studio에서 지원 안 되는 차트 타입 선택 시 빈 화면

### 요청 템플릿

```
Smart Flow에서 [메서드명]을 처음 쓰는 연구자 관점으로 검토해줘.
데이터 업로드부터 결과 확인까지 전체 흐름에서
막히거나 혼란스러운 지점을 찾아줘.
```

---

## 2-B. 디자인 완성도

### 비교 기준

BioHub의 경쟁 상대는 GraphPad Prism, SPSS, JMP이다.
연구자는 "무료니까 조잡해도 된다"고 생각하지 않는다.
**전문 도구처럼 보여야 신뢰하고 쓴다.**

### 확인 포인트

| 항목 | 확인 | 기준 |
|------|------|------|
| 여백 일관성 | | `STEP_STYLES` 토큰 사용, 8px 배수 격자 |
| 색상 토큰 준수 | | semantic token (info/success/warning/error), 하드코딩 hex 없음 |
| 폰트 크기 단계 | | Tailwind `text-sm/base/lg/xl` — 임의 px 혼재 없음 |
| 빈 상태 (empty state) | | 일러스트 또는 CTA 포함 (텍스트만은 부족) |
| 카드/패널 그림자 | | 일관된 `shadow-sm` 또는 `shadow-md` |
| 다크모드 | | 모든 화면에서 깨짐 없음 |
| 버튼 크기 통일 | | 같은 맥락에서 같은 크기 |
| 아이콘 스타일 통일 | | Lucide 단일 라이브러리, 크기 일관 |

### 자주 발생하는 디자인 문제

- Smart Flow 단계별 카드 여백이 미세하게 다름 (padding 혼재)
- Graph Studio 패널과 Smart Flow 패널의 카드 스타일 불일치
- 결과 테이블과 차트 사이 시각적 위계 부족
- 로딩 스켈레톤 없이 갑자기 콘텐츠 출현

### 요청 템플릿

```
Smart Flow 결과 화면의 디자인 완성도를 검토해줘.
여백, 정렬, 색상 일관성, 타이포그래피 위주로.
GraphPad Prism이나 JMP 같은 전문 통계 도구와 비교해서
부족한 점을 지적해줘.
```

---

## 3. 데이터 정합성

### 이 프로젝트에서 가장 위험한 관점

통계 플랫폼에서 계산 결과가 틀리면 연구자가 잘못된 결론을 논문에 쓴다.
코드는 에러 없이 돌아가지만 **답이 틀리는** 경우가 가장 위험하다.

### 검증 방법

```
1. 테스트 데이터 준비 (n=30 정도, 정상 분포)
2. BioHub에서 분석 실행 → 결과 기록
3. 같은 데이터를 R/SPSS/Python에서 실행 → 결과 비교
4. 일치하지 않는 값 조사
```

### 검증 대상 (우선순위)

| 검증 항목 | 비교 기준 | 허용 오차 |
|-----------|-----------|-----------|
| p-value | R `t.test()`, `wilcox.test()` 등 | < 0.001 |
| 효과 크기 (Cohen's d, eta-squared) | R `effectsize` 패키지 | < 0.01 |
| 신뢰구간 | R 기본 출력 | < 0.01 |
| 사후검정 그룹 비교 | R `TukeyHSD()` | < 0.001 |
| 생존분석 KM 추정치 | R `survival::survfit()` | < 0.001 |
| ROC AUC | R `pROC::roc()` | < 0.01 |

### 요청 템플릿

```
이 테스트 데이터로 [메서드명] 분석을 실행했을 때
R에서 같은 분석을 돌린 결과와 비교 검증해줘.
p-value, 효과 크기, 신뢰구간 각각 비교.
```

---

## 4. 엣지 케이스

### BioHub 특화 경계 입력

| 입력 | 예상 동작 | 확인 |
|------|-----------|------|
| 빈 CSV (헤더만) | 에러 메시지 + 분석 차단 | |
| 그룹 변수에 그룹 1개만 | "비교할 그룹이 부족합니다" 안내 | |
| 종속변수가 전부 NaN | NaN 필터 후 "유효 데이터 없음" 안내 | |
| 종속변수가 전부 같은 값 (분산=0) | "분산이 0입니다" 안내 | |
| 한글 컬럼명 (`체장(cm)`, `성별`) | 정상 동작 (깨짐 없음) | |
| 컬럼명에 특수문자 (`weight/g`, `len cm`) | 정상 동작 | |
| 10만 행 데이터 | 분석 완료 (타임아웃 없음) | |
| 결측값 50% 이상 | missingRemoved 정확 표시 | |
| 공변량에 범주형 데이터 (ANCOVA) | 에러 또는 자동 변환 안내 | |

### 요청 템플릿

```
[메서드명] 분석이 깨질 수 있는 입력을 5가지 만들어줘.
각각에 대해 현재 코드가 어떻게 동작하는지,
에러가 나면 사용자에게 어떤 메시지가 보이는지 알려줘.
```

---

## 5. 보안

### BioHub 특성

- 로컬 실행 (Tauri 데스크탑 앱) + 웹 배포 (Cloudflare Pages) 이중 타겟
- 사용자 인증 없음 (현재)
- Pyodide가 브라우저에서 Python exec 실행

### 확인 포인트

| 항목 | 위험 | 확인 |
|------|------|------|
| Pyodide `exec()` 입력 검증 | 사용자 데이터가 Python 코드에 삽입되는 경로 | |
| CSV 파싱 시 수식 인젝션 | `=CMD()` 같은 셀 값 처리 | |
| 파일 업로드 크기/타입 제한 | 무제한 업로드 → 메모리 고갈 | |
| localStorage 민감 데이터 | 분석 결과가 평문 저장되는지 | |
| 외부 API 호출 시 키 노출 | 클라이언트 번들에 API 키 포함 여부 | |

### 요청 템플릿

```
Pyodide Worker에 사용자 데이터가 전달되는 경로를 추적해줘.
데이터가 Python exec()에 직접 삽입되는 부분이 있는지,
있다면 인젝션 가능한지 검토해줘.
```

---

## 6. 성능

### 병목 후보

| 영역 | 병목 | 측정 방법 |
|------|------|-----------|
| Pyodide 초기 로드 | ~3초 (statsmodels 포함 시 더 김) | `performance.now()` |
| Worker2 Python 실행 | 복잡 분석 시 5초+ | Worker 메시지 타임스탬프 |
| ECharts 렌더링 | 1만+ 데이터 포인트 scatter | Chrome DevTools Performance |
| Smart Flow 결과 테이블 | 1000행+ 가상화 없이 DOM 렌더 | React Profiler |
| Graph Studio facet | 20+ 패널 동시 렌더링 | 프레임 드롭 확인 |

### 요청 템플릿

```
echarts-converter.ts의 buildFacetOption을
데이터 1만 행, facet 그룹 20개로 테스트할 때
성능 병목이 될 수 있는 부분을 찾아줘.
```

---

## 7. 아키텍처 일관성

### CLAUDE.md 5대 규칙 체크

| # | 규칙 | 위반 시 증상 |
|---|------|-------------|
| 1 | `variable-requirements.ts`의 role을 `types/statistics.ts`에 반영 | 변수 선택기에서 role 불일치 |
| 2 | 타입은 `types/statistics.ts`에만 정의 | 페이지별 중복 타입 → 드리프트 |
| 3 | 공통 컴포넌트 우선 사용 | 같은 UI를 각 페이지에서 재구현 |
| 4 | 통계 방법 ID는 `statistical-methods.ts`에서만 | 임의 ID → 라우팅/매핑 실패 |
| 5 | Pyodide 검증 라이브러리 사용 | 직접 구현 → 계산 오류 위험 |

### 네이밍 컨벤션 체크

| 위치 | 규칙 | 예시 |
|------|------|------|
| Python Worker 파라미터 | camelCase | `dependentVar`, `groupVar` |
| Python Worker 반환 키 | camelCase | `pValue`, `effectSize` |
| Python 내부 변수 | snake_case | `sorted_data`, `effect_size` |
| TS 변수/함수 | camelCase | `calculateMean`, `resultData` |
| TS 타입/인터페이스 | PascalCase | `AnalysisResult`, `ChartSpec` |
| 파일명 (일반) | kebab-case | `statistical-executor.ts` |
| 파일명 (컴포넌트) | PascalCase | `DataTab.tsx` |

### 요청 템플릿

```
이 파일을 CLAUDE.md의 5대 규칙과 네이밍 컨벤션 기준으로 검토해줘.
위반하는 부분을 목록으로 정리해줘.
```

---

## 8. 회귀 영향도

### 고위험 공유 함수

| 함수 | 파일 | 호출처 수 | 수정 시 주의 |
|------|------|-----------|-------------|
| `normalizePostHocComparisons` | statistical-executor.ts | 10+ 메서드 | group1/group2, comparison 파싱 |
| `chartSpecToECharts` | echarts-converter.ts | Graph Studio 전체 | 모든 차트 타입에 영향 |
| `buildFacetOption` | echarts-converter.ts | facet 있는 모든 차트 | scatter/bar/box 분기 |
| `callWorkerMethod` | pyodide-stats.ts | 모든 Worker2 호출 | 파라미터 직렬화 |
| `ancovaAnalysisWorker` | pyodide-stats.ts | ANCOVA 전용 | 결과 매핑 구조 |

### 요청 템플릿

```
[함수명]을 수정했는데,
이 함수를 호출하는 모든 곳을 grep으로 찾아서
각 호출처에서 이 수정이 문제를 일으키는지 분석해줘.
```

---

## AI 환각 주의사항

이 프로젝트에서 AI가 자주 만들어내는 존재하지 않는 것들:

| 환각 유형 | 예시 | 확인 방법 |
|-----------|------|-----------|
| 없는 Python 패키지 | `from lifelines import KaplanMeier` (실제: `KaplanMeierFitter`) | Pyodide 번들에 해당 패키지 있는지 확인 |
| 없는 SciPy 함수 | `scipy.stats.ancova()` (존재하지 않음) | `scipy.stats` 실제 API 확인 |
| 없는 타입 필드 | `AnalysisResult.significant` (PostHocResult에만 있음) | `types/statistics.ts` 확인 |
| 없는 Worker 메서드 | `pyodideStats.survivalAnalysis()` (실제: Worker2 직접 호출) | `pyodide-stats.ts` export 확인 |
| 잘못된 import 경로 | `@/lib/statistics/executor` (실제: `@/lib/services/statistical-executor`) | 실제 파일 경로 확인 |

### 요청 템플릿

```
이 코드에서 import하는 모든 모듈과 호출하는 함수가
실제로 존재하는지 확인해줘.
특히 Python 패키지와 Worker 메서드.
```

---

## 변경 유형별 빠른 참조

```
Worker2 Python 수정   →  3(데이터정합성) + 7(네이밍) + 8(회귀)
Smart Flow UI 변경    →  2(UX) + 7(아키텍처) + 4(엣지케이스)
새 통계 메서드 추가   →  3(데이터정합성) + 7(아키텍처) + 1(코드품질)
echarts-converter 수정 →  1(코드품질) + 8(회귀) + 6(성능)
executor 함수 수정    →  8(회귀) + 3(데이터정합성) + 4(엣지케이스)
Pyodide 관련 변경    →  5(보안) + 6(성능) + 8(회귀)
```

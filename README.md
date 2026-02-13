# 📊 NIFS 통계 분석 플랫폼
> Statistical Analysis Platform for National Institute of Fisheries Science

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Python](https://img.shields.io/badge/Pyodide-0.29.3-green)

---

## 🎯 프로젝트 개요

SPSS/R Studio급 고급 통계 분석 플랫폼으로, **완전 오프라인 환경**에서 작동합니다.
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **현재 진행도**: Phase 13 완료
- **Smart Flow**: 43개 통계 메서드 통합 (유일한 통계 진입점)
- **Bio-Tools**: 12개 생물학 분석 (예정)
- **데이터 도구**: 2개

---

## ✨ 주요 특징

### 🔬 **전문가급 통계 분석**
- ✅ **43개 통계 메서드**: t-검정, ANOVA, 회귀분석, 비모수 검정, 다변량 분석 등
- ✅ **Smart Flow**: 데이터 업로드 → AI 분석 추천 → 변수 자동 할당 → 결과 + AI 해석
- ✅ **검증된 라이브러리**: SciPy, statsmodels, pingouin, scikit-learn
- ✅ **R/SPSS 호환**: 동일한 결과 보장 (소수점 10자리 일치)

### 🧬 **Bio-Tools (예정)**
- 🔜 **12개 생물학 분석**: 다양성 지수, PERMANOVA, NMDS, von Bertalanffy, 메타분석 등
- 🔜 **수산과학 특화**: 성장 모델, 체장-체중 관계식
- 🔜 **집단유전학**: Hardy-Weinberg 검정, Mantel 검정

### 🤖 **AI 기반 분석**
- ✅ **LLM 추천**: 자연어 입력 → AI 분석 방법 추천 + 변수 자동 할당
- ✅ **LLM 해석**: 분석 결과 AI 스트리밍 해석 (한줄 요약 + 상세)
- ✅ **RAG 챗봇**: Ollama + ChromaDB로 실시간 통계 자문
- ✅ **자동 변수 타입 감지**: 연속형, 범주형, 이진형 자동 분류
- ✅ **자동 가정 검정**: 정규성, 등분산성 자동 검증

### 🌐 **완전 오프라인 지원**
- ✅ **클라우드 배포**: Vercel 자동 배포 (CDN 사용)
- ✅ **폐쇄망 배포**: Pyodide 200MB 로컬 번들링 (인터넷 불필요)
- ✅ **데이터 보안**: 모든 분석이 브라우저/로컬에서 실행

### 🎨 **현대적 UX/UI**
- ✅ **shadcn/ui**: Radix UI 기반 접근성 우수
- ✅ **반응형 디자인**: 모바일/태블릿/데스크탑 모두 지원
- ✅ **다크 모드**: 시스템 설정 자동 감지

---

## 📚 사용자 가이드

### 🚀 **빠른 시작**

#### **1. 웹 버전 (클라우드)**
```bash
# 배포된 사이트 접속
https://your-vercel-app.vercel.app

# 또는 로컬 실행
cd statistical-platform
npm install
npm run dev
# → http://localhost:3000
```

#### **2. 오프라인 버전 (폐쇄망)**
```bash
# Pyodide 로컬 다운로드 (최초 1회)
npm run setup:pyodide

# 환경변수 설정
echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local

# 오프라인 빌드
npm run build:offline

# 빌드 폴더 (.next/) 전체를 폐쇄망 서버로 복사
```

**상세**: [DEPLOYMENT_SCENARIOS.md](statistical-platform/docs/DEPLOYMENT_SCENARIOS.md)

---

### 📖 **사용 방법**

#### **Step 1: 데이터 업로드**
- CSV, Excel (.xlsx), SPSS (.sav), TSV, HWP 파일 지원
- 드래그 앤 드롭 또는 파일 선택
- **첫 번째 행은 변수명** (필수)
- **인코딩**: UTF-8 권장 (한글 사용 시)

**데이터 형식 가이드**: [DATA_FORMAT_GUIDE.md](statistical-platform/docs/guides/DATA_FORMAT_GUIDE.md)

---

#### **Step 2: 변수 선택**
- **자동 타입 감지**: 연속형, 범주형, 이진형 자동 분류
- **드래그 앤 드롭**: 변수를 역할별 영역에 할당
- **모달 선택**: 클릭하여 변수 선택 (드래그 대체)

**변수 선택 가이드**: [VARIABLE_SELECTION_GUIDE.md](statistical-platform/docs/guides/VARIABLE_SELECTION_GUIDE.md)

---

#### **Step 3: 분석 실행**
- "분석 시작" 버튼 클릭
- **자동 가정 검정**: 정규성, 등분산성 자동 검증
- **대안 제시**: 가정 위반 시 비모수 검정 자동 추천

---

#### **Step 4: 결과 확인**
- 통계량, p-value, 효과크기, 그래프 표시
- CSV, PNG, PDF 내보내기 지원
- AI 챗봇으로 결과 해석 질문

---

### 🤖 **AI 챗봇 사용**

#### **접근 방법 3가지**:
1. **Header 버튼** (💬): 우측 패널로 열림 (리사이징 가능)
2. **플로팅 버튼**: 우측 하단 고정 버튼
3. **전체 화면**: `/chatbot` 페이지 (Grok 스타일)

#### **기능**:
- ✅ **실시간 통계 자문**: RAG 시스템 (SciPy, statsmodels 문서)
- ✅ **인라인 인용**: Perplexity 스타일 출처 표시
- ✅ **스트리밍 응답**: 타이핑 커서 + 실시간 출력

---

### ❓ **도움말 접근**

#### **Header "❓" 아이콘 클릭**
- **사용 가이드**: 플랫폼 기본 사용법
- **FAQ**: 자주 묻는 질문
- **단축키**: 키보드 단축키 목록
- **변수 선택**: 변수 역할 및 타입 설명 ⭐ (신규)
- **데이터 형식**: CSV 작성 규칙, Wide vs Long ⭐ (신규)

---

## 🔧 개발자 가이드

### 📁 **프로젝트 구조**
```
Statics/
├── README.md                 # 프로젝트 소개 (이 파일)
├── CLAUDE.md                 # AI 코딩 규칙
├── ROADMAP.md                # 개발 로드맵
├── TODO.md                   # 현황 + 할일 + 최근 작업 (7일)
│
└── statistical-platform/     # Next.js 15 앱
    ├── app/                  # App Router
    │   ├── page.tsx          # Smart Flow 홈 (= 통계 분석 진입점)
    │   ├── (dashboard)/      # 대시보드 레이아웃
    │   │   ├── dashboard/    # 메인 대시보드
    │   │   ├── statistics/   # 43개 통계 페이지 (레거시)
    │   │   ├── bio-tools/    # Bio-Tools (예정, 5페이지)
    │   │   └── data-tools/   # 2개 데이터 도구
    │   ├── chatbot/          # AI 챗봇 전체 화면
    │   └── design-system/    # 디자인 시스템 쇼케이스
    │
    ├── components/           # React 컴포넌트
    │   ├── common/           # 공통 컴포넌트
    │   ├── statistics/       # 통계 결과 컴포넌트
    │   ├── variable-selection/ # 변수 선택 UI
    │   └── chatbot/          # AI 챗봇 UI
    │
    ├── lib/
    │   ├── statistics/       # 통계 로직
    │   │   ├── groups/       # 6개 통계 그룹 (TypeScript)
    │   │   └── variable-requirements.ts # 43개 메서드 정의
    │   └── services/
    │       ├── pyodide-core.ts # PyodideCore (421줄)
    │       └── rag-service.ts  # RAG 시스템
    │
    ├── public/workers/python/ # Python Workers (4개)
    │   ├── descriptive_worker.py # 기술통계
    │   ├── comparative_worker.py # 평균 비교
    │   ├── relational_worker.py  # 회귀/상관
    │   └── advanced_worker.py    # 고급 분석
    │
    └── docs/                 # 문서
        ├── guides/           # 사용자 가이드
        │   ├── VARIABLE_SELECTION_GUIDE.md ⭐ (신규)
        │   ├── DATA_FORMAT_GUIDE.md ⭐ (신규)
        │   └── RESEARCH_USER_GUIDE.md
        ├── STATISTICS_CODING_STANDARDS.md # 코딩 표준
        ├── AUTOMATED_TESTING_ROADMAP.md   # 테스트 계획
        └── DEPLOYMENT_SCENARIOS.md        # 배포 가이드
```

---

### 🛠️ **개발 명령어**

```bash
# 개발 서버
npm run dev              # http://localhost:3000

# 빌드
npm run build            # Vercel 클라우드용
npm run build:offline    # 로컬 오프라인용

# 테스트
npm test                 # Jest 테스트
npm test:watch           # Watch 모드
npm test:coverage        # 커버리지

# 타입 체크
npx tsc --noEmit         # TypeScript 컴파일 에러 확인

# Pyodide 설정 (오프라인용)
npm run setup:pyodide    # Pyodide 200MB 다운로드

# AI 챗봇 설정 (선택)
ollama pull mxbai-embed-large  # Ollama 임베딩 모델
```

---

### 📐 **아키텍처**

```
[Smart Flow]      → PyodideCore → Python Workers 1-4 (SciPy/statsmodels)
[Bio-Tools (예정)] → PyodideCore → Python Workers 5-6 (scipy/numpy/sklearn)
```

**사용자 동선**:
- **Smart Flow** (홈 `/`): 데이터 업로드 → AI 추천 → 변수 할당 → 분석 → 결과 + AI 해석
- **Bio-Tools** (`/bio-tools/*`): 생물학 특화 분석 (5페이지)
- **개별 통계 페이지** (`/statistics/*`): 레거시 (직접 접근 가능하나 권장 안 함)

**핵심 원칙**:
- **Smart Flow**: 43개 통계 메서드의 유일한 진입점
- **PyodideCore**: Python Workers 호출 관리
- **Python Workers**: 실제 통계 계산 (SciPy/statsmodels)
- ❌ JavaScript/Python 직접 통계 구현 금지 → 검증된 라이브러리 사용

---

### 🧪 **테스트 전략**

#### **현재 테스트**:
- Vitest + React Testing Library (214 파일)
- Golden Values 테스트 (44/44 통과)
- E2E 테스트 (Playwright, 12개 핵심 플로우)
- 3층 아키텍처: L1 Store, L2 data-testid, L3 E2E

**상세**: [AUTOMATED_TESTING_ROADMAP.md](statistical-platform/docs/AUTOMATED_TESTING_ROADMAP.md)

---

### 📝 **코딩 규칙**

**필수 규칙**:
- ✅ **Smart Flow = 통계 진입점** (개별 `/statistics/*` 페이지는 레거시)
- ✅ TypeScript 엄격 모드 (`any` 금지)
- ✅ `useStatisticsPage` hook 사용 (useState 금지)
- ✅ `useCallback` 모든 이벤트 핸들러에 적용
- ✅ **await 패턴** 사용 (setTimeout 금지)
- ✅ 변수 role 매핑: variable-requirements.ts와 일치
- ✅ 타입 중앙 정의: types/statistics.ts 단일 정의
- ✅ 공통 컴포넌트 사용: StatisticsTable, EffectSizeCard 등

**상세**: [CLAUDE.md](CLAUDE.md) | [STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md)

---

## 🗺️ 로드맵

### ✅ **완료된 Phase**

- **Phase 1-6**: 기반 구축 + PyodideCore 직접 연결 (43개 통계 메서드)
- **Phase 8**: RAG 시스템 (Ollama + ChromaDB)
- **Phase 9**: 계산 방법 표준화 + setTimeout 제거 + 테스트 강화
- **Phase 12**: 수산과학 도메인 전환 + Terminology System
- **Phase 13**: LLM 분석 추천 + 결과 해석
- **Phase 5-2**: Pyodide 리팩토링 완료 (Generated 래퍼 전환 + any 타입 제거)

### 🔜 **다음 작업**

- **Phase 15-1**: Bio-Tools (12개 생물학 분석, 5페이지)

**상세**: [ROADMAP.md](ROADMAP.md) | [TODO.md](TODO.md)

---

## 📊 지원 통계 메서드

### **Smart Flow (43개 메서드 통합)**

Smart Flow가 모든 통계 분석의 유일한 진입점입니다. 데이터 업로드 → AI 추천 → 분석 실행.

| 카테고리 | 메서드 수 | 주요 분석 |
|---------|---------|----------|
| 기술통계 | 5 | 기술통계량, 빈도분석, 교차표, 신뢰도 분석 |
| 평균 비교 | 6 | t-검정 (일표본/독립/대응/Welch), 비율 검정 |
| 일반선형모델 | 8 | ANOVA (일원/이원/삼원), ANCOVA, MANOVA, 혼합모형 |
| 상관분석 | 4 | Pearson, Spearman, Kendall, 편상관 |
| 회귀분석 | 6 | 단순/다중/단계적/로지스틱/순서형/Poisson |
| 비모수 검정 | 11 | Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman 등 |
| 카이제곱 | 3 | 독립성, 적합도, Fisher 정확검정 |

### **Bio-Tools (12개 분석, 예정)**

| 카테고리 | 분석 | 구현 상태 |
|---------|------|----------|
| 생태/다양성 | Shannon, Simpson, Rarefaction, NMDS, PERMANOVA, Mantel | 🔜 예정 |
| 수산과학 | von Bertalanffy 성장 모델, 체장-체중 관계식 | 🔜 예정 |
| 범용 생물학 | 메타분석, ROC/AUC, ICC, Hardy-Weinberg | 🔜 예정 |

**상세 계획**: [PLAN-BIO-STATISTICS-AUDIT.md](study/PLAN-BIO-STATISTICS-AUDIT.md)

---

## 🔬 통계적 신뢰성

### **검증된 라이브러리**
- ✅ **SciPy**: R/SPSS와 소수점 15자리까지 일치
- ✅ **statsmodels**: 학술 연구 표준 라이브러리
- ✅ **pingouin**: 사후 검정 특화 (Tukey, Dunn's)
- ✅ **scikit-learn**: 다변량 분석 (PCA, 군집분석)

### **객관적 검증**
- 📚 **논문 인용**: 연간 60,000+ 논문에서 SciPy 사용
- 🏛️ **규제 승인**: FDA, EMA 승인 라이브러리
- 🧪 **자동 테스트**: 모든 통계 메서드 검증 완료

---

## 🤝 기여하기

### **개발 환경 설정**
```bash
# 저장소 클론
git clone https://github.com/your-org/nifs-statistics-platform.git
cd Statics/statistical-platform

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```

### **기여 규칙**
1. `CLAUDE.md` 코딩 규칙 준수
2. TypeScript 컴파일 에러 0개 유지
3. Jest 테스트 작성 (커버리지 70% 이상)
4. Pull Request 제출 (main 브랜치)

---

## 📞 문의 및 지원

- **사용자 가이드**: [docs/guides/](statistical-platform/docs/guides/)
- **AI 챗봇**: 플랫폼 내 💬 아이콘 클릭
- **버그 신고**: GitHub Issues
- **이메일**: nifs-support@example.com

---

## 📄 라이선스

MIT License - 국립수산과학원 (National Institute of Fisheries Science)

---

## 🙏 감사의 글

- **Pyodide 팀**: 브라우저에서 Python 실행
- **SciPy/statsmodels 커뮤니티**: 통계 라이브러리
- **Vercel**: Next.js 호스팅
- **shadcn/ui**: 현대적 UI 컴포넌트

---

**마지막 업데이트**: 2026-02-13
**버전**: Phase 13 완료
**Next.js**: 15.1 | **TypeScript**: 5.7 | **Pyodide**: 0.29.3

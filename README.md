# NIFS 통계 분석 플랫폼
> Statistical Analysis Platform for National Institute of Fisheries Science

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)

![Next.js](https://img.shields.io/badge/Next.js-15.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Python](https://img.shields.io/badge/Pyodide-0.29.3-green)

---

## 프로젝트 개요

SPSS/R Studio급 고급 통계 분석 플랫폼으로, **완전 오프라인 환경**에서도 작동합니다.
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri
- **Smart Flow**: 43개 통계 메서드 통합 (유일한 통계 진입점)
- **Bio-Tools**: 12개 생물학 분석 (예정)
- **배포**: Cloudflare Pages

---

## 빠른 시작

```bash
cd stats
pnpm install
pnpm dev
# → http://localhost:3000
```

### 개발 명령어

```bash
pnpm dev             # 개발 서버
pnpm build           # 프로덕션 빌드 (Cloudflare Pages)
pnpm test            # Vitest 테스트
pnpm test:watch      # Watch 모드
pnpm test:coverage   # 커버리지
pnpm tsc --noEmit    # TypeScript 타입 체크
pnpm setup:pyodide   # Pyodide 200MB 다운로드 (오프라인용)
```

### Cloudflare 배포

```bash
# 빌드 커맨드 (Cloudflare 대시보드 설정)
cd stats && npm i -g pnpm && pnpm install && pnpm build

# 빌드 출력: stats/out/
# 설정: wrangler.toml 참조
```

---

## 프로젝트 구조

```
Statics/
├── CLAUDE.md                 # AI 코딩 규칙
├── README.md                 # 이 파일
├── ROADMAP.md                # 개발 로드맵
├── TODO.md                   # 현황 + 할일
├── wrangler.toml             # Cloudflare Pages 배포 설정
│
├── stats/                    # Next.js 15 앱
│   ├── app/
│   │   ├── page.tsx          # Smart Flow 홈 (통계 진입점)
│   │   ├── (dashboard)/
│   │   │   ├── statistics/   # 43개 통계 페이지 (레거시)
│   │   │   ├── bio-tools/    # Bio-Tools (예정)
│   │   │   └── data-tools/   # 데이터 도구 2개
│   │   └── chatbot/          # AI 챗봇
│   ├── components/           # React 컴포넌트
│   ├── lib/
│   │   ├── services/pyodide-core.ts  # PyodideCore
│   │   └── statistics/               # 통계 로직
│   ├── public/workers/python/        # Python Workers (4개)
│   └── docs/                         # 개발 문서
│
└── study/                    # 계획서/참고 문서
```

---

## 아키텍처

```
[Smart Flow]       → PyodideCore → Python Workers 1-4 (SciPy/statsmodels)
[Bio-Tools (예정)] → PyodideCore → Python Workers 5-6 (scipy/numpy/sklearn)
```

- **Smart Flow** (홈 `/`): 데이터 업로드 → AI 추천 → 변수 할당 → 분석 → 결과 + AI 해석
- **개별 통계 페이지** (`/statistics/*`): 레거시 (코드 유지, 신규 개발 안 함)
- **Bio-Tools** (`/bio-tools/*`): 생물학 특화 분석 (예정)

---

## 지원 통계 메서드 (43개)

| 카테고리 | 메서드 수 | 주요 분석 |
|---------|---------|----------|
| 기술통계 | 5 | 기술통계량, 빈도분석, 교차표, 신뢰도 분석 |
| 평균 비교 | 6 | t-검정 (일표본/독립/대응/Welch), 비율 검정 |
| 일반선형모델 | 8 | ANOVA (일원/이원/삼원), ANCOVA, MANOVA, 혼합모형 |
| 상관분석 | 4 | Pearson, Spearman, Kendall, 편상관 |
| 회귀분석 | 6 | 단순/다중/단계적/로지스틱/순서형/Poisson |
| 비모수 검정 | 11 | Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman 등 |
| 카이제곱 | 3 | 독립성, 적합도, Fisher 정확검정 |

---

## 테스트

- **Vitest** + React Testing Library (~233 파일)
- **Golden Values** 테스트 (44/44 통과)
- **E2E** (Playwright, 12개 핵심 플로우)
- **3층 아키텍처**: L1 Store > L2 data-testid > L3 E2E

---

## 문서

- [CLAUDE.md](CLAUDE.md) — AI 코딩 규칙
- [ROADMAP.md](ROADMAP.md) — 개발 로드맵
- [TODO.md](TODO.md) — 현황 + 할일
- [STATISTICS_CODING_STANDARDS.md](stats/docs/STATISTICS_CODING_STANDARDS.md) — 통계 코딩 표준
- [DEPLOYMENT_SCENARIOS.md](stats/docs/DEPLOYMENT_SCENARIOS.md) — 배포 가이드

---

## 라이선스

MIT License - 국립수산과학원 (National Institute of Fisheries Science)

---

**마지막 업데이트**: 2026-02-20
**배포**: Cloudflare Pages | **Next.js**: 15.1 | **TypeScript**: 5.7 | **Pyodide**: 0.29.3

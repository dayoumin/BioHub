# Graph Studio 차트 라이브러리 평가

> **최종 업데이트**: 2026-03-20 (팩트체크 완료, 사용자 리뷰 반영)
> **목적**: Graph Studio의 논문용 그래프 렌더링/export 라이브러리 선정

## 결론 (TL;DR)

**편집은 ECharts, 제출은 matplotlib. 나머지는 필요할 때.**

| 역할 | 선택 | 상태 |
|------|------|------|
| 인터랙티브 편집 | **ECharts 6.0** | 유지 (이미 구축) |
| 논문 Export (PDF/TIFF/EPS) | **matplotlib** (Pyodide 내장) | 추가 구현 필요 |
| 저널 스타일 | **SciencePlots** rcParams | matplotlib 위 스타일시트 (LaTeX 없이 가능, 아래 참조) |
| 보류 (lazy-load 후보) | Plotly.js | 3D surface 등 명확한 수요 생기면 재검토 |
| 대시보드 보조 | shadcn/ui Charts (Recharts) | 현재 용도 유지 |
| 탈락 | Nivo | 과학 통계 annotation/export 부족 |
| 추가 검토 1순위 | seaborn.objects 또는 plotnine | matplotlib 파이프라인 구축 후 |

### SciencePlots + Pyodide: LaTeX 없이 동작하는가?

**동작한다.** 두 가지 방법:

**방법 A — `no-latex` 스타일 (권장, 간단)**
```python
# micropip.install('SciencePlots') 후
plt.style.use(['science', 'no-latex'])          # Nature 스타일
plt.style.use(['science', 'ieee', 'no-latex'])  # IEEE 스타일
```
- SciencePlots 공식 제공 스타일. LaTeX 없이 동작하도록 설계됨.
- 수식 렌더링만 빠지고, 폰트/선 두께/여백/색상 등 저널 스타일은 그대로 적용.
- 논문 그래프에서 축 라벨에 수식이 필요한 경우는 드물어 대부분 이걸로 충분.

**방법 B — rcParams 직접 적용 (SciencePlots 설치 불필요)**
```python
plt.rcParams.update({
    'font.family': 'serif',
    'font.serif': ['Times New Roman'],
    'font.size': 8,
    'axes.linewidth': 0.5,
    'xtick.major.width': 0.5,
    'lines.linewidth': 1.0,
    'figure.dpi': 300,
    # SciencePlots nature/ieee 프리셋에서 추출한 값들
})
```
- 외부 의존성 0. 저널별 커스텀 프리셋 자유 구성.
- Graph Studio의 기존 chart-spec-defaults.ts 프리셋(science, ieee)과 1:1 매핑 가능.

**결론: Pyodide에서 LaTeX 없어도 논문 품질 그래프 출력에 문제 없음.**

---

## 1. 현재 아키텍처 (ECharts 6.0.0)

- **echarts@6.0.0** + echarts-for-react@3.0.6 (2025-07-30 릴리스)
- ChartSpec (JSON) → `chartSpecToECharts()` (~805줄) → ReactECharts
- 지원 차트: bar, grouped-bar, stacked-bar, line, scatter, boxplot, histogram, error-bar, heatmap, violin(폴백), km-curve, roc-curve

### 이미 구현된 학술 기능

- 저널 색상 프리셋 (NPG, AAAS, NEJM, Lancet, JAMA, Okabe-Ito)
- DPI 제어 (72~600) + pHYs 메타데이터 주입
- 물리 크기(mm) + 저널 프리셋 (Nature 86/178mm, Cell 88mm, PNAS 87mm 등)
- science/ieee 스타일 프리셋 (Times New Roman)
- significance brackets (p-value), error bars (CI/SE/SD/IQR), trendline
- faceting (bar, scatter), secondary Y-axis

### ECharts의 한계

- **PDF/TIFF/EPS export 불가** — 저널 필수 포맷 미지원
- **SVG export 버그** — Issue #19278 (getConnectedDataURL), #20261 (Base64 이미지)
- **PubMed Central은 SVG 미수용** — TIFF/EPS 필수
- 통계 annotation 제한적 (significance brackets는 커스텀 graphic overlay)

---

## 2. 후보 라이브러리 비교 (2026-03-20 기준)

### 2.1 기본 정보

| | **ECharts 6.0.0** | **Plotly.js 3.4.0** | **Recharts 3.8.0** (shadcn/ui 기반) | **Nivo 0.99.0** |
|---|---|---|---|---|
| **릴리스** | 2025-07-30 | 2025~ | 2026-03 | 2025-05-23 |
| **렌더러** | Canvas/SVG/WebGL | SVG + WebGL | SVG only | SVG/Canvas/HTML |
| **번들 (min)** | ~1.08MB (gz ~353KB), 트리셰이킹 가능 | ~2MB+ (gz ~700-800KB), partial bundle ~1MB | ~50-60KB gz | ~40-60KB gz/차트 (모듈형) |
| **React 래퍼** | echarts-for-react | react-plotly.js (관리 미흡) | **네이티브** (shadcn 복붙) | **네이티브** |
| **SSR** | 클라이언트 only | 클라이언트 only | 클라이언트 only | 클라이언트 only (HTTP 렌더링 API 별도 존재) |

> **shadcn/ui Charts 참고**: 독립 차트 엔진이 아니라 Recharts 기반 복붙(composition) 컴포넌트. 실질 제약은 Recharts의 한계와 동일.

> **Plotly.js 번들 참고**: 기본 full bundle은 minified 2MB+로 무겁지만, partial bundle(plotly.js-cartesian-dist ~1MB) 및 custom bundle 경로가 존재. 단, 트리셰이킹은 구조적으로 비효율적(Issue #5723, 2026년에도 미해결)이라 최적화에 운영 복잡도가 수반됨.

### 2.2 대용량 데이터 성능

| 규모 | ECharts | Plotly.js | Recharts | Nivo |
|------|:-------:|:---------:|:--------:|:----:|
| <1K | 우수 | 우수 | 우수 | 우수 |
| 1K-10K | 우수 | 우수 | 보통 (SVG DOM) | 보통 |
| 10K-100K | **우수** (Canvas) | 좋음 (WebGL) | **불가** | **불가** |
| 100K+ | **최강** (10M점 <1초*) | 가능 (WebGL) | 불가 | 불가 |

> *ECharts 10M점 성능은 scatter/line + appendData + TypedArray + Canvas 렌더러 기준. 모든 차트 타입에 해당하지는 않음.

### 2.3 과학/논문용 차트 타입

| 차트 | ECharts 6.0 | Plotly.js | Recharts (shadcn) | Nivo |
|------|:-----------:|:---------:|:-----------------:|:----:|
| Boxplot | O (내장) | O (내장) | **X** (Issue #2302) | **O** (@nivo/boxplot) |
| Violin | **O** (echarts-custom-series 별도 패키지*) | O (내장) | **X** | **X** |
| Error bars | O (custom series) | O (error_x/y) | 부분 (`<ErrorBar>`) | **X** |
| Heatmap | O (내장) | O (내장) | **X** | O (내장) |
| Significance brackets | 커스텀 (graphic overlay) | 커스텀 (add_annotation) | **X** | **X** |
| KM curve | 커스텀 (step line) | 커스텀 (line_shape='hv') | **X** | **X** |
| 3D surface | O (ECharts GL) | **최강** (WebGL 내장) | **X** | **X** |
| Scatter + trendline | O (내장) | O (내장) | **X** | **X** |

> *ECharts 6.0 violin: 코어 내장이 아닌 `echarts-custom-series` 별도 npm 패키지로 공식 제공. 6.0 릴리스 노트에 "6 practical custom charts including violin chart" 명시. 기존 KDE 버그(echarts-x/custom-violin) 관련 이력 있으므로 품질 검증 필요.

### 2.4 Export 기능 (저널 투고)

#### JS 브라우저 측 Export

| 포맷 | ECharts | Plotly.js (toImage) | Recharts | Nivo |
|------|:-------:|:-------------------:|:--------:|:----:|
| PNG (고DPI) | O (pixelRatio) | O (scale 파라미터) | **X** (html2canvas 필요) | **X** (DOM 수동 추출) |
| SVG | O (버그 있음) | **O** (깔끔) | DOM 수동 추출 | DOM 수동 추출 |
| PDF | **X** | 제한적 | **X** | **X** |
| TIFF/EPS | **X** | **X** | **X** | **X** |
| 물리 크기(mm) | **O** (저널 프리셋 내장) | 수동 계산 (width/height/scale) | **X** | **X** |

#### Plotly Python (Kaleido v1.2.0) — 서버/데스크탑 환경

| 포맷 | 지원 | 비고 |
|------|:----:|------|
| PNG/JPEG/WebP | O | Kaleido v1 (시스템 Chrome 필요) |
| SVG | O | 벡터 |
| PDF | O | 벡터 |
| EPS | **X** | Kaleido <1.0에서만 지원 (poppler 필요), v1에서 제거 |
| TIFF | **X** | 공식 미지원 |

> **중요**: Plotly.js 브라우저 export와 Plotly Python Kaleido export는 능력이 다름. Kaleido는 WASM/Pyodide 환경에서 실행 불가 (Chrome subprocess 필요). BioHub Pyodide 환경에서는 Plotly.js `toImage()` (PNG/SVG/JPEG)만 사용 가능.

#### 저널 요구 포맷 참고 (2025-2026)

| 출판사 | 선호 래스터 | 선호 벡터 | 최소 DPI |
|--------|-----------|----------|---------|
| Nature | TIFF, PNG | EPS, PDF | 300 (사진), 600-1200 (선화) |
| Elsevier | TIFF, JPEG | EPS, PDF | 300-1200 |
| PLOS ONE | TIFF, PNG | EPS | 300-600 |
| PubMed Central | TIFF, PNG, JPEG | EPS, PDF | 300+ (**SVG 미수용**) |

---

## 3. Python 시각화 (Pyodide 경유)

### 3.1 matplotlib (Pyodide 내장)

- **Pyodide 내장 버전**: 3.8.4 (추가 비용 0)
- **백엔드**: Agg (headless PNG/SVG 생성) — BytesIO → base64 → 브라우저 다운로드
- **Export**: **PDF, SVG, EPS, TIFF, PNG** 모두 네이티브 지원 (모든 저널 대응)
- **SciencePlots** (v2.2.1, GitHub 8.7k stars): `plt.style.use(['science', 'nature'])` 한 줄로 저널 스타일
  - 순수 Python → micropip 설치 가능
  - LaTeX 의존 (Pyodide에서 불가) → `no-latex` 스타일 또는 rcParams 직접 적용으로 해결
- **petroff10**: matplotlib 3.10에서 추가된 colorblind-safe 색상 스타일시트 (opt-in, 기본값 아님). Pyodide의 matplotlib 3.8.4에서는 미포함 → rcParams로 색상값만 직접 적용 가능.

### 3.2 plotnine (ggplot2 Python 클론)

- **버전**: 0.15.3 (2026-01-28), 순수 Python wheel (py3-none-any)
- **추가 번들**: ~1MB (plotnine + mizani)
- **Pyodide 호환 문제**: statsmodels **>= 0.14.6** 요구, Pyodide는 **0.14.4** → **현재 호환 불가**
- **대안**: matplotlib 직접 사용 (이미 내장), 또는 Pyodide statsmodels 업데이트 대기
- Shinylive에서 동작 확인된 사례 있음 (Pyodide 버전 의존)

### 3.3 Plotly Python

- **버전**: 6.6.0 (2026-03-02), 순수 Python wheel
- micropip 설치 가능, `fig.to_json()` → plotly.js 렌더링
- **Kaleido 불가** (Pyodide에서 Chrome subprocess 실행 불가)
- 브라우저 export는 plotly.js `toImage()` 경유 (PNG/SVG/JPEG만)

### 3.4 기타

| 라이브러리 | 버전 | Pyodide | 비고 |
|-----------|------|:-------:|------|
| seaborn | 0.13.2 | micropip 가능 | 개발 둔화, objects API 여전히 실험적 |
| SciencePlots | 2.2.1 | micropip 가능 | LaTeX 필요 (no-latex 대안) |
| UltraPlot | 2.1.3 | 미확인 | ProPlot 후계, 멀티패널 특화 |
| lets-plot | 4.12.x | **불가** (네이티브 의존) | JetBrains, ggplot2 포트, JS 독립 렌더러 있음 |

---

## 4. 탈락 후보 상세 근거

### 4.1 shadcn/ui Charts (= Recharts)

**위치**: Graph Studio 메인 엔진 후보 아님. 보조 대시보드/UI 차트 용도.

- 독립 차트 엔진이 아닌 **Recharts 기반 복붙 컴포넌트** (shadcn 공식 문서 명시)
- Recharts 한계가 곧 shadcn Charts 한계:
  - Boxplot **없음** (Issue #2302, 여전히 open)
  - Violin, heatmap **없음**
  - SVG only → 대용량 데이터 성능 병목 (10K+ 포인트에서 3.2초 렌더링)
  - 고DPI export API 없음
- **적합 용도**: 홈 대시보드, 간단한 요약 차트 (BioHub에서 이미 적절한 위치)

### 4.2 Nivo

**위치**: Graph Studio 메인 엔진 후보 아님. 보조 대시보드/UI 차트 후보.

- Boxplot **있음** (@nivo/boxplot v0.99.0 npm 확인)
- SSR HTTP 렌더링 API **있음** (공식 README 명시, 단 Next.js App Router에서는 `"use client"` 필요)
- **탈락 근거** (boxplot/SSR 부재가 아님):
  - Violin **없음**, error bars **없음**
  - 통계 annotation (significance brackets, p-values) **없음**
  - 내장 export 기능 **없음** — 저널 투고용 고DPI 출력 불가
  - 단일 메인테이너 (v1.0 로드맵 없음)
  - 대용량 데이터 성능 부족

---

## 5. 권장 전략

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Graph Studio                          │
│                                                          │
│  [인터랙티브 편집]              [논문 Export]             │
│  ECharts 6.0                   matplotlib (Pyodide)     │
│  - 실시간 편집/AI 패치          - PDF/TIFF/EPS/SVG/PNG  │
│  - 대용량 데이터 (Canvas)       - 300~600 DPI           │
│  - significance brackets        - SciencePlots 테마     │
│  - 저널 프리셋 (mm)             - 모든 저널 포맷 대응   │
│                                                          │
│  ChartSpec (JSON) ──────→ Python 변환 ──→ 파일 다운로드  │
│                            (Pyodide Worker)              │
│                                                          │
│  [보류: lazy-load 후보]                                  │
│  Plotly.js                                               │
│  - 현재 Phase에서 ROI 낮음                               │
│  - 브라우저 내 native violin/3D surface 필요 시 재검토   │
│  - route-level 또는 feature-level lazy load              │
│                                                          │
│  [보조 UI 차트]                                          │
│  shadcn/ui Charts (Recharts)                             │
│  - 홈 대시보드, 요약 차트                                │
└─────────────────────────────────────────────────────────┘
```

### 단계별 구현

| 단계 | 내용 | 비용 | 근거 |
|------|------|------|------|
| **1** | matplotlib Agg 백엔드 PDF/TIFF export 파이프라인 | 낮음 | Pyodide 내장 (추가 번들 0) |
| **2** | ChartSpec → matplotlib 변환기 (bar, line, scatter 우선) | 중간 | 10개 차트 타입, 단계적 |
| **3** | SciencePlots 스타일 적용 (nature, ieee, science) | 낮음 | `no-latex` 스타일 또는 rcParams 직접 적용. LaTeX 불필요 (상단 결론 참조) |
| **4** | ECharts violin 검증 (echarts-custom-series) | — | **검증 완료**: 자체 구현 유지 (아래 참조) |
| **5** | plotnine 통합 (Pyodide statsmodels 업데이트 후) | 낮음 | 현재 >= 0.14.6 요구 vs Pyodide 0.14.4 |

### Plotly.js 재검토 조건

현재 Phase에서는 ROI가 낮아 보류하되, 다음 조건 중 하나라도 충족되면 lazy-loaded 보조 렌더러로 재검토:
- 브라우저 내 native violin/3D surface가 제품 핵심 기능이 될 때
- Plotly JSON 직결 워크플로 (Pyodide → fig.to_json() → plotly.js)가 사용자 요구로 확인될 때
- ECharts의 SVG export 버그가 장기 미해결되어 대안이 필요할 때

---

## 6. AI와 논문 시각화 (2026-03-20 현황)

AI는 주로 **차트 초안 생성, 스타일 제안, spec/code 작성 보조** 쪽으로 발전했으며, 최종 렌더러로서의 지위를 가지지는 않는다.

- **Plotly Studio**: AI 기반 차트 생성 → "저자 도구"에 가까움
- **Observable AI chart creation**: 탐색적 시각화 보조
- **Graph Studio AI 패치**: OpenRouter 기반 ChartSpec JSON Patch (이미 구현)

**원칙**: AI는 "생성 보조"로만 쓰고, **최종 제출 렌더러의 source of truth로 두지 않는다**. 논문 최종 산출물의 주력 축은 AI로 뒤집히지 않았으며, matplotlib 계열이 가장 안정적.

---

## 7. 추가 검토 후보 (Python export 레이어)

### 7.1 추가 검토 1순위

#### seaborn.objects (가장 현실적 추가 후보)

- `Plot.save()`가 matplotlib `savefig()`로 이어짐 → 현재 export 파이프라인과 완전 호환
- 스타일/통계 표현력을 올리면서 최종 출력 안정성 유지
- seaborn 0.13.2의 objects API는 여전히 "experimental" 표기이나 기본 기능은 동작
- Pyodide에서 micropip 설치 가능 (순수 Python)
- **적합 시점**: matplotlib 변환기 구축 후, 통계 시각화 표현력 강화 단계

#### plotnine (ggplot2 스타일 필요 시)

- 다중 패널, 통계 그래픽, figure assembly가 깔끔
- PDF 워크플로 우수
- **현재 제약**: statsmodels >= 0.14.6 요구 vs Pyodide 0.14.4 → 호환 불가
- **적합 시점**: Pyodide statsmodels 업데이트 후

### 7.2 조건부 후보

#### PyVista (3D가 중요해질 때)

- 3D surface, mesh, volume 계열 논문 그림
- 공식 svg, eps, ps, pdf, tex 저장 지원
- BioHub에서 3D 시각화 수요가 확인되면 검토
- Pyodide 호환 여부 별도 확인 필요

#### Quarto (문서 재현성까지 묶고 싶을 때)

- 차트 라이브러리가 아닌 **논문 산출물 프레임워크**
- Jupyter/Python 기반 PDF/Word/HTML manuscript 재현 가능
- BioHub의 "분석 → 보고서" 파이프라인 확장 시 검토

#### Altair/Vega-Lite (declarative spec)

- declarative spec이 우수, `save()`로 PNG/SVG/PDF 가능
- 단, 이미지 저장에 JS 쪽 부가 의존성 필요
- 완전 오프라인/저널 제출 파이프라인 중심축으로는 matplotlib보다 덜 단단함

#### HoloViews/hvPlot (탐색 + 재현성 아카이빙)

- 논문용 figure provenance 남기기 좋음
- backend 선택 복잡도 있어 메인 export 엔진보다 보조층이 적합

### 7.3 최종 우선순위 정리

```
기본 축:        ECharts 6 (인터랙티브) + matplotlib (논문 export)
추가 검토 1순위: seaborn.objects 또는 plotnine
3D 필요 시:     PyVista
문서 재현성:    Quarto
AI 도구:        생성 보조로만 (최종 렌더러 source of truth 아님)
```

---

## 8. 팩트체크 이력

### 2026-03-20 검증 완료

| 주장 | 판정 | 정정 |
|------|------|------|
| ECharts 6.0.0 2025년 7월 릴리스 | **정확** | — |
| ECharts 번들 ~1MB (min ~1.08MB, gz ~353KB) | **정확** | — |
| ECharts SVG export 버그 | **정확** | Issue #19278, #20261 |
| ECharts violin 없음 | **수정** | echarts-custom-series 별도 패키지로 공식 제공 (코어 내장은 아님) |
| ECharts design token 도입 | **정확** | — |
| Plotly.js ~2MB min, 트리셰이킹 불가 | **표현 수정** | 기본 full bundle은 2MB+로 무거움. partial/custom bundle 경로 존재하나 운영 복잡도 수반 |
| Plotly Python v6.5.2 | **갱신** | 최신 v6.6.0 (2026-03-02) |
| Nivo violin 없음 | **정확** | @nivo/violin 미존재 |
| Nivo boxplot 없음 | **수정** | @nivo/boxplot v0.99.0 존재 (npm 확인) |
| Nivo SSR 불가 | **수정** | HTTP 렌더링 API 존재. 단 Next.js App Router에서는 `"use client"` 필요 |
| Nivo export 없음 | **정확** | 내장 export API 없음 |
| shadcn/ui = 독립 엔진 | **수정** | Recharts 기반 복붙 컴포넌트. 실질 제약은 Recharts 한계 |
| Recharts boxplot 없음 | **정확** | Issue #2302 여전히 open |
| SciencePlots v2.2.1, 8.7k stars | **정확** | — |
| matplotlib petroff10 기본 색상 | **수정** | opt-in 스타일시트, 기본값 변경 아님 |
| plotnine statsmodels >= 0.14.5 필요 | **수정** | 실제로는 >= 0.14.6 필요 (격차 더 큼) |
| Pyodide: matplotlib 3.8.4, statsmodels 0.14.4 | **정확** | — |
| PubMed Central SVG 미수용 | **정확** | 공식 Image Quality Specs 명시 |
| Kaleido v1.2.0 시스템 Chrome 필요 | **정확** | — |
| lets-plot 최신 v4.9.0 | **갱신** | 실제 최신 4.12.x |
| Plotly.py export = plotly.js와 동일 | **수정** | Kaleido(PNG/SVG/PDF) vs toImage(PNG/SVG/JPEG) 능력 다름 |

---

## 9. PoC 검증 결과 (2026-03-20 실행)

### P0: ECharts violin — 자체 구현 vs `@echarts-x/custom-violin` 1.1.1

| | **BioHub 자체 구현** | **@echarts-x/custom-violin** |
|---|---|---|
| KDE kernel | Epanechnikov | Epanechnikov (동일) |
| Bandwidth | **Silverman's rule** (데이터 적응형) | **하드코딩 `1`** — 데이터 스케일 무관 |
| Y축 범위 | KDE 커브 lo/hi 기반 자동 | **0~10 하드코딩** |
| n<5 처리 | **boxplot 폴백 + "n<5" 안내** | 없음 |
| tooltip | N/Min/Q1/Median/Q3/Max | 기본 scatter tooltip |
| 코드 위치 | `echarts-converter.ts` L1708~L1870 | 별도 npm 패키지 |

**결론: 자체 구현 유지. 공식 패키지 도입 불필요.**

### P1: SciencePlots `no-latex` + Pyodide

```
micropip.install('SciencePlots')  → 492ms
plt.style.use(['science', 'no-latex'])  → OK
plt.style.use(['science', 'ieee', 'no-latex'])  → OK

적용된 rcParams:
  font.family = ['serif']
  font.size = 10.0
  axes.linewidth = 0.5
  xtick.direction = in
```

**결론: LaTeX 없이 정상 동작. `no-latex` 스타일 사용 또는 rcParams 직접 적용 모두 가능.**

### P2: matplotlib export 포맷별 결과

테스트 환경: Pyodide 0.29.3 + matplotlib 3.8.4 (Node.js)

| 포맷 | 결과 | 크기 | 비고 |
|------|:----:|------|------|
| **PNG** 300DPI | **OK** | 29KB | Agg 백엔드, BytesIO → base64 |
| **PDF** | **OK** | 10KB | 벡터, 저널 투고 가능 |
| **SVG** | **OK** | 19KB | 벡터 |
| **TIFF** 300DPI | **OK** | 2.6MB | Pillow 경유, 저널 필수 포맷 |
| **EPS** | **OK** | 7KB | 벡터, 저널 필수 포맷 |

matplotlib 로드: 462ms (캐시 후). **모든 저널 요구 포맷 대응 가능. 기술 리스크 없음.**

---

## 10. 모니터링 레지스트리

> 분기 1회 Pyodide 릴리스 노트 확인. ops-dashboard 등록 예정.

| 항목 | 현재 값 | 트리거 조건 | 영향 |
|------|---------|------------|------|
| Pyodide statsmodels | 0.14.4 | >= 0.14.6 | plotnine 사용 가능 |
| Pyodide matplotlib | 3.8.4 | >= 3.10 | petroff10 네이티브 사용 가능 |
| echarts-custom-series violin | 1.1.1 (bandwidth 하드코딩) | bandwidth 자동화 시 | 자체 구현 교체 재검토 |
| ECharts SVG export 버그 | #19278, #20261 open | 해결 시 | SVG export 신뢰도 향상 |
| seaborn objects API | 0.13.2 (experimental) | stable 선언 시 | 통계 시각화 표현력 강화 후보 |
| Plotly.js 트리셰이킹 | #5723 미해결 | 해결 시 | 번들 부담 감소, lazy-load 재검토 |
| SciencePlots | 2.2.1 | 메이저 업데이트 시 | 새 저널 스타일 추가 여부 확인 |

---

## 부록: 저널별 컬러 팔레트 (현재 Graph Studio 내장)

| 저널 | 팔레트 ID | 비고 |
|------|----------|------|
| Nature Publishing Group | npg | — |
| AAAS (Science) | aaas | — |
| NEJM | nejm | — |
| Lancet | lancet | — |
| JAMA | jama | — |
| Okabe-Ito (colorblind-safe) | okabe-ito | 기본값 |
| ColorBrewer (8종) | Set1, Set2, Paired, Dark2, viridis, Blues, Greens, RdBu 등 | — |

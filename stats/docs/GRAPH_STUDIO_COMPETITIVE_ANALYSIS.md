# Graph Studio 경쟁 분석 및 전략

**작성일**: 2026-02-28
**목적**: Graph Studio를 논문용 그래프 도구로 발전시키기 위한 시장 분석 + 경쟁 전략 + 구현 우선순위

---

## 1. 한국 연구자 현황

### 현재 사용 도구 (분야별)

| 분야 | 1차 도구 | 최종 편집 | 주요 불만 |
|------|----------|-----------|-----------|
| 바이오/의학 | GraphPad Prism | Adobe Illustrator/PPT | 비용 $142+/년, 영어 UI |
| 공학/물리 | OriginLab | Illustrator | 비용 ~$500/년, 학습 곡선 높음 |
| 환경/화학 | SigmaPlot | Illustrator | 업데이트 느림 |
| 데이터사이언스 | R (ggplot2) + Python | 코드 직접 수정 | 진입장벽, 반복 작업 |
| 일반 | Excel | PPT | 저품질, 저널 거절 |

### 핵심 워크플로우 (현재)

```
데이터 분석 (SPSS/R) → 그래프 도구 (Prism/Origin) → 최종 편집 (Illustrator/PPT) → 저널 제출
```

**문제점**: 3-4단계 도구 전환, 데이터 재입력, 형식 맞춤 반복 작업

---

## 2. 주요 경쟁사 분석

### GraphPad Prism (가장 강력한 경쟁자)

- **제조사**: 미국 GraphPad Software (현 Dotmatics/Insightful Science 소유)
- **가격**: $142/년 (개인), $500/년 (학술 그룹), $1,040/년 (기업)
- **강점**:
  - mm/inch 단위 출력 + Nature/Cell 등 저널 사이즈 프리셋
  - SD/SEM/CI 에러바 (열 기반 직접 선택)
  - 통계 분석 + 그래프 통합 워크플로우
  - 300/600/1200 DPI 고해상도 출력 (TIFF, EPS, PDF, PNG, SVG)
  - CMYK 색상 지원 (인쇄용)
  - 생물학 특화 그래프 (Survival curve, Dose-response, XY scatter + fit)
  - 커브 피팅 (Nonlinear regression)
- **약점**:
  - 영어 전용 UI
  - 유료 구독
  - 데스크탑 전용 (웹 미지원)
  - AI 기능 없음 (2026년 기준)
  - 복잡한 학습 곡선

### OriginLab

- **가격**: $500~1,500/년
- **강점**: 공학 특화, 수십 가지 그래프, 3D 그래프
- **약점**: 비쌈, 복잡함, 영어 전용, AI 없음

### R (ggplot2) + Python (matplotlib/seaborn)

- **가격**: 무료
- **강점**: 무한 커스텀, 재현 가능, 커뮤니티 광대
- **약점**: 코드 작성 필요 (진입장벽), 반복 작업 불편, 실시간 미리보기 없음

### Datawrapper / RAWGraphs / Flourish

- **가격**: 무료/프리미엄
- **강점**: 웹 기반, 쉬운 UI, 인터랙티브 차트
- **약점**: 논문용 출력 기능 없음, 통계 분석 없음, 저널 규격 미지원

---

## 3. Graph Studio 현재 상태

### 스키마에는 있지만 UI가 없는 기능 (즉시 구현 가능)

| 기능 | 스키마 위치 | 현재 UI 상태 |
|------|-------------|-------------|
| 에러바 타입 | `errorBar.type: ci/stderr/stdev/iqr` | ❌ 컬럼 선택 UI 없음 |
| 로그 스케일 | `scale.type: log/sqrt/symlog` | ❌ 토글 UI 없음 |
| 축 범위 | `scale.domain: [min, max]` | ❌ 입력 UI 없음 |
| 색상 인코딩 | `encoding.color.field` | ❌ 열 선택 UI 없음 |
| 범례 위치 | `legend.orient: top/bottom/left/right` | ❌ 드롭다운 없음 |
| 스타일 프리셋 | `style.preset: science/ieee/grayscale` | ❌ 버튼 없음 |
| 주석 | `annotations: text/line/rect` | ❌ 추가 UI 없음 |

### 스키마에도 없는 기능 (신규 개발 필요)

| 기능 | 설명 | 구현 난이도 |
|------|------|------------|
| 출력 크기 (mm/cm) | 논문 제출 필수 | 중 (CSS + 계산 로직) |
| 저널 사이즈 프리셋 | Nature 89mm, Cell 85mm 등 | 하 (JSON 프리셋) |
| 유의성 마커 | *, **, ***, ns 브래킷 | 중 (ECharts annotation) |
| TIFF 출력 | 300/600 DPI 논문용 | 중 (html2canvas + sharp?) |
| 커브 피팅 시각화 | 회귀선 + 신뢰구간 밴드 | 고 (ECharts 커스텀 렌더러) |
| Survival curve 그래프 | Kaplan-Meier 전용 | 고 (ECharts 커스텀) |

### 현재 강점 (타 도구 대비 우위)

1. **AI 편집** (Stage 2 완료): 자연어로 그래프 수정 — Prism에 없음
2. **통계-그래프 통합**: Smart Flow 결과 → Graph Studio 직결 가능 (미구현이지만 아키텍처 갖춤)
3. **웹 기반**: 설치 불필요, 어디서나 접근
4. **무료**: Prism $142/년 vs 무료
5. **ECharts 6.0 기반**: 현대적, 인터랙티브, SVG/Canvas 양방향

---

## 4. 경쟁 전략: Prism을 이기는 방법

### "무료 + 한국어 + AI" 삼각 포지셔닝

```
GraphPad Prism           Graph Studio (목표)
─────────────────        ─────────────────────
$142+/년         →       무료
영어 전용        →       한국어 UI + 한국 저널 프리셋
AI 없음          →       자연어 그래프 편집 + AI 자동 포맷
데스크탑 전용    →       웹 기반 (어디서나)
통계 별도        →       분석-그래프-해석 원스톱
```

### 단계별 타겟

| 단계 | 타겟 | 메시지 |
|------|------|--------|
| 1단계 | 국내 바이오/의학 대학원생 | "Prism 학생 가격도 부담 → 무료 대안" |
| 2단계 | 지도교수 | "학생들이 쓰는 툴 → 무료로 제공" |
| 3단계 | 국내 의과대학/연구소 | "Prism 라이선스 비용 절감 + AI 기능" |

### 킬러 피처 (경쟁사가 없는 것)

1. **"저널 자동 포맷"**: "이 그래프를 Nature 투고 규격으로 바꿔줘" → AI가 89mm 폭, Arial 8pt, 300 DPI 자동 설정
2. **분석-그래프 연결**: Smart Flow 통계 결과 → Graph Studio에서 자동 시각화 + 에러바 자동 설정
3. **유의성 마커 자동 배치**: 통계 결과의 p-value로 *, **, *** 자동 추가

---

## 5. 구현 로드맵

### Phase G1: 핵심 부재 UI 구현 (즉시, 2-3주)

논문 제출 가능 수준의 최소 기능:

| 기능 | 구현 파일 | 난이도 | 근거 |
|------|----------|--------|------|
| **출력 크기 (mm/cm/px)** + 저널 프리셋 | `ExportTab`, `exportConfig` 스키마 | 중 | Prism 필수 기능 #1 |
| **에러바 UI** — 컬럼 선택 + 배율 | `PropertiesPanel`, `SidePanel` | 중 | 바이오 연구 필수 |
| **축 범위 + 로그 스케일 UI** | `PropertiesPanel` | 하 | 스키마 이미 지원 |
| **색상 인코딩 UI** — 그룹 컬럼 선택 | `PropertiesPanel` | 하 | 스키마 이미 지원 |
| **스타일 프리셋 버튼** (Science/IEEE) | `StyleTab` | 하 | 스키마 이미 지원 |

### Phase G2: 논문 품질 향상 (중기, 1-2개월)

| 기능 | 설명 |
|------|------|
| **유의성 마커** (* ** ***) | ECharts markArea/markLine으로 구현 |
| **저널 사이즈 프리셋** | Nature/Cell/PNAS/KCI 규격 버튼 |
| **TIFF 출력** | html2canvas → 300/600 DPI 지원 |
| **범례 세부 제어** | 위치, 폰트 크기, 숨김 |
| **폰트 선택** | Arial/Helvetica/Times (저널별 규격) |
| **더 많은 차트 타입** | paired line, mean ± SD column |

### Phase G3: AI-Forward 차별화 (장기, 3-6개월)

| 기능 | 설명 |
|------|------|
| **저널 자동 포맷** | "Nature format" 자연어 → 규격 자동 적용 |
| **Smart Flow → Graph 자동 연결** | 분석 결과에서 그래프 + 에러바 자동 생성 |
| **유의성 마커 자동 배치** | 통계 p-value → * ** *** 자동 추가 |
| **AI 차트 추천** | 데이터 구조 분석 → "이런 그래프가 어울립니다" |
| **다중 패널 그래프** | 하나의 PDF에 여러 그래프 자동 배치 |

---

## 6. ECharts 기술 가능성 검토

| 필요 기능 | ECharts 6.0 지원 여부 | 구현 방법 |
|----------|---------------------|---------|
| 에러바 | ✅ custom series + markLine | `errorBar` 타입 → ECharts custom render |
| 로그 스케일 | ✅ `yAxis.type: 'log'` | 스키마 `scale.type: 'log'` → 직접 매핑 |
| SVG/PNG 출력 | ✅ `echartsInstance.getDataURL()` | 이미 구현됨 |
| 정확한 mm 출력 | ⚠️ CSS 계산 필요 | px = mm × DPI / 25.4 계산 |
| TIFF 출력 | ❌ ECharts 미지원 | html2canvas → Blob → TIFF 변환 필요 |
| SVG 폰트 임베드 | ⚠️ 부분 지원 | Google Fonts preload + SVG foreignObject |
| 유의성 마커 브래킷 | ✅ markArea + markLine 조합 | 커스텀 렌더러 구현 필요 |
| Survival curve | ✅ 계단형 line chart | `step: 'end'` 옵션 |

---

## 7. 성공 지표

| 지표 | 현재 | 6개월 목표 |
|------|------|-----------|
| 논문 제출 가능 그래프 | ❌ | ✅ (mm 출력 + 에러바) |
| Prism 대비 기능 커버리지 | ~20% | ~60% |
| AI 기능 | ✅ (text edit) | ✅ + 저널 자동 포맷 |
| Stats-Graph 연결 | ❌ | ✅ Smart Flow → Graph |

---

## 참고

- GraphPad Prism 가격: https://www.graphpad.com/support/faq/new-graphpad-prism-plans/
- Nature 그래프 규격: 단단(89mm), 1.5단(120mm), 2단(183mm), 최소 폰트 5pt
- Cell Press 규격: 단단(85mm), 2단(170mm), 최소 폰트 6pt
- PNAS 규격: 단단(85mm), 2단(174mm)

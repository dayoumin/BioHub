# Phase 3: 그래프/시각화 E2E 테스트

> Graph Studio + Smart Flow 내 차트 렌더링 + 내보내기 검증

## 목표

1. **Graph Studio** 독립 페이지의 전체 기능 검증
2. **Smart Flow 결과 차트**가 메서드별로 정상 렌더링되는지 확인
3. 차트 **상호작용** (줌, 패닝, 툴팁) 검증
4. 차트 **내보내기** (이미지, PDF) 검증

---

## 3.1 Graph Studio — 기본 기능 (graph-studio-e2e.spec.ts 강화)

### 기존 테스트 (6개, 유지)

| # | 테스트 | 상태 |
|---|--------|------|
| T1 | 업로드 모드 렌더링 (smoke) | 기존 ✅ |
| T2 | 차트 유형 클릭 → 에디터 진입 | 기존 ✅ |
| T3 | 파일 업로드 → 에디터 전환 | 기존 ✅ |
| T4 | 사이드 패널 탭 전환 | 기존 ✅ |
| T5 | 사이드 패널 토글 | 기존 ✅ |
| T6 | AI 패널 토글 (smoke) | 기존 ✅ |

### 신규 테스트

```
TC-3.1.1: 모든 차트 유형 썸네일 렌더링 (@smoke)
  - bar, grouped-bar, stacked-bar, line, scatter, boxplot,
    histogram, error-bar, heatmap, violin, km-curve, roc-curve
  - 각 graphStudioChartType(type) 존재 확인
  - ※ "pie"는 미지원 — 존재 여부 확인 필요

TC-3.1.2: Bar 차트 → 샘플 데이터 → 축/범례 확인 (@critical)
  - graphStudioChartType('bar') 클릭
  - graphStudioChart 내 ECharts canvas 존재
  - X축, Y축 레이블 텍스트 확인

TC-3.1.3: Line 차트 → 샘플 데이터 렌더링 (@important)
  - graphStudioChartType('line') 클릭
  - 차트 렌더링 확인

TC-3.1.4: Scatter 차트 → 샘플 데이터 렌더링 (@important)
  - graphStudioChartType('scatter') 클릭
  - 차트 렌더링 확인

TC-3.1.5: Boxplot → 샘플 데이터 렌더링 (@important)
  - graphStudioChartType('boxplot') 클릭 (※ 'box'가 아님)
  - 차트 렌더링 확인

TC-3.1.6: Violin 플롯 → 샘플 데이터 렌더링 (@nice-to-have)
  - graphStudioChartType('violin') 클릭
  - 차트 렌더링 확인

TC-3.1.7: Heatmap → 샘플 데이터 렌더링 (@nice-to-have)
  - graphStudioChartType('heatmap') 클릭
  - 차트 렌더링 확인

TC-3.1.8: KM 생존곡선 → 샘플 데이터 렌더링 (@nice-to-have)
  - graphStudioChartType('km-curve') 클릭
  - 도메인 특화 차트 렌더링 확인

TC-3.1.9: ROC 곡선 → 샘플 데이터 렌더링 (@nice-to-have)
  - graphStudioChartType('roc-curve') 클릭
  - 도메인 특화 차트 렌더링 확인
```

---

## 3.2 Graph Studio — 데이터 업로드 & 매핑

```
TC-3.2.1: CSV 업로드 → 자동 차트 생성 (@critical)
  - t-test.csv 업로드 → graphStudioChart 렌더링
  - 변수명이 축 레이블에 반영

TC-3.2.2: 다른 CSV → 차트 유형 자동 감지 (@important)
  - timeseries.csv 업로드 → 시계열 차트 생성 (있을 경우)
  - correlation.csv 업로드 → 산점도 생성 (있을 경우)

TC-3.2.3: 데이터 탭에서 변수 매핑 변경 (@important)
  - graphStudioTabData 클릭
  - X축 변수, Y축 변수 드롭다운 변경
  - 차트 업데이트 확인

TC-3.2.4: 빈 데이터 / 비정상 데이터 방어 (@important)
  - 0행 CSV 업로드 시 에러 메시지
  - 모두 텍스트 열인 CSV → 적절한 안내
```

---

## 3.3 Graph Studio — 스타일링 & 커스터마이징

```
TC-3.3.1: 스타일 탭에서 색상 변경 (@important)
  - graphStudioTabStyle 클릭
  - 색상 옵션 변경
  - 차트 렌더링 업데이트 확인

TC-3.3.2: 제목 변경 (@important)
  - 차트 제목 입력 → 차트에 반영

TC-3.3.3: Undo/Redo 동작 (@important)
  - 스타일 변경 후 graphStudioUndo 클릭 → 이전 상태
  - graphStudioRedo 클릭 → 변경 상태 복원
```

---

## 3.4 Graph Studio — AI 어시스턴트 (@ai-mock)

```
TC-3.4.1: AI 패널 열기 → 질문 전송 (@important)
  - graphStudioAiToggle 클릭
  - graphStudioAiInput 입력 → graphStudioAiSend 클릭
  - 응답 메시지 표시 (모킹)

TC-3.4.2: AI 추천 차트 적용 (@nice-to-have)
  - AI가 추천한 차트 설정 적용
  - 차트 업데이트 확인
```

---

## 3.5 Smart Flow 결과 차트 (charts/ 디렉토리)

### chart-rendering.spec.ts — 메서드별 차트 존재 확인

각 통계 메서드의 **결과 화면**에 적절한 차트가 렌더링되는지 검증:

```
TC-3.5.1: t-검정 결과 → 그룹 비교 차트 (@critical)
  - t-test 분석 완료 후
  - canvas 또는 svg 요소 존재
  - 2개 그룹 표시 (박스플롯 or 바차트)

TC-3.5.2: ANOVA 결과 → 그룹 비교 차트 (@critical)
  - ANOVA 분석 완료 후
  - 3개+ 그룹 차트 렌더링

TC-3.5.3: 상관 결과 → 산점도 (@critical)
  - correlation 분석 완료 후
  - 산점도 + 회귀선 렌더링

TC-3.5.4: 회귀 결과 → 잔차 플롯 + 적합도 (@important)
  - regression 분석 완료 후
  - 잔차 vs 적합값 플롯
  - Q-Q 플롯 (있을 경우)

TC-3.5.5: 카이제곱 결과 → 교차표/모자이크 (@important)
  - chi-square 분석 완료 후
  - 교차표 또는 모자이크 플롯

TC-3.5.6: PCA 결과 → Scree 플롯 (@important)
  - PCA 분석 완료 후
  - Scree plot (고유값 감소 곡선)

TC-3.5.7: 생존분석 결과 → 생존곡선 (@important)
  - Kaplan-Meier 분석 후
  - 생존 곡선 렌더링
  - 그룹별 곡선 구분

TC-3.5.8: ROC 결과 → ROC 곡선 (@important)
  - ROC 분석 후
  - ROC 곡선 + AUC 값
  - 대각선 참조선
```

### chart-interaction.spec.ts — 차트 상호작용

```
TC-3.5.9: 차트 호버 → 툴팁 표시 (@important)
  - 차트 위 마우스 호버
  - 툴팁/popover 표시
  - 데이터 포인트 값 표시

TC-3.5.10: Plotly 차트 → 줌 인/아웃 (@nice-to-have)
  - Plotly 차트 영역에서 드래그 줌
  - 더블클릭 → 원래 크기 복원

TC-3.5.11: Plotly 차트 → 이미지 다운로드 (@nice-to-have)
  - Plotly 모드바의 카메라 아이콘 클릭
  - PNG 다운로드 트리거
```

### chart-export.spec.ts — 차트 내보내기

```
TC-3.5.12: Graph Studio → PNG 내보내기 (@important)
  - 에디터 모드에서 내보내기 버튼
  - PNG 파일 다운로드

TC-3.5.13: Smart Flow 결과 → 전체 내보내기 (@critical)
  - export-dropdown → export-html
  - 차트 포함된 HTML 생성

TC-3.5.14: Smart Flow → 결과에서 Graph Studio 이동 (@important)
  - open-graph-studio-btn 클릭
  - /graph-studio 페이지 이동
  - 분석 데이터가 Graph Studio에 전달
```

---

## 3.6 좌측/우측 패널 (G5.0 레이아웃)

```
TC-3.6.1: 좌측 데이터 패널 표시/토글 (@important)
  - graphStudioLeftPanel 존재 확인
  - graphStudioLeftToggle 클릭 → 패널 숨김/표시

TC-3.6.2: 우측 속성 패널 표시 (@important)
  - graphStudioRightPanel 존재 확인
  - 선택된 차트 속성 표시
```

---

## 차트 검증 헬퍼 (helpers/chart-helpers.ts)

```typescript
// 차트 존재 확인
async function assertChartRendered(page: Page): Promise<boolean> {
  // ECharts: canvas
  // Plotly: svg.js-plotly-plot
  // Recharts: svg.recharts-surface
  const selectors = [
    'canvas',
    'svg.js-plotly-plot',
    '.recharts-surface',
    '[data-testid="graph-studio-chart"]'
  ]
  for (const sel of selectors) {
    if (await page.locator(sel).count() > 0) return true
  }
  return false
}

// 차트 내 데이터 포인트 확인
async function assertChartHasData(page: Page): Promise<boolean> {
  // Plotly: .trace 요소
  // ECharts: canvas pixel 확인
  // ...
}

// 차트 스크린샷 저장 (시각적 비교용)
async function captureChartScreenshot(page: Page, name: string): Promise<void> {
  const chart = page.locator('[data-testid="graph-studio-chart"], .js-plotly-plot, .recharts-wrapper').first()
  if (await chart.count() > 0) {
    await chart.screenshot({ path: `e2e/results/screenshots/charts/${name}.png` })
  }
}
```

## 실행 시간 예상

- Graph Studio 기본 (T1~T6 + 신규): ~10분
- Smart Flow 결과 차트: ~15분 (각 메서드 분석 포함)
- 차트 상호작용/내보내기: ~5분
- **전체 Phase 3: ~30분**

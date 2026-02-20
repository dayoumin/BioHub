# Step 5: 결과 및 액션 (Results & Action)

## 개요
통계 분석 완료 후 결과를 시각화하고 해석하여, 다음 단계를 선택할 수 있는 마지막 단계입니다.

## 주요 기능

### 1. 결과 시각화
- 📊 **차트 및 그래프**: 분석 방법에 적합한 시각화 자동 생성
- 📈 **통계표**: 주요 통계량 요약 테이블
- 🎯 **효과크기**: Cohen's d, eta-squared 등 자동 계산

### 2. 지능형 결과 해석
- **자동 해석문**: p-value 기반 통계적 유의성 설명
- **실질적 의미**: 효과크기를 고려한 실용적 해석
- **가정 검정 결과**: 분석 가정 충족 여부 표시
- **비교 분석 결과**: 대안 방법과의 비교 (가정 위반 시)
- **추천 액션**: 다음 단계 제안 및 추가 분석 추천

### 3. 지능형 액션 옵션
- 🔄 **새 분석 시작**: 다른 데이터로 새로운 분석
- 📥 **결과 내보내기**: PDF, Excel, CSV 형식 지원
- 🔍 **심화 분석**: 결과 기반 자동 추천 분석
- 📋 **보고서 생성**: 자동 보고서 작성
- 🎯 **추천 액션**: 분석 결과에 따른 구체적 제안

#### 자동 추천 액션 로직
```javascript
const generateRecommendedActions = (results) => {
  const actions = [];

  // 유의미한 결과 시
  if (results.significant) {
    actions.push({
      type: 'follow_up',
      title: '사후 분석 추천',
      description: '유의미한 차이가 발견되어 추가 분석을 추천합니다',
      suggestions: [
        '효과 크기 해석',
        '신뢰구간 분석',
        '실무적 의미 평가'
      ]
    });
  }

  // 가정 위반 시
  if (results.assumptionViolations?.length > 0) {
    actions.push({
      type: 'robustness_check',
      title: '강건성 검증',
      description: '가정 위반으로 인해 결과 신뢰성 검증이 필요합니다',
      suggestions: [
        '비모수 방법 비교',
        '부트스트랩 검증',
        '교차 검증'
      ]
    });
  }

  // 대용량 데이터 시
  if (results.sampleSize > 1000) {
    actions.push({
      type: 'validation',
      title: '추가 검증 추천',
      description: '대용량 데이터의 경우 추가 검증을 권장합니다',
      suggestions: [
        '교차 검증',
        '부분집합 분석',
        '민감도 분석'
      ]
    });
  }

  return actions;
};
```

## UI 컴포넌트 구조

```tsx
interface ResultsActionStepProps {
  results: AnalysisResult
  onNewAnalysis: () => void
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  onDeepDive?: (method: string) => void
}
```

## 구현 상태
- ✅ 기본 결과 표시
- ✅ PDF 내보내기 (jsPDF)
- ✅ Excel 내보내기 (XLSX)
- ✅ 새 분석 시작
- ⏳ 심화 분석 추천 (개발 중)
- ⏳ 대화형 차트 (계획됨)

## 결과 데이터 구조

```typescript
interface AnalysisResult {
  // 메타데이터
  metadata: {
    method: string
    timestamp: string
    duration: number
    dataSize: number
  }

  // 주요 결과
  mainResults: {
    statistic: number
    pvalue: number
    interpretation: string
    confidenceInterval?: {
      lower: number
      upper: number
      level: number
    }
  }

  // 추가 정보
  additionalInfo: {
    effectSize?: EffectSize
    postHoc?: PostHocResult[]
    assumptions?: AssumptionTest[]
  }

  // 시각화 데이터
  visualizationData?: {
    type: ChartType
    data: any
    options?: ChartOptions
  }
}
```

## 시각화 타입별 차트

| 분석 방법 | 차트 타입 | 설명 |
|----------|----------|------|
| t-test | Boxplot + 평균선 | 그룹 간 분포 비교 |
| ANOVA | Boxplot (다중) | 여러 그룹 분포 |
| 상관분석 | Scatter plot | 상관관계 시각화 |
| 회귀분석 | Scatter + 회귀선 | 예측 모델 표시 |
| 카이제곱 | Heatmap | 교차표 시각화 |

## 해석 가이드라인

### p-value 해석
- p < 0.001: 매우 강한 통계적 유의성
- p < 0.01: 강한 통계적 유의성
- p < 0.05: 통계적으로 유의
- p ≥ 0.05: 통계적으로 유의하지 않음

### 효과크기 해석 (Cohen's d)
- d < 0.2: 무시할 수준
- 0.2 ≤ d < 0.5: 작은 효과
- 0.5 ≤ d < 0.8: 중간 효과
- d ≥ 0.8: 큰 효과

## 내보내기 형식

### PDF 보고서
- 제목 및 메타정보
- 분석 방법 설명
- 결과 표 및 차트
- 통계적 해석
- 참고문헌

### Excel 파일
- Sheet 1: 요약 통계
- Sheet 2: 원본 데이터
- Sheet 3: 상세 결과
- Sheet 4: 차트 데이터

## 연관 컴포넌트
- `ResultsActionStep.tsx`: 메인 컴포넌트
- `ResultsVisualization.tsx`: 차트 렌더링
- `ResultsInterpretation.tsx`: 해석 표시
- `PDFReportService.ts`: PDF 생성 서비스

## 향후 개발 계획
1. **인터랙티브 차트**: Plotly.js 완전 통합
2. **AI 기반 해석**: GPT 모델을 통한 자연어 해석
3. **협업 기능**: 결과 공유 및 코멘트
4. **템플릿 시스템**: 커스텀 보고서 템플릿
5. **추가 내보내기**: LaTeX, Markdown, Word

## 사용 예시

```tsx
// 컴포넌트 사용
<ResultsActionStep
  results={results}
  onNewAnalysis={() => navigate('/new-analysis')}
  onExport={(format) => exportResults(format)}
  onDeepDive={(method) => startDeepAnalysis(method)}
/>

// 결과 내보내기
const exportResults = async (format: 'pdf' | 'excel' | 'csv') => {
  switch(format) {
    case 'pdf':
      await PDFReportService.generate(results)
      break
    case 'excel':
      await ExcelExportService.export(results)
      break
    case 'csv':
      await CSVExportService.export(results)
      break
  }
}
```

## 참고 사항
- 모든 차트는 색맹 친화적 색상 팔레트 사용
- 결과는 세션 스토리지에 자동 저장
- 대용량 데이터의 경우 차트 샘플링 적용
- 모바일 반응형 디자인 지원

---

*최종 업데이트: 2025-09-17*
*작성자: Statistical Platform Team*
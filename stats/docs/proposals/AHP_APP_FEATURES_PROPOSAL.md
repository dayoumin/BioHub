# AHP App Features Proposal for Statics Platform

**Date**: 2025-11-27
**Source**: D:\Projects\ahp_app (AHP Research Platform)
**Author**: Claude Opus 4.5

---

## Executive Summary

AHP App (Research Decision Support Platform) analysis results and applicable features for Statics statistical platform.

**Core Difference**:
- AHP App: Decision support focused (group evaluation, consensus building)
- Statics App: Statistical analysis focused (data analysis, hypothesis testing)

---

## 1. AI Result Interpretation System

### 1.1 Current State Comparison

| Item | Statics App (Current) | AHP App | Gap |
|------|----------------------|---------|-----|
| Interpretation Engine | Rule-based (`lib/interpretation/engine.ts`) | LLM-based | Architecture difference |
| Output | Template text ("Significant difference exists") | Contextual interpretation | Personalization |
| Recommendation | None | "Next steps" provided | Missing |

### 1.2 Implementation Options

#### Option A: Rule-based Engine Enhancement (Recommended)

**Reason**: AI hallucination risk high in statistics domain

```typescript
// lib/interpretation/insights-engine.ts
interface StatisticalInsight {
  type: 'significant' | 'non_significant' | 'effect_size' | 'assumption_violation' | 'sample_size_warning' | 'recommendation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedStatistic?: string;
}

function generateInsights(result: AnalysisResult): StatisticalInsight[] {
  const insights: StatisticalInsight[] = []

  // Rule 1: Significant but small effect size
  if (result.p_value < 0.05 && result.cohen_d < 0.2) {
    insights.push({
      type: 'effect_size',
      title: 'Statistical vs Practical Significance',
      description: 'Statistically significant but effect size is small, practical meaning is limited.',
      priority: 'high'
    })
  }

  // Rule 2: Sample size warning
  if (result.n < 30) {
    insights.push({
      type: 'sample_size_warning',
      title: 'Sample Size Caution',
      description: 'Sample size < 30, normality assumption review needed.',
      priority: 'medium'
    })
  }

  // Rule 3: Non-parametric recommendation
  if (result.assumptions?.normality?.passed === false) {
    insights.push({
      type: 'recommendation',
      title: 'Consider Non-parametric Test',
      description: 'Normality assumption violated, Mann-Whitney U or Wilcoxon test recommended.',
      priority: 'high'
    })
  }

  return insights
}
```

**Advantage**: No AI dependency, reproducible results, statistically verifiable

#### Option B: RAG-based Interpretation (Long-term)

**Reason**: May be useful if detailed contextual explanation needed

```typescript
// lib/rag/interpretation-query.ts
interface InterpretationQuery {
  type: 'interpret_result'
  method: 't-test' | 'anova' | 'correlation' | ...
  results: {
    p_value: number
    effect_size?: number
    sample_size?: number
  }
  context?: {
    variable_names?: string[]
    research_purpose?: string
  }
}

// RAG extension in use-rag-assistant.ts
async interpretResult(query: InterpretationQuery): Promise<AIInterpretation> {
  // 1. Search related statistical knowledge (existing RAG)
  const knowledge = await this.search(query.method + " interpretation guide")

  // 2. Pass results + knowledge to LLM for personalized interpretation
  const prompt = buildInterpretationPrompt(query, knowledge)
  return await this.llm.generate(prompt)
}
```

**Caution**: LLM may generate incorrect statistical interpretation (hallucination)

---

## 2. Academic Report Generator

### 2.1 Principle: Template + Data Insertion (Low AI Dependency)

```
Analysis Result Data → Template Selection → Section Generation → PDF/DOCX Export
```

### 2.2 Component Structure

```
components/
  academic-export/
    ReportTemplateSelector.tsx    // Template selection (APA, KCI, SSCI format)
    SectionGenerator.tsx          // Section-by-section generation
    ReportPreview.tsx             // Preview

lib/
  academic-export/
    templates/
      methodology-templates.ts    // "This study used {method}..."
      results-templates.ts        // "t(df) = statistic, p = pvalue, d = effect"
      interpretation-templates.ts // Rule-based interpretation
    report-builder.ts             // PDF/DOCX generation
    citation-formatter.ts         // Reference formatting
```

### 2.3 Report Structure (SPSS Output Style)

```
1. Cover Page
   - Analysis name, analyst, date

2. Analysis Overview
   - Purpose, hypothesis, data description

3. Descriptive Statistics
   - Summary table (Mean, SD, N)

4. Assumption Tests
   - Normality (Shapiro-Wilk)
   - Homogeneity of variance (Levene's test)

5. Main Analysis Results
   - Result table + chart
   - Effect size, confidence interval

6. Post-hoc Tests (if applicable)

7. Interpretation and Conclusion
   - Rule-based interpretation (engine.ts extension)

8. Appendix
   - Raw data summary
```

### 2.4 Implementation Example

```typescript
// lib/academic-export/report-builder.ts
interface ReportConfig {
  format: 'apa' | 'kci' | 'ssci'
  language: 'korean' | 'english'
  includeCharts: boolean
  includeRawData: boolean
}

async function generateReport(
  results: StatisticalResults,
  config: ReportConfig
): Promise<Blob> {
  const sections: ReportSection[] = []

  // 1. Methodology section (template-based)
  sections.push({
    title: 'Methodology',
    content: generateMethodology(results.method, config.language)
  })

  // 2. Results section (data insertion)
  sections.push({
    title: 'Results',
    content: formatResults(results, config.format),
    tables: generateTables(results),
    charts: config.includeCharts ? generateCharts(results) : []
  })

  // 3. Interpretation (rule-based)
  sections.push({
    title: 'Interpretation',
    content: interpretResults(results)  // engine.ts extension
  })

  // PDF generation
  return await renderToPDF(sections, config)
}
```

---

## 3. Analysis Insights System

### 3.1 Principle: Rule-based Pattern Matching

**Not AI-generated, but statistically verified rule-based**

### 3.2 Insight Categories

```typescript
type InsightType =
  | 'significant_finding'      // Significant result found
  | 'non_significant'          // No significant result
  | 'large_effect'             // Large effect size
  | 'small_effect_warning'     // Significant but small effect
  | 'sample_size_warning'      // Sample size concern
  | 'assumption_violation'     // Assumption test failed
  | 'outlier_detected'         // Outliers found
  | 'multicollinearity'        // Multicollinearity issue (regression)
  | 'heteroscedasticity'       // Heteroscedasticity issue
  | 'non_normality'            // Normality violated
  | 'recommendation'           // Recommended next analysis
```

### 3.3 Rule Definition Example

```typescript
// lib/interpretation/insight-rules.ts
const INSIGHT_RULES: InsightRule[] = [
  {
    id: 'significant_small_effect',
    condition: (r) => r.p_value < 0.05 && r.effect_size < 0.2,
    insight: {
      type: 'small_effect_warning',
      title: 'Statistically Significant but Small Effect',
      description: 'While the result is statistically significant (p < 0.05), the effect size (d < 0.2) suggests the practical significance may be limited.',
      priority: 'high'
    }
  },
  {
    id: 'large_sample_nonsig',
    condition: (r) => r.p_value >= 0.05 && r.n > 500,
    insight: {
      type: 'non_significant',
      title: 'No Effect Detected Despite Large Sample',
      description: 'With a large sample size (n > 500), the statistical power is high. The non-significant result likely reflects a true lack of effect.',
      priority: 'medium'
    }
  },
  {
    id: 'normality_violated_suggest_nonparam',
    condition: (r) => r.assumptions?.normality?.passed === false && r.method === 't-test',
    insight: {
      type: 'recommendation',
      title: 'Consider Non-parametric Alternative',
      description: 'The normality assumption is violated. Consider using Mann-Whitney U test for more robust results.',
      priority: 'high',
      suggestedMethod: 'mann-whitney'
    }
  }
]
```

### 3.4 UI Component

```tsx
// components/statistics/common/InsightsPanel.tsx
interface InsightsPanelProps {
  insights: StatisticalInsight[]
  onSuggestedMethodClick?: (method: string) => void
}

function InsightsPanel({ insights, onSuggestedMethodClick }: InsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Analysis Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <InsightCard key={i} insight={insight} onClick={onSuggestedMethodClick} />
        ))}
      </CardContent>
    </Card>
  )
}
```

---

## 4. Implementation Roadmap

### Phase A: Rule-based Insights Engine (2 weeks)

| Task | Duration | Priority |
|------|----------|----------|
| Define insight types and rules | 2 days | High |
| Extend `engine.ts` with insight generation | 3 days | High |
| Create `InsightsPanel` component | 2 days | High |
| Integrate with 43 statistics pages | 5 days | Medium |
| Testing and validation | 2 days | High |

### Phase B: Academic Report Generator (3 weeks)

| Task | Duration | Priority |
|------|----------|----------|
| Design template structure | 2 days | High |
| Implement methodology templates | 3 days | High |
| Implement results formatter | 3 days | High |
| PDF generation (jsPDF) | 3 days | Medium |
| DOCX generation (docx.js) | 2 days | Medium |
| UI components | 3 days | Medium |
| Testing | 2 days | High |

### Phase C: RAG-based Interpretation (Long-term, Optional)

| Task | Duration | Priority |
|------|----------|----------|
| Extend RAG service | 3 days | Low |
| Create interpretation prompts | 2 days | Low |
| Validation and testing | 3 days | Low |
| Hallucination mitigation | 2 days | Low |

---

## 5. Risk Assessment

### 5.1 AI Interpretation Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Statistical misinterpretation | High | Critical | Use rule-based as primary |
| Effect size criterion error | Medium | High | Hardcode standard criteria |
| Causal overclaiming | High | Critical | Rule-based constraints |
| Confidence interval misuse | Medium | Medium | Template-based output |

### 5.2 Recommendation

1. **Primary**: Rule-based insights engine (reliable, verifiable)
2. **Secondary**: Template-based academic report (no AI creativity)
3. **Optional**: RAG interpretation (only for concept explanation, not result interpretation)

---

## 6. File References

### AHP App Reference Files

```
D:\Projects\ahp_app\ahp_app\src\components\
├── ai-interpretation\AIResultsInterpretationPage.tsx
├── ai-paper\AIPaperGenerationPage.tsx
├── ai-quality\AIQualityValidationPage.tsx
├── analysis\advanced\MonteCarloSimulation.tsx
└── analysis\advanced\GroupConsensusPanel.tsx
```

### Statics App Target Files

```
stats\
├── lib\interpretation\
│   ├── engine.ts              # Extend with insights
│   └── insight-rules.ts       # New: rule definitions
├── components\statistics\common\
│   ├── InsightsPanel.tsx      # New: insights UI
│   └── ResultInterpretation.tsx # Existing: enhance
└── lib\academic-export\        # New: report generation
    ├── report-builder.ts
    └── templates\
```

---

## Conclusion

AHP App's AI features are designed for "decision support" and may not directly apply to statistical analysis. However:

1. **Insights System**: Rule-based approach is highly applicable and recommended
2. **Academic Report**: Template-based generation is practical and low-risk
3. **AI Interpretation**: Should be avoided for result interpretation due to hallucination risks

**Recommended Priority**:
1. Rule-based Insights Engine (Phase A) - High value, low risk
2. Academic Report Generator (Phase B) - Medium value, low risk
3. RAG Interpretation (Phase C) - Optional, only for concept explanation

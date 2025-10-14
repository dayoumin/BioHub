# 실험계획 가이드 시스템 구현 계획

## 📋 프로젝트 개요

**목표**: 연구자가 연구 질문을 입력하면 최적의 실험계획과 통계 분석 전략을 자동 제안하는 지능형 시스템 구축

**핵심 가치**: "무엇을 연구할지"만 알려주면 "어떻게 연구할지"를 완벽하게 안내

## 🎯 MVP (Minimum Viable Product) - Phase 1

### MVP 목표
**6주 내 구현 가능한 혁신적 하이브리드 시스템**

### 📱 MVP 기능 범위
1. **10가지 실험설계 지원 (확장)**
   - 독립표본 비교 (A vs B)
   - 대응표본 비교 (전-후)
   - 단순상관 연구
   - 일원분산분석 (3+ 그룹)
   - 기술통계 연구
   - **2×2 요인설계** (새로 추가)
   - **혼합설계** (집단간×집단내)
   - **다중회귀** (여러 예측변수)
   - **카이제곱 설계** (범주형 분석)
   - **비모수 설계** (정규성 가정 위반)

2. **트리 기반 단계적 선택 시스템**
   ```
   Step 1: "연구 목적을 선택하세요"
   ├── "집단 간 차이 비교" → Step 2A
   ├── "변수 간 관계 분석" → Step 2B
   └── "현상 기술/탐색" → Step 2C

   Step 2A: "비교할 집단은?"
   ├── "2개 그룹" → Step 3A
   ├── "3개 이상" → Step 3B
   └── "여러 요인 동시" → Step 3C

   Step 3A: "동일 참가자 반복?"
   ├── "예 (전-후 비교)" → 대응표본 t-검정
   └── "아니오 (독립 그룹)" → 독립표본 t-검정
   ```

3. **하이브리드 지능 시스템 (규칙 + LLM)**
   - **1단계**: 규칙 기반 빠른 분류 (신뢰도 >80%면 즉시 제안)
   - **2단계**: 복잡한 케이스는 소형 LLM 보조
   - **사용자 선택**: LLM 사용 여부 개인 설정 가능

4. **지능형 표본크기 계산**
   - 효과크기별 세부 계산 (Cohen's d, eta-squared, Cramer's V)
   - 사용자 정의 α, Power 설정 가능
   - 검정력 곡선 시각화

5. **통합 사용자 인터페이스**
   - **헤더 메뉴**: "통계분석" 옆에 "실험설계" 메뉴 추가
   - **연동**: 설계 완료 → 해당 통계 페이지 자동 이동
   - **저장**: 실험계획서 PDF 다운로드

6. **단계별 구현 전략**
   ```
   Phase 1 (즉시): 규칙 기반 시스템만
   - 완전 오프라인 동작
   - HTML 빌드 지원 (내부망 사용)
   - 10가지 실험설계 완벽 지원

   Phase 2 (미래): AI 도우미 메뉴에서 LLM 옵션
   - 별도 메뉴로 분리
   - 환경에 따라 활성화/비활성화
   - 온라인: Ollama/클라우드, 오프라인: 규칙만
   ```

### 🛠 MVP 기술 스택 (현실적 접근)
```
Frontend: Next.js + React Tree Components
Logic: 순수 규칙 기반 엔진 (완전 오프라인)
Data: JSON 템플릿 (10가지 실험설계)
Build: Static HTML Export (내부망 지원)
Integration: 통계분석 페이지 완전 연동
AI: 별도 "AI 도우미" 메뉴 (향후 확장용)
```

### 📁 MVP 파일 구조 (확장)
```
/app/(dashboard)/experimental-design/
├── page.tsx                    # 메인 실험설계 페이지
├── components/
│   ├── DecisionTree.tsx       # 트리 기반 단계 선택
│   ├── HybridEngine.tsx       # 규칙+LLM 하이브리드
│   ├── LLMSettings.tsx        # LLM 옵션 설정
│   ├── PowerAnalysis.tsx      # 검정력 곡선 시각화
│   ├── DesignSummary.tsx      # 최종 계획 요약
│   └── PDFExport.tsx          # 계획서 다운로드
└── lib/
    ├── hybrid-classifier.ts    # 하이브리드 분류 엔진
    ├── llm-integration.ts      # Ollama 연동
    ├── decision-tree.ts        # 트리 구조 로직
    ├── advanced-calculator.ts  # 고급 표본크기 계산
    └── templates/
        ├── advanced-designs.json  # 10가지 설계 템플릿
        ├── llm-prompts.json      # LLM 프롬프트 템플릿
        └── decision-flows.json    # 의사결정 트리

/components/layout/header.tsx   # 실험설계 메뉴 추가
```

### ⏱ MVP 개발 일정 (6주)
- **Week 1-2**: 트리 기반 UI + 하이브리드 엔진 기반
- **Week 3**: LLM 통합 (Ollama) + 10가지 설계 템플릿
- **Week 4**: 검정력 분석 + 시각화 컴포넌트
- **Week 5**: 헤더 메뉴 통합 + 통계 페이지 연동
- **Week 6**: PDF 내보내기 + 전체 테스트

---

## 🚀 Phase 2: 고급 실험설계 (2개월)

### 추가 기능
1. **10가지 고급 설계 지원**
   - 2×2 요인설계
   - 혼합설계 (집단간×집단내)
   - 준실험설계
   - 종단연구 설계
   - 단일사례설계

2. **지능형 변수 분석**
   - 독립변수 유형 자동 감지
   - 종속변수 척도 분석
   - 교란변수 통제 제안

3. **고급 표본크기 계산**
   - 효과크기별 세부 계산
   - 검정력 곡선 시각화
   - 다중비교 보정 고려

4. **실험 타당도 검증**
   - 내적 타당도 체크
   - 외적 타당도 평가
   - 구성 타당도 검토

### 📊 데이터 구조 확장
```json
{
  "design_id": "factorial_2x2",
  "complexity_level": "intermediate",
  "variables": {
    "independent": 2,
    "dependent": 1,
    "control": ["age", "gender"]
  },
  "validity_threats": [
    "selection_bias",
    "history_effects"
  ],
  "counterbalancing": true
}
```

---

## 🔬 Phase 3: 연구 생태계 통합 (3개월)

### 확장 기능
1. **연구윤리 가이드**
   - IRB 신청서 템플릿
   - 인폼드 컨센트 샘플
   - 데이터 보안 체크리스트

2. **논문 작성 지원**
   - 방법론 섹션 자동 생성
   - APA 스타일 통계 보고
   - 결과 해석 가이드

3. **연구 품질 평가**
   - 연구 설계 점수화
   - 통계적 검정력 평가
   - 재현 가능성 체크

4. **협업 기능**
   - 연구계획서 공유
   - 동료 검토 시스템
   - 버전 관리

---

## 🎨 사용자 경험 설계

### MVP 사용 플로우
```
1. 홈페이지 → "실험설계 도우미" 버튼 클릭
2. 간단한 3-4개 질문 답변 (2분)
3. 추천 실험설계 + 표본크기 확인
4. 체크리스트 다운로드
5. 해당 통계 분석 페이지로 이동
```

### 고급 기능 플로우
```
1. 연구 주제/가설 자유 입력
2. AI 기반 변수 구조 분석
3. 여러 설계 옵션 비교 제시
4. 상세 연구계획서 생성
5. 윤리 검토 + 논문 템플릿 제공
```

---

## 🔧 구현 전략

### 1. 하이브리드 지능 시스템
```javascript
// 하이브리드 접근법: 규칙 기반 + LLM
async function getExperimentalDesign(userInput, llmEnabled = true) {
  // 1단계: 규칙 기반 빠른 분류
  const ruleResult = classifyByRules(userInput)

  if (ruleResult.confidence > 0.8) {
    return ruleResult // 확신 있으면 바로 반환
  }

  // 2단계: 복잡한 케이스는 LLM 보조
  if (llmEnabled && ruleResult.confidence < 0.6) {
    const llmResult = await consultLLM(userInput, ruleResult)
    return combineResults(ruleResult, llmResult)
  }

  return ruleResult // LLM 비활성화 시 규칙 기반만
}

// LLM 프롬프트 예시
const LLM_PROMPT = `
당신은 실험설계 전문가입니다. 다음 연구에 대해 가장 적절한 실험설계를 JSON으로 제안하세요:

연구: "${userInput}"

응답 형식:
{
  "design_type": "independent_t_test",
  "sample_size": 64,
  "statistical_tests": ["독립표본 t-검정", "Mann-Whitney U"],
  "assumptions": ["정규성", "등분산성", "독립성"],
  "key_steps": ["무작위 배정", "맹검법 적용"],
  "confidence": 0.9,
  "reasoning": "두 독립 집단 비교이므로..."
}
`
```

### 2. 확장 가능한 템플릿 시스템
```json
{
  "templates": {
    "independent_ttest": {
      "name": "독립표본 t-검정 설계",
      "sample_size_formula": "cohen_d_independent",
      "assumptions": ["normality", "homogeneity", "independence"],
      "statistical_tests": ["independent_t", "mann_whitney"],
      "checklist": ["randomization", "equal_groups", "blinding"]
    }
  }
}
```

### 3. 기존 시스템과의 연동
- 표본크기 계산 → Power Analysis 페이지 연결
- t-검정 설계 → T-test 페이지 직접 이동
- 체크리스트 → PDF 다운로드 기능

---

## 📈 성공 지표

### MVP 성공 기준
- [ ] 5가지 기본 설계 100% 정확 분류
- [ ] 표본크기 계산 R/SPSS와 일치 (±5%)
- [ ] 사용자 플로우 완료율 >80%
- [ ] 기존 통계 페이지 연동 100%

### Phase 2 목표
- [ ] 15가지 설계 지원 (MVP 5개 + 10개)
- [ ] 복잡한 설계도 90% 정확도 달성
- [ ] 연구자 만족도 4.5/5.0 이상

### Phase 3 비전
- [ ] 국내 연구자 1,000명 이상 사용
- [ ] 논문 인용 사례 10건 이상
- [ ] 대학 연구방법론 강의 도입

---

## 🎯 차별화 포인트

### 기존 도구 대비 장점
1. **통합 솔루션**: 설계부터 분석까지 원스톱
2. **한국어 지원**: 국내 연구 환경에 최적화
3. **무료 제공**: 접근성 극대화
4. **실시간 계산**: 웹 기반 즉시 결과
5. **교육적 가치**: 각 단계별 설명 제공

### 기술적 혁신
- **규칙 기반 + 패턴 매칭**: LLM 없이도 높은 정확도
- **모듈식 설계**: 새로운 실험 유형 쉽게 추가
- **기존 시스템 연동**: 끊김 없는 사용자 경험

---

## 💡 구현 우선순위

### 🚦 MVP 필수 기능 (P0)
1. 5가지 기본 분류 엔진
2. Cohen's d 표본크기 계산
3. 기본 체크리스트 제공
4. 통계 페이지 연동

### 🔥 Phase 2 핵심 (P1)
1. 요인설계 지원
2. 효과크기 시각화
3. 타당도 검증 도구

### ⭐ Phase 3 확장 (P2)
1. 연구윤리 모듈
2. 논문 작성 지원
3. 협업 기능

---

**다음 단계**: MVP 상세 설계서 작성 및 개발 착수

*작성일: 2025-09-25*
*예상 완료: MVP 4주, 전체 9개월*
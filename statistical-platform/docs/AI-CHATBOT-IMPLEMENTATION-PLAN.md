# AI 챗봇 구현 계획서

**작성일**: 2025-11-02
**목적**: 실험설계 페이지를 AI 챗봇으로 완전 대체
**기대 효과**: 사용자 편의성 향상, 코드 유지보수 부담 감소, 기능 확장성 증대

---

## 📊 개요

### 목표
기존의 복잡한 5단계 폼 방식의 실험설계 페이지를 제거하고, 대화형 AI 챗봇으로 대체하여 다음을 제공:
- 실험설계 가이드 (기존 기능)
- 통계 분석 방법 추천 (신규)
- Python/R 코드 자동 생성 (신규)
- 데이터셋 업로드 및 분석 (신규)

### 현재 상태
- ✅ RAG 시스템 완성 (Ollama + SQLite Vector DB)
- ✅ 111개 통계 문서 임베딩 완료
- ✅ 테스트 페이지 (`/rag-test`) 구현 완료
- ❌ 실험설계 페이지는 "준비중" 상태 (제거 예정)

---

## 🎯 제거 대상

### 파일 목록
```
statistical-platform/
├── app/(dashboard)/experimental-design/
│   └── page.tsx                                (1,090줄 - 메인 페이지)
├── lib/experimental-design/
│   └── config.ts                               (586줄 - 15개 설계 정의)
├── __tests__/pages/
│   └── experimental-design.test.tsx            (테스트 파일)
└── out/experimental-design/                    (빌드 산출물)
```

**총 제거**: ~1,700줄

### 의존성 분석
- ✅ **완전 독립 모듈**: 다른 코드와 의존성 없음
- ✅ **네비게이션만 수정 필요**: `header.tsx`, `page.tsx`
- ✅ **안전한 제거**: 준비중 상태로 사용자 영향 없음

### 보존할 정보
- 15개 실험설계 정의 (`config.ts`) → RAG 문서로 변환 필요
- 각 설계당 포함 정보:
  - 이름, 설명
  - 샘플 크기 계산 방법
  - 추천 통계 테스트
  - 가정 사항
  - 예시 연구

---

## 🎨 UI/UX 설계

### 레이아웃: 3-Column 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "AI 통계 도우미"                    [모델: qwen3:4b ▼] │
├──────────┬────────────────────────────────┬──────────────────────┤
│          │                                │                      │
│ 대화     │                                │  컨텍스트            │
│ 히스토리 │         메인 채팅 영역          │  패널                │
│  (25%)   │           (50%)                │   (25%)              │
│          │                                │                      │
│ ┌──────┐ │  ┌─────────────────────────┐  │ ┌──────────────────┐ │
│ │세션1 │ │  │ Welcome Screen          │  │ │ 모델 설정        │ │
│ │신약  │ │  │                         │  │ │ ┌──────────────┐ │ │
│ │효과  │ │  │  6개 카테고리 버튼      │  │ │ │qwen3:4b ✓   │ │ │
│ └──────┘ │  │                         │  │ │ │deepseek-r1   │ │ │
│ ┌──────┐ │  │  🎯 분석 방법 추천      │  │ │ │gemma3:4b     │ │ │
│ │세션2 │ │  │  🔬 실험설계            │  │ │ └──────────────┘ │ │
│ │t-test│ │  │  ✅ 가정 검증           │  │ └──────────────────┘ │
│ │비교  │ │  │  📊 결과 해석           │  │                      │
│ └──────┘ │  │  💻 코드 생성           │  │ ┌──────────────────┐ │
│          │  │  🔧 에러 해결           │  │ │ 참조 문서        │ │
│ [+ 새대화]│  │                         │  │ │ • scipy.ttest   │ │
│          │  └─────────────────────────┘  │ │ • anova.py      │ │
│          │                                │ │ • chi_square.py │ │
│          │  ┌─────────────────────────┐  │ └──────────────────┘ │
│          │  │ 🤖 AI:                  │  │                      │
│          │  │ 독립표본 t-검정을       │  │ ┌──────────────────┐ │
│          │  │ 추천합니다... ⏳        │  │ │ 빠른 액션        │ │
│          │  └─────────────────────────┘  │ │ [분석 시작하기]  │ │
│          │  ┌─────────────────────────┐  │ │ [코드 복사]      │ │
│          │  │ 👤 사용자:              │  │ │ [예제 보기]      │ │
│          │  │ 두 그룹 비교하려면?     │  │ └──────────────────┘ │
│          │  └─────────────────────────┘  │                      │
│          │                                │                      │
│          │  ┌─────────────────────────┐  │                      │
│          │  │ 📎 [파일 업로드]        │  │                      │
│          │  │ 💬 메시지 입력... [전송]│  │                      │
│          │  └─────────────────────────┘  │                      │
└──────────┴────────────────────────────────┴──────────────────────┘
```

### 주요 컴포넌트

```
components/ai-assistant/
├── chat-interface.tsx              (메인 채팅 UI)
├── session-sidebar.tsx             (대화 히스토리)
├── welcome-screen.tsx              (예시 프롬프트)
├── message-list.tsx                (메시지 목록)
├── input-area.tsx                  (입력창 + 파일 업로드)
├── context-panel.tsx               (우측 패널)
├── streaming-response.tsx          (실시간 타이핑)
└── code-block.tsx                  (코드 하이라이팅)
```

---

## ✨ 핵심 기능

### 1. Welcome Screen (첫 방문 시)

**6개 카테고리 × 3개 예시 = 18개 버튼**

```typescript
const EXAMPLE_PROMPTS = [
  {
    icon: '🎯',
    title: '분석 방법 추천',
    color: 'blue',
    prompts: [
      '두 그룹의 평균을 비교하려면?',
      '세 그룹 이상 비교는 어떻게?',
      '변수 간 관계를 알고 싶어요'
    ]
  },
  {
    icon: '🔬',
    title: '실험설계',
    color: 'purple',
    prompts: [
      '신약 효과 연구는 어떻게 설계하나요?',
      '반복 측정 실험 설계 방법',
      '필요한 샘플 크기를 계산해주세요'
    ]
  },
  {
    icon: '✅',
    title: '가정 검증',
    color: 'green',
    prompts: [
      '정규성 검정은 어떻게 하나요?',
      '등분산성을 확인하려면?',
      '이상치를 찾는 방법'
    ]
  },
  {
    icon: '📊',
    title: '결과 해석',
    color: 'orange',
    prompts: [
      'p-value가 0.032인데 무슨 의미인가요?',
      '효과 크기는 어떻게 해석하나요?',
      '신뢰구간의 의미를 설명해주세요'
    ]
  },
  {
    icon: '💻',
    title: '코드 생성',
    color: 'pink',
    prompts: [
      't-test Python 코드를 만들어주세요',
      'ANOVA R 코드가 필요해요',
      '시각화 코드를 생성해주세요'
    ]
  },
  {
    icon: '🔧',
    title: '에러 해결',
    color: 'red',
    prompts: [
      '등분산 가정이 위반되었어요',
      '정규성 검정에서 실패했어요',
      '샘플 크기가 너무 작아요'
    ]
  }
]
```

**UI 동작**:
- Grid 레이아웃 (3×2 또는 2×3)
- 버튼 클릭 → 입력창에 자동 입력 + 전송
- 첫 메시지 전송 후 Welcome Screen 숨김

---

### 2. 스트리밍 응답 (실시간 타이핑)

**구현 방법**:
```typescript
// lib/rag/providers/ollama-provider.ts
async function* streamResponse(prompt: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3:4b',
      prompt: prompt,
      stream: true  // 스트리밍 활성화
    })
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim())

    for (const line of lines) {
      const json = JSON.parse(line)
      yield json.response // 단어별 반환
    }
  }
}
```

**사용자 경험**:
- ⏳ "AI가 생각하고 있어요..." → 즉시 응답 시작
- 💬 단어 하나씩 타이핑 (ChatGPT 스타일)
- ✅ 완료 시 [코드 복사] [분석 시작] 버튼 표시

---

### 3. 파일 업로드 (데이터셋 분석)

**지원 형식**: CSV, Excel (xlsx)

**구현 방법**:
```typescript
// components/ai-assistant/file-uploader.tsx
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'

export function FileUploader({ onAnalyze }: Props) {
  const onDrop = async (files: File[]) => {
    const file = files[0]

    // 1. CSV 파싱
    Papa.parse(file, {
      complete: async (results) => {
        const data = results.data

        // 2. 데이터 구조 분석
        const schema = analyzeDataStructure(data)

        // 3. AI에게 전달
        const recommendation = await queryRAG({
          query: `
            이 데이터에 적합한 통계 방법을 추천해주세요:

            컬럼: ${schema.columns.join(', ')}
            타입: ${schema.types.join(', ')}
            샘플 크기: ${schema.rowCount}
            결측치: ${schema.missingCount}
          `
        })

        onAnalyze(recommendation)
      }
    })
  }

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  return (
    <div {...getRootProps()} className="border-2 border-dashed p-8">
      <input {...getInputProps()} />
      <p>📎 CSV/Excel 파일을 끌어다 놓으세요</p>
    </div>
  )
}
```

**출력 예시**:
```
📊 데이터 분석 결과

✅ 검출된 변수:
  - group (범주형): A, B (각 30개)
  - value (연속형): 평균=52.3, SD=8.1

🎯 추천 통계 방법:
  1. 독립표본 t-검정 (두 그룹 비교)
  2. 정규성 검정 (Shapiro-Wilk)
  3. 등분산성 검정 (Levene)

📝 다음 단계:
  [t-test 실행하기] [정규성 먼저 확인]
```

---

### 4. 대화 히스토리 (LocalStorage)

**세션 구조**:
```typescript
interface ChatSession {
  id: string                    // UUID
  title: string                 // "신약 효과 연구 설계"
  messages: Message[]           // 대화 내역
  created: Date                 // 생성 시간
  updated: Date                 // 마지막 수정
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]            // 참조 문서 (AI만)
}
```

**저장/로드**:
```typescript
// lib/ai-assistant/storage.ts
export class ChatStorage {
  saveSession(session: ChatSession): void {
    localStorage.setItem(
      `chat-session-${session.id}`,
      JSON.stringify(session)
    )
  }

  loadSessions(): ChatSession[] {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('chat-session-'))

    return keys.map(key =>
      JSON.parse(localStorage.getItem(key) ?? '{}')
    ).sort((a, b) =>
      new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  }

  deleteSession(id: string): void {
    localStorage.removeItem(`chat-session-${id}`)
  }
}
```

**좌측 사이드바 UI**:
```typescript
// components/ai-assistant/session-sidebar.tsx
export function SessionSidebar() {
  const sessions = loadSessions()

  return (
    <div className="w-64 border-r p-4">
      <Button onClick={createNewSession}>
        + 새 대화
      </Button>

      <div className="mt-4 space-y-2">
        {sessions.map(session => (
          <SessionCard
            key={session.id}
            title={session.title}
            preview={session.messages[0]?.content.slice(0, 50)}
            onClick={() => loadSession(session.id)}
            onDelete={() => deleteSession(session.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

---

### 5. 실험설계 안내 (기존 페이지 대체!)

**프롬프트 엔지니어링**:

```typescript
// lib/ai-assistant/prompts/experimental-design.ts
export const DESIGN_GUIDE_SYSTEM_PROMPT = `
당신은 실험설계 전문가입니다.
사용자가 실험설계를 요청하면 다음 5단계로 안내하세요:

📋 Step 1: 연구 질문 명확화
  질문: "무엇을 비교하거나 측정하고 싶으신가요?"
  분류: 집단 비교 / 시간 변화 / 변수 관계 / 기술 통계

📋 Step 2: 변수 정의
  - 독립변수 (조작하는 변수): 예) 약물 종류, 운동 여부
  - 종속변수 (측정하는 변수): 예) 혈압, 체중, 점수
  - 통제변수 (일정하게 유지): 예) 나이, 성별, 환경

📋 Step 3: 샘플 크기 계산
  - 검정력(1-β): 0.8 이상 권장
  - 유의수준(α): 0.05 (관례)
  - 효과 크기: 작음(0.2) / 중간(0.5) / 큼(0.8)
  - G*Power 계산기 링크 제공

📋 Step 4: 실험설계 추천
  15가지 설계 타입 중 선택:
  ${JSON.stringify(EXPERIMENTAL_DESIGNS_CONFIG)}

  매칭 규칙:
  - 두 그룹 비교 + 독립 → 독립표본 설계
  - 두 그룹 비교 + 종속 → 대응표본 설계
  - 세 그룹 이상 + 독립 → 완전무선설계
  - 시간 변화 측정 → 반복측정 설계

📋 Step 5: 통계 분석 계획
  1. 사전 검정 (가정 확인)
     - 정규성: Shapiro-Wilk / Kolmogorov-Smirnov
     - 등분산성: Levene / Bartlett
     - 이상치: Box Plot / Z-score

  2. 주 분석 (가설 검정)
     - 독립표본: Independent t-test / Mann-Whitney U
     - 대응표본: Paired t-test / Wilcoxon signed-rank
     - 다중 비교: ANOVA / Kruskal-Wallis

  3. 사후 검정 (유의미한 경우)
     - Tukey HSD / Bonferroni / Scheffe

  4. 효과 크기 계산
     - Cohen's d / Eta-squared / R-squared

  [분석 시작하기] 버튼 제공 (해당 통계 페이지로 이동)

중요: 각 단계는 사용자 응답을 기다린 후 진행하세요.
`
```

**대화 예시**:

```
사용자: "신약 효과를 테스트하려고 하는데 어떻게 설계해야 하나요?"

AI:
신약 효과 연구를 도와드리겠습니다! 🔬

📋 Step 1: 연구 질문 확인
  목표: 신약이 위약(플라시보)보다 효과적인지 비교
  설계 유형: 두 그룹 비교 (신약 vs 위약)

먼저 몇 가지 질문이 있습니다:

1. 어떤 질환이나 증상을 치료하는 신약인가요?
2. 효과를 어떻게 측정할 예정인가요? (예: 증상 점수, 혈압, 회복 시간 등)
3. 같은 환자를 반복 측정하나요, 아니면 다른 환자들을 비교하나요?

---

사용자: "고혈압 치료제이고, 혈압 수치로 측정하고, 서로 다른 환자 그룹이에요."

AI:
완벽합니다! 이제 설계를 진행하겠습니다.

📋 Step 2: 변수 정의
  - 독립변수: 약물 종류 (신약 / 위약)
  - 종속변수: 혈압 수치 (mmHg, 연속형)
  - 통제변수 권장:
    • 나이 (고혈압은 연령 영향 큼)
    • 성별
    • 기저 혈압 수치
    • 생활 습관 (운동, 식이)

📋 Step 3: 샘플 크기 계산
  가정:
  - 효과 크기: 중간(d=0.5) 가정
  - 검정력: 0.8 (80%)
  - 유의수준: 0.05 (양측)

  → 각 그룹 64명 필요 (총 128명)

  💡 Tip: 탈락률 20% 고려 시 각 그룹 80명 권장

  [G*Power로 재계산하기]

📋 Step 4: 추천 설계
  ✅ **무작위 대조 시험 (Randomized Controlled Trial, RCT)**

  설계 방법:
  1. 참가자 모집 (포함/제외 기준 명확히)
  2. 기저선 측정 (사전 혈압)
  3. 무작위 배정 (1:1 비율, 층화 무작위 배정 권장)
     - 층화 기준: 나이(50세 기준), 성별
  4. 이중맹검 적용
     - 환자도, 측정자도 어떤 약인지 모르게
  5. 개입 기간 (예: 8주)
  6. 사후 측정 (혈압 변화)

📋 Step 5: 통계 분석 계획

1️⃣ 사전 검정
   - 정규성: Shapiro-Wilk 검정
     • H0: 혈압 수치가 정규분포를 따른다
     • p > 0.05이면 가정 충족

   - 등분산성: Levene 검정
     • H0: 두 그룹의 분산이 같다
     • p > 0.05이면 가정 충족

   [정규성 검정 실행] [등분산 검정 실행]

2️⃣ 주 분석
   - 정규성 + 등분산 충족 시:
     ✅ **독립표본 t-검정** (Independent t-test)

   - 정규성 충족, 등분산 위반 시:
     ⚠️ Welch's t-test

   - 정규성 위반 시:
     ⚠️ Mann-Whitney U 검정 (비모수)

   [t-test 실행하기]

3️⃣ 효과 크기
   - Cohen's d 계산
     • d < 0.2: 작음
     • 0.2 ≤ d < 0.8: 중간
     • d ≥ 0.8: 큼

   - 임상적 의미 평가
     • 통계적 유의성 ≠ 임상적 유의성
     • 혈압 10mmHg 이상 차이가 임상적으로 의미 있음

4️⃣ 결과 보고
   - 기술 통계 (평균 ± 표준편차)
   - 검정 통계량 (t, df, p-value)
   - 효과 크기 (Cohen's d, 95% CI)
   - 그래프 (Box Plot, Bar Chart with Error Bars)

📝 다음 단계를 선택하세요:
  [t-test 지금 실행] [샘플 크기 재계산] [Python 코드 생성]

참고 문서:
  - RCT 설계 가이드 (config.ts)
  - 검정력 분석 방법 (power-analysis.txt)
  - 독립표본 t-검정 (scipy.stats.ttest_ind)
```

---

### 6. 코드 생성 기능

**지원 언어**: Python (SciPy, statsmodels), R

**구현 방법**:
```typescript
// lib/ai-assistant/code-generator.ts
export async function generateStatisticalCode(
  method: string,
  language: 'python' | 'r',
  dataStructure?: DataSchema
): Promise<string> {
  const prompt = `
    Generate ${language} code for ${method}.

    ${dataStructure ? `
    Data structure:
    - Columns: ${dataStructure.columns.join(', ')}
    - Types: ${dataStructure.types.join(', ')}
    - Sample size: ${dataStructure.rowCount}
    ` : ''}

    Include:
    1. Data loading (from CSV)
    2. Data exploration (descriptive statistics)
    3. Assumption checks (normality, homogeneity)
    4. Main analysis (${method})
    5. Visualization (plots)
    6. Results interpretation

    Use libraries:
    - Python: pandas, scipy, statsmodels, matplotlib
    - R: tidyverse, stats, ggplot2
  `

  return await queryRAG({ query: prompt })
}
```

**출력 예시** (Python):

```python
# t-test 분석 코드

import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

# 1. 데이터 불러오기
df = pd.read_csv('data.csv')

# 2. 데이터 탐색
print(df.groupby('group')['value'].describe())

# 3. 정규성 검정
group_a = df[df['group'] == 'A']['value']
group_b = df[df['group'] == 'B']['value']

stat_a, p_a = stats.shapiro(group_a)
stat_b, p_b = stats.shapiro(group_b)
print(f"Group A 정규성: p={p_a:.4f}")
print(f"Group B 정규성: p={p_b:.4f}")

# 4. 등분산성 검정
stat_lev, p_lev = stats.levene(group_a, group_b)
print(f"등분산성: p={p_lev:.4f}")

# 5. t-검정
t_stat, p_value = stats.ttest_ind(group_a, group_b)
print(f"\nt-test 결과:")
print(f"  t = {t_stat:.3f}")
print(f"  p = {p_value:.4f}")

# 6. 효과 크기 (Cohen's d)
mean_diff = group_a.mean() - group_b.mean()
pooled_std = ((group_a.std()**2 + group_b.std()**2) / 2)**0.5
cohens_d = mean_diff / pooled_std
print(f"  Cohen's d = {cohens_d:.3f}")

# 7. 시각화
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# Box Plot
axes[0].boxplot([group_a, group_b], labels=['A', 'B'])
axes[0].set_title('Box Plot')
axes[0].set_ylabel('Value')

# Bar Chart with Error Bars
means = [group_a.mean(), group_b.mean()]
sems = [group_a.sem(), group_b.sem()]
axes[1].bar(['A', 'B'], means, yerr=sems, capsize=5)
axes[1].set_title('Mean ± SEM')
axes[1].set_ylabel('Value')

plt.tight_layout()
plt.show()
```

---

## 🛠️ 기술 스택

### 현재 사용 중 (재사용)

| 항목 | 기술 | 상태 |
|------|------|------|
| **LLM** | Ollama (qwen3:4b, deepseek-r1:7b) | ✅ 구축 완료 |
| **Embedding** | mxbai-embed-large | ✅ 111개 문서 임베딩 |
| **Vector DB** | SQLite + FTS5 | ✅ 하이브리드 검색 |
| **UI Framework** | Next.js 15 + shadcn/ui | ✅ 현재 사용 중 |
| **Markdown** | react-markdown + rehype-katex | ✅ 수식 지원 |

### 신규 추가 필요

| 항목 | 라이브러리 | 용도 |
|------|----------|------|
| **파일 업로드** | react-dropzone | 드래그 앤 드롭 |
| **CSV 파싱** | papaparse | CSV → JSON |
| **코드 하이라이팅** | prism-react-renderer | Python/R 색상 |

**설치 명령어**:
```bash
npm install react-dropzone papaparse prism-react-renderer
npm install -D @types/papaparse
```

---

## 📂 디렉토리 구조

### 신규 생성

```
statistical-platform/
├── app/(dashboard)/ai-assistant/
│   └── page.tsx                                (메인 페이지)
│
├── components/ai-assistant/
│   ├── chat-interface.tsx                      (메인 채팅 UI)
│   ├── session-sidebar.tsx                     (대화 히스토리)
│   ├── welcome-screen.tsx                      (예시 프롬프트)
│   ├── message-list.tsx                        (메시지 목록)
│   ├── input-area.tsx                          (입력창)
│   ├── file-uploader.tsx                       (파일 업로드)
│   ├── context-panel.tsx                       (우측 패널)
│   ├── streaming-response.tsx                  (스트리밍)
│   └── code-block.tsx                          (코드 하이라이팅)
│
├── lib/ai-assistant/
│   ├── storage.ts                              (LocalStorage)
│   ├── code-generator.ts                       (코드 생성)
│   ├── data-analyzer.ts                        (데이터 분석)
│   └── prompts/
│       ├── experimental-design.ts              (실험설계 프롬프트)
│       ├── code-generation.ts                  (코드 생성 프롬프트)
│       └── analysis-recommendation.ts          (분석 추천 프롬프트)
│
└── rag-system/data/experimental-designs/       (신규 RAG 문서)
    ├── 01-independent-groups.txt               (독립표본 설계)
    ├── 02-paired-samples.txt                   (대응표본 설계)
    ├── 03-repeated-measures.txt                (반복측정 설계)
    └── ... (15개 파일)
```

---

## 📅 구현 일정

### Phase 1: 제거 및 준비 (1일)

#### Day 1
- [ ] 실험설계 페이지 제거
  - `app/(dashboard)/experimental-design/page.tsx`
  - `lib/experimental-design/config.ts`
  - `__tests__/pages/experimental-design.test.tsx`
- [ ] 네비게이션 업데이트
  - `header.tsx`: "실험설계" 메뉴 제거 또는 "AI 도우미"로 변경
  - `page.tsx`: 실험설계 카드 제거 또는 AI 챗봇 링크로 변경
- [ ] 15개 실험설계 정의 → RAG 문서 변환
  - `config.ts` 내용 → 15개 txt 파일
  - Vector Store 재빌드
- [ ] TypeScript 컴파일 확인
  - `npx tsc --noEmit` (0 에러 목표)

---

### Phase 2: 챗봇 UI 구현 (3일)

#### Day 1: 레이아웃 + 기본 컴포넌트
- [ ] 메인 페이지 생성
  - `app/(dashboard)/ai-assistant/page.tsx`
  - 3-Column 레이아웃
- [ ] SessionSidebar 구현
  - 세션 목록 표시
  - 새 대화 버튼
  - 세션 삭제 기능
- [ ] ChatInterface 구현
  - 메시지 목록 영역
  - 입력창 영역
- [ ] ContextPanel 구현
  - 모델 선택 드롭다운
  - 참조 문서 표시

#### Day 2: Welcome Screen + 예시 프롬프트
- [ ] WelcomeScreen 컴포넌트
  - 6개 카테고리 정의
  - 18개 예시 버튼
  - Grid 레이아웃 (3×2)
- [ ] 버튼 클릭 핸들러
  - 입력창에 자동 입력
  - 자동 전송
- [ ] 조건부 렌더링
  - 첫 방문 시: Welcome Screen
  - 메시지 있을 시: 숨김

#### Day 3: 입력 영역 + UI 폴리시
- [ ] InputArea 구성
  - Textarea (자동 높이 조절)
  - 전송 버튼
  - 단축키 (Enter, Shift+Enter)
- [ ] 파일 업로드 버튼
  - 아이콘 버튼 (📎)
  - 모달 또는 드롭다운
- [ ] 반응형 디자인
  - 모바일: 1-Column
  - 태블릿: 2-Column
  - 데스크탑: 3-Column

---

### Phase 3: 통계 특화 기능 (5일)

#### Day 1: 스트리밍 응답
- [ ] Ollama 스트리밍 구현
  - `/api/generate` 엔드포인트
  - ReadableStream 파싱
- [ ] StreamingResponse 컴포넌트
  - 단어별 타이핑 애니메이션
  - 커서 깜빡임 효과
- [ ] 로딩 인디케이터
  - "AI가 생각하고 있어요..." 메시지
  - Spinner 아이콘

#### Day 2: 파일 업로드 + 데이터 분석
- [ ] FileUploader 컴포넌트
  - react-dropzone 통합
  - 드래그 앤 드롭 UI
- [ ] CSV 파싱
  - papaparse 라이브러리
  - 에러 처리
- [ ] 데이터 구조 분석
  - 컬럼 타입 감지 (범주형/연속형)
  - 결측치 카운트
  - 이상치 탐지
- [ ] AI 추천
  - 분석 방법 추천 프롬프트
  - 결과 포맷팅

#### Day 3: 실험설계 안내 시스템
- [ ] 프롬프트 엔지니어링
  - `experimental-design.ts` 작성
  - 5단계 가이드 템플릿
  - 15개 설계 정보 통합
- [ ] 대화 흐름 관리
  - 단계별 질문/응답
  - 컨텍스트 유지
- [ ] 빠른 액션 버튼
  - [분석 시작하기] → 통계 페이지 이동
  - [샘플 크기 계산]
  - [예제 보기]

#### Day 4: 코드 생성 기능
- [ ] CodeGenerator 구현
  - `code-generator.ts`
  - Python/R 템플릿
- [ ] 프롬프트 엔지니어링
  - 데이터 구조 기반 코드 생성
  - 라이브러리 선택 (SciPy, statsmodels)
- [ ] CodeBlock 컴포넌트
  - prism-react-renderer 통합
  - 언어별 색상 (Python, R)
  - 복사 버튼
  - 다운로드 버튼

#### Day 5: 세션 관리
- [ ] ChatStorage 클래스
  - LocalStorage CRUD
  - 세션 목록 로드
  - 정렬 (최신순)
- [ ] SessionSidebar 연결
  - 세션 클릭 → 로드
  - 세션 삭제 확인 모달
- [ ] 세션 자동 저장
  - 메시지 전송 시 자동 저장
  - 제목 자동 생성 (첫 메시지 요약)

---

### Phase 4: 최적화 + 테스트 (2일)

#### Day 1: 성능 최적화
- [ ] 코드 하이라이팅 최적화
  - 언어 감지 자동화
  - 테마 적용 (VS Code Dark)
- [ ] 참조 문서 링크
  - 문서 제목 → 클릭 시 상세 보기
  - 우측 패널에 미리보기
- [ ] 응답 속도 개선
  - RAG 검색 캐싱
  - 임베딩 재사용
  - 목표: 검색 50ms + LLM 2-3초

#### Day 2: 통합 테스트
- [ ] 18개 예시 프롬프트 테스트
  - 각 카테고리별 3개 × 6 = 18개
  - 응답 품질 평가
  - 참조 문서 정확도
- [ ] 파일 업로드 시나리오
  - CSV 샘플 파일 (t-test, ANOVA)
  - 에러 처리 (잘못된 형식)
  - 대용량 파일 (>10MB)
- [ ] 실험설계 가이드 정확도
  - 5단계 흐름 테스트
  - 15개 설계 추천 정확도
  - 통계 페이지 연결
- [ ] 브라우저 테스트
  - Chrome (최신)
  - Firefox (최신)
  - Edge (최신)
- [ ] 성능 테스트
  - 응답 시간 측정
  - LocalStorage 용량 확인 (5MB 제한)

---

## 🎯 성공 지표

### 사용자 경험
- [ ] 진입 장벽: "무엇을 해야 할지 모르겠어요" → "AI가 물어봐주니까 쉬워요"
- [ ] 응답 시간: 평균 3초 이내 (검색 50ms + LLM 2-3초)
- [ ] 정확도: 18개 예시 프롬프트 중 90% 이상 만족스러운 응답

### 기술적 목표
- [ ] 코드 감소: 1,700줄 제거 (실험설계 페이지)
- [ ] TypeScript 에러: 0개 (core 컴포넌트)
- [ ] 테스트 커버리지: 80% 이상 (핵심 로직)

### 비즈니스 가치
- [ ] 차별화: SPSS/R Studio에 없는 AI 도우미
- [ ] 확장성: 새 통계 방법 추가 = RAG 문서만 추가
- [ ] 비용: $0 (Ollama 로컬 실행)

---

## 🚧 향후 확장 계획

### Phase 5: 고급 기능 (선택)
- [ ] GPT-4 연동 옵션 (더 정확한 응답)
- [ ] 다국어 지원 (영어, 한국어)
- [ ] 음성 입력/출력 (Web Speech API)
- [ ] 협업 기능 (세션 공유)

### Phase 6: 데이터 분석 자동화
- [ ] 탐색적 데이터 분석 (EDA) 자동 보고서
- [ ] 시각화 자동 생성 (Chart.js 통합)
- [ ] 이상치 자동 탐지 및 제거 제안

### Phase 7: 학습 자료
- [ ] 통계 개념 설명 (초보자용)
- [ ] 연습 문제 생성
- [ ] 케이스 스터디 (실제 연구 사례)

---

## 📚 참고 자료

### 내부 문서
- [CLAUDE.md](../CLAUDE.md) - AI 코딩 규칙
- [AI-CODING-RULES.md](AI-CODING-RULES.md) - TypeScript 타입 안전성
- [STATISTICS_PAGE_CODING_STANDARDS.md](STATISTICS_PAGE_CODING_STANDARDS.md) - 코딩 표준
- [TROUBLESHOOTING_ISANALYZING_BUG.md](TROUBLESHOOTING_ISANALYZING_BUG.md) - 버그 예방

### 외부 참조
- [Ollama API 문서](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [react-dropzone 문서](https://react-dropzone.js.org/)
- [papaparse 문서](https://www.papaparse.com/)
- [prism-react-renderer 문서](https://github.com/FormidableLabs/prism-react-renderer)

---

**작성자**: Claude (AI Assistant)
**최종 수정**: 2025-11-02
**버전**: 1.0
**상태**: 계획 단계

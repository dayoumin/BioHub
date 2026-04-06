# BioHub AI 프롬프트 설계 및 검증 체계 (Prompt Registry Plan)

> **상태**: 기획 단계 (Draft)  
> **목적**: 거대한 단일 프롬프트를 탈피하고, [ARIS](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)의 다중 에이전트/모듈형 설계를 벤치마킹하여 BioHub용 조립식 프롬프트 라이브러리를 구축함.

---

## 1. 개요: 단일 프롬프트의 한계
현재 통계, 그래프, 논문 조립 기능을 SOTA LLM(또는 자체 서비스)으로 전달하여 문서를 생성할 때, 하나의 거대한 프롬프트에 모든 제약사항을 우겨넣으면 다음과 같은 문제가 발생합니다.
- **환각(Hallucination) 증가**: 지시사항 간 충돌로 인해 중요한 팩트(JSON 데이터)를 지어냄.
- **확장성 부족**: '생태학 보고서'와 '유전학 저널' 등 출력물 요구사항이 다를 때마다 코드를 수정해야 함.
- **자체 검증 불가**: 자신이 만든 글의 논리 오류나 숫자 틀림을 제대로 찾아내지 못함.

---

## 2. 해결책: 3-Layer 조립식 프롬프트 체계

`ai/prompts/` 내부에 프롬프트를 3가지 명확한 역할로 나누어 파일 단위로 사전 구축(Registry)해 둡니다. 실행 시 사용자의 선택에 맞춰 3개의 파츠를 조립하여 최종 시스템 프롬프트를 생성합니다.

### Layer 1. 생성 프롬프트 (Generation Prompts) — `분야별/섹션별`
단일 모델이 도맡던 생성을 잘게 쪼갭니다.
- `gen_methods.md`: 실험/연구 방법에 대한 철저한 재현성, 활용된 통계 기법 위주로 작성 지시.
- `gen_results.md`: 입력된 JSON 수치(p-value, test_stat)의 절대 변경 금지, 시각적 표 위치 지정 위주 지시.
- `gen_abstract.md`: 단어 수 제한 및 핵심 결론 요약 특화.

### Layer 2. 포맷 프롬프트 (Style & Compliance Prompts) — `타겟별`
생성될 텍스트의 Tone & Manner를 부여합니다.
- `style_ieee_journal.md`: IEEE 등 엄격한 국제 학술지 규격, APA 인용 기준 강제.
- `style_field_report.md`: 실무 현장 보고용 구어체/개조식 혼용, 빠른 결론 위주.
- `style_korean_academy.md`: 국내 학회용 KCI 기반 규격 적용.

### Layer 3. 심사/검증 프롬프트 (Reviewer Prompts) — `방어 및 신뢰성`
ARIS 프로젝트의 "Cross-Model Review" 방식을 본떠 생성 모델이 아닌 다른 모델 또는 분리된 맥락에게 검증을 맡깁니다.
- `review_factcheck.md`: 원본 데이터 수치와 작성된 글 내 수치 100% 대조 전용 봇.
- `review_stats_validity.md`: 비모수 검정 요건 무시 등 오류 지적 기능.
- `review_hallucination.md`: '완벽한 인과관계' 등 과잉 해석/비약 모니터링 기능.

---

## 3. 디렉토리 구조 최적화 (Target)

향후 BioHub 저장소 내에 다음과 같이 구성합니다.

```text
d:/Projects/BioHub/ai/
  ├── PLAN.md                    # 기존 AI Roadmap
  ├── PROMPT_REGISTRY_PLAN.md    # 현재 이 문서
  └── prompts/                   # 프롬프트 저장소 (디렉토리 신설 시)
       ├── 01_generation/
       │    ├── methods_ecology.md
       │    └── results_stats.md
       ├── 02_styles/
       │    ├── academic_journal.md
       │    └── project_report.md
       └── 03_reviewers/
            ├── fact_checker.md
            └── methodology_critique.md
```

---

## 4. 다중 에이전트 자동 검증(Review Loop) 파이프라인

프롬프트를 나누어 놓기만 해서는 안 되며, 파이프라인 상에서 이 프롬프트들이 호출되는 **검증 루프**가 필요합니다.

1. **[조립 단계]**: `gen_results` + `academic_journal` 기반으로 기본 모델(예: Gemini Flash)이 **초안(Draft)**을 작성함.
2. **[검증 단계]**: `review_factcheck` 역할을 부여받은 **독립된 모델(Reviewer LLM)**이 초안과 원본 JSON을 비교하여 **에러 레포트(`Review_Feedbacks`)** 생성.
3. **[수정 단계]**: 기본 모델이 에러 레포트를 반영해 초안을 수정(Refine). (최대 2~3회 반복, ARIS의 *Stress Test* 개념 차용)
4. **[승인 단계]**: Reviewer LLM이 최종 통과를 내리면 사용자 화면에 노출 (또는 HWPX/DOCX로 패키징).

---

## 5. Phase 0: 사전 조사 — 먼저 찾고, 그 다음에 만든다

> **원칙**: 프롬프트를 직접 만들기 전에, 이미 잘 만들어진 자원을 먼저 수집·평가한다. 바퀴를 재발명하지 않는다.

### 5-1. 조사 대상 (Sources to Survey)

#### A. ARIS 스킬 파일 직접 분석
- ARIS 저장소의 `skills/` 폴더 내 각 `SKILL.md`를 열람하여 BioHub에 이식 가능한 것을 분류
- 우선 확인 대상:
  - `skills/research-pipeline/` — 논문 초안 생성 파이프라인 구조
  - `skills/rebuttal/` — 논문 리뷰 대응 전략 (반박 프롬프트 구조 참고)
  - `skills/semantic-scholar/` — 문헌 검색 프롬프트 설계
  - `skills/meta-optimize/` — 프롬프트 자기 최적화 메커니즘

#### B. 논문 작성 전용 프롬프트 라이브러리 조사
- **Awesome Prompts / PromptBase** 등: 학술 논문 작성 특화 프롬프트 커뮤니티 자료
- **Anthropic Cookbook / OpenAI Cookbook**: Anti-hallucination, 수치 재현 강제 등 신뢰성 가이드라인 예시
- **Papers With Code**: LLM 기반 논문 자동화 관련 최신 arXiv 논문의 프롬프트 공개 자료
- **Fabric (danielmiessler/fabric)**: 용도별 패턴 마크다운(PATTERN.md) 수백 개 — 학술 요약, 분석 리뷰 패턴 참고 가능

#### C. 기존 BioHub 내부 프롬프트 현황 점검
- `stats/lib/services/ai/prompts.ts` — 현재 분석 추천·결과 해석 프롬프트 원문 재확인
- `ai/llm-integration.md` — 현재 가이드라인에서 이미 정의된 규칙 추출
- Paper Package Assembly의 anti-hallucination 지시사항 (`docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md`) 재검토

### 5-2. 조사 결과 분류 기준

각 사전 조사 결과를 아래 3가지로 분류하여 `ai/prompts/00_survey/` 폴더에 기록:

| 분류 | 설명 | 처리 |
|------|------|------|
| **그대로 이식** | BioHub 요구사항에 바로 맞는 것 | `ai/prompts/` 하위로 복사 후 최소 수정 |
| **참고 후 변형** | 구조나 아이디어는 좋지만 맥락이 다른 것 | 패턴만 차용하고 BioHub 맞춤 재작성 |
| **불필요** | 일반적이거나 너무 다른 도메인 | 기록만 남기고 보류 |

### 5-3. 사전 조사 완료 후 진행

사전 조사가 끝난 뒤 다음 단계로 이동:

1. **프롬프트 초안 작성**: 조사 결과를 반영하여 `gen_results_stats.md`, `review_factcheck.md` 초안 생성
2. **기존 API 연동부 결합 테스트**: 프롬프트가 문자열로 조합되어 API `system_instruction`에 성공적으로 꽂히는지 테스트
3. **UX 노출**: 분석 완료 후 "학술 논문 모드" vs "요약 보고서 모드" 전환 UI 설계


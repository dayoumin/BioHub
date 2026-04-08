# AI 연구 자동화 동향 조사 (2026년 기준)

**작성일**: 2026-04-08
**목적**: BioHub Research Automation Pipeline (Stream 5 Horizon 3b) 로드맵 근거 자료
**범위**: 2026년 발표/출판된 시스템, 벤치마크, 도메인 논문만 포함

---

## 1. 2026년 주요 시스템

### Sakana AI Scientist v2 → Nature 게재

- **Nature 651, 914-919 (2026.03)** — AI가 완전 생성한 논문이 피어리뷰 통과한 최초 사례
- Sakana AI + UBC + Vector Institute + Oxford 공동 연구
- ICLR 2025 ICBINB 워크숍에서 평균 6.33점 (개별 6, 7, 6)으로 인간 수락 임계값 초과
- **v2 핵심 개선**: Template 의존성 제거, Progressive Agentic Tree Search, VLM feedback loop
- Scaling law 발견: 기반 모델 성능 향상 ∝ 생성 논문 품질 향상
- 단, 독립 평가(arXiv:2502.14297)에서 v1 기준 42% 실험 코딩 에러 실패, 100% Experimental Weakness
- Refs: [sakana.ai](https://sakana.ai/ai-scientist-nature/), [arXiv:2504.08066](https://arxiv.org/abs/2504.08066), [Nature](https://www.nature.com/articles/s41586-026-10265-5)

### Google DeepMind — 4개 전선

| 시스템 | 도메인 | 상태 (2026.04) |
|--------|--------|----------------|
| **Aletheia** | 수학 연구 | 연구 논문 (arXiv:2602.10177). IMO-Proof Bench 95.1%. Erdos 미해결 문제 4개 자율 해결 |
| **AlphaEvolve** | 알고리즘 발견 | Google 내부 production + Cloud preview. 56년 만에 Strassen 행렬 곱셈 개선 |
| **AI co-scientist** | 약물/생의학 | Trusted Tester. AML 약물 재활용 후보 → wet-lab 검증 성공 |
| **자동화 연구소** | 재료 과학 | UK 건설 예정. 로봇 + Gemini, 하루 수백 재료 합성/분석 |

### OpenAI — Fully Automated Researcher

- MIT Technology Review (2026.03.20): "AI researcher"를 North Star로 설정
- **2026.09 목표**: "autonomous AI research intern" — 수일 걸리는 특정 연구 문제 자율 수행
- **2028 목표**: 완전 자동 multi-agent 연구 시스템
- GPT-5 + Red Queen Bio: 유전자 편집 프로토콜 최적화 → 79배 효율 향상
- Ref: [MIT Tech Review](https://www.technologyreview.com/2026/03/20/1134438/openai-is-throwing-everything-into-building-a-fully-automated-researcher/)

### Anthropic Claude Operon (pre-release, 2026.03)

- Claude Desktop 내 **생물학/건강 연구 전용 워크스페이스** (Chat, Code, Cowork에 이어 4번째)
- 지원: CRISPR 스크린 설계, single-cell RNA 분석, 계통수, 단백질 언어 모델
- 프로젝트 기반 컨텍스트 유지
- 공개 1~3개월 내 예상
- Ref: [renovateqr.com](https://renovateqr.com/blog/claude-operon-anthropic-biology-research-2026)

### Autoscience ($14M 시드, 2026.03)

- Carl(가설+논문) + Mira(production ML 구현)
- ICLR 워크숍 피어리뷰 통과 + Kaggle Silver Medal (완전 자율)
- 동일 문제에 100개 에이전트 병렬 실행 → 최우수 결과 선택
- 금융, 제조, 사기 탐지에 초기 배포
- Ref: [rdworldonline.com](https://www.rdworldonline.com/autoscience-raises-14m-seed-round-to-scale-its-autonomous-ai-research-lab/)

### 기타

- **Microsoft Discovery**: 과학 R&D agentic AI, PNNL과 리튬 70% 감소 고체 전해질 발견
- **IBM CliffSearch**: 이론+코드 공진화 (arXiv:2604.01210)
- **HKUDS AI-Researcher**: NeurIPS 2025 Spotlight, Scientist-Bench 벤치마크 도입

---

## 2. 2026년 아키텍처 패턴

### 공통 파이프라인 구조

```
Literature Review → Hypothesis Generation → Experiment Design/Code →
Sandbox Execution → Result Analysis (+ VLM) → Manuscript Generation
```

### 신규 패턴

| 패턴 | 출처 | 핵심 |
|------|------|------|
| Progressive Agentic Tree Search | Sakana v2 | 가설-실험-분석을 트리로 탐색, 역추적 가능 |
| Generate-Debate-Evolve | Google co-scientist | 6 에이전트 토너먼트 진화 (Generation/Reflection/Ranking/Evolution/Proximity/Meta-review) |
| LLM-Driven Evolutionary Search | AlphaEvolve | Flash(폭)+Pro(깊이) 앙상블, 평가자 자동 피드백 |
| Structured Agentic Co-Evolution | IBM CliffSearch | 이론+코드 공진화, correctness/originality 이중 게이트 |
| VLM Feedback Loop | Sakana v2 | 실험 결과 차트 → Vision-Language Model 자동 해석 → 다음 실험 설계 |

### 에이전트 프레임워크

- **Claude Agent SDK**: extended thinking, multi-agent가 단일 대비 최대 90% 성능 향상
- **OpenAI Agents SDK**: Python/TypeScript, 단순성
- **Google ADK**: Google 생태계 통합
- 과학 연구 특화 SDK 적용은 아직 초기 단계

---

## 3. 2026년 벤치마크

| 벤치마크 | 규모 | 특징 |
|----------|------|------|
| **AstaBench** (Allen AI) | 2,400+ 문제, 11개 하위 | 문헌이해/코드실행/데이터분석/E2E 발견, Pareto frontier 리더보드 |
| **ResearcherBench** (GAIR-NLP) | 65개 전문가 질문, 35 주제 | Deep AI Research Systems 평가 |
| **DeepResearch Bench** | 100개 PhD 수준, 22 분야 | RACE(보고서 품질) + FACT(인용 신뢰성) |
| **BAISBench** | 31개 단일세포 데이터셋 + 198문제 | AI scientist 생물학 발견 능력 평가 |
| **MedResearchBench** | 16과제, 7 임상 도메인 | NHANES/SEER 기반, 출판 논문 ground truth |
| **BioAgent Bench** | bulk/scRNA-seq, metagenomics | 생명정보학 에이전트 평가 |

METR 시간 지평: 프론티어 모델 50% 지평 ~50분, 14시간 코딩 작업도 자율 완료 가능 (2026.04 기준)

---

## 4. 해양/수산/생태학 AI 논문 (2026)

### Fish and Fisheries — 핵심 3편

1. **Brown (2026)** "Automating Ecological and Fisheries Modelling With Agentic AI"
   - von Bertalanffy 성장곡선, 어류-서식지 GLM, yield-per-recruit을 에이전틱 AI로 자동화
   - **결론**: 설득력 있는 모델 생성 가능하나 논리 오류 위험 — "여전히 무엇을 하는지 알아야 한다"
   - [DOI](https://onlinelibrary.wiley.com/doi/10.1111/faf.70079)

2. **Spillias (2026)** "A Prospectus on Generative AI in Marine Ecosystem Modelling"
   - 해양 과학 generative AI 연구 18건 식별, OceanGPT/AQUA 등 도메인 LLM 소개
   - [DOI](https://onlinelibrary.wiley.com/doi/10.1111/faf.70037)

3. **Fernandes-Salvador (2026)** "Towards Trustworthy AI for Marine Research"
   - 데이터/인프라 격차, 불충분한 외부 검증, 모호한 출처 등 과제 지적
   - [DOI](https://onlinelibrary.wiley.com/doi/10.1111/faf.70052)

### 기타

- "AI for Fisheries Science: Neural Network Tools" (bioRxiv 2026.03) — 예측, 공간 표준화, 정책 최적화
- "Applications of AI in Fisheries" (MDPI 2026.01) — 종 탐지, 사료 최적화, 수질 예측, IUU 탐지
- **KDD 2026 AI for Sciences Track** (제주, 2026.08) — ecology, climate, agriculture 명시

---

## 5. 실무 현황: 지금 쓸 수 있는 것 vs 프로토타입

### Production (실무 사용 가능)

| 도구 | 용도 | 비용 |
|------|------|------|
| Elicit | 체계적 문헌 리뷰 (138M 논문) | Free/유료 |
| Semantic Scholar | 논문 탐색 (200M+ 논문) | 무료 |
| Consensus | 증거 기반 질문 응답 | Free/유료 |
| ChatGPT Deep Research | 30분 자율 웹 조사 | Plus $20/월~ |
| Claude Advanced Research | 45분 자율 조사 (200K 토큰) | Pro |

### 연구 프로토타입 / Pre-release

| 시스템 | 예상 시점 |
|--------|----------|
| AI Scientist-v2 (Sakana) | 오픈소스, 범용 사용은 미정 |
| Aletheia (DeepMind) | 공개 도구 미정 |
| Claude Operon | 1~3개월 내 |
| OpenAI AI Researcher | Intern 2026.09 / Full 2028 |

---

## 6. 핵심 교훈

### 최대 병목: 코드 구현 실패

- v1 독립 평가: 42% 실험 코딩 에러 실패
- PaperBench: Claude 3.5 Sonnet 1.8%
- **"AI Scientists Fail Without Strong Implementation Capability"** (arXiv:2506.01372)

### Human-in-the-Loop 필수

- 완전 자율은 시기상조, Semi-autonomous가 최적
- Fish & Fisheries 2026 공통 결론: "전문가 감독 필수"
- "The More You Automate, the Less You See" (arXiv:2509.08713)

### Nature 편집 방침 (2026.03.25)

- AI scientists are changing research — institutions, funders and publishers must respond
- LLM은 저자 자격 불충족, 사용 시 Methods에 기재 필수

---

## 7. BioHub 시사점

### BioHub 고유 강점

| 강점 | AI Scientist 시스템 대비 |
|------|------------------------|
| 43개 검증된 통계 메서드 | 코드 새로 생성 시 42% 실패 → 메서드 조합으로 우회 |
| Pyodide 브라우저/로컬 실행 | 데이터 프라이버시 (Operon도 클라우드) |
| Graph Studio | VLM feedback loop의 입력 소스 활용 가능 |
| 수산/해양 도메인 특화 | 범용 AI가 못 따라옴 (F&F 2026 결론) |

### 로드맵 반영 — Stream 5 Research Copilot 확장 (Horizon 3b)

기존 Stream 5에 "Research Automation Pipeline" 추가:

1. **분석 파이프라인 자동 조합** — 기존 43개 메서드 + Bio-Tools 조합 (새 코드 생성 아님)
2. **VLM 기반 결과 해석 루프** — Graph Studio 차트 → VLM 해석 → 후속 분석 제안
3. **Literature RAG 연동** — 분석 결과 기반 관련 논문 자동 매칭 (OpenAlex/PubMed 확장)
4. **프로젝트 → 논문 자동 조립** — Phase E-2와 연결, HITL 체크포인트
5. **Claude Operon / Agent SDK 연동** (watch) — 공개 시 생물학 특화 기능 활용 검토

### 원칙

- 검증된 메서드 조합 > 새 코드 생성 (42% 실패 회피)
- Semi-autonomous (전문가 감독 필수)
- Provenance 필수 (Nature 2026.03 편집 방침)
- 로컬 실행 유지 (Tauri 시너지)

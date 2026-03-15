# 플랫폼 확장 전략 — 경쟁 분석 + 로드맵

**작성일**: 2026-03-15
**근거**: K-Dense-AI/claude-scientific-skills 레포 분석 + 경쟁상대 조사

---

## 1. 현재 BioHub 섹션

| 섹션 | URL | 상태 |
|---|---|---|
| Smart Flow (통계 분석) | `/` | ✅ 완료 — 43~52개 메서드 |
| Graph Studio (시각화) | `/graph-studio` | ✅ 완료 |
| Chatbot (RAG) | `/chatbot` | ✅ 완료 |
| Bio-Tools (생물통계) | `/bio-tools` | 🔜 Phase 15-1 예정 |

---

## 2. 경쟁상대 현황 (2026)

### 2-1. 통계 분석

| 서비스 | 가격 | 웹 기반 | AI | 한국어 | 특이사항 |
|---|---|:---:|:---:|:---:|---|
| **Julius AI** | $20~45/월 | ✅ | ✅ GPT-4o/Claude | ❌ | 가장 가까운 경쟁자. 자연어 분석, R/Python 지원 |
| **jamovi Cloud** | 무료 | ✅ | ❌ | ❌ | 웹 기반 무료 통계. AI 없음. 모듈 풍부 |
| **JASP** | 무료 | ❌ (데스크탑) | ❌ | ❌ | Bayesian 강함. 교육 표준. 웹 없음 |
| **SPSS** | $105+/월 | ❌ | 일부 | ✅ UI | 레거시 기관 의존. 비쌈 |
| **Stata** | $273+/년 | ❌ | ❌ | ❌ | 경제학/역학 특화. 고가 |
| **SAS** | 학생 무료 | ✅ SAS Studio | ✅ AutoML | ❌ | 기관 라이선스 중심 |
| **Orange** | 무료 | ❌ | ML 시각화 | ❌ | 드래그앤드롭 ML. 통계보다 ML 중심 |

**포지셔닝 공백**: 무료 + 웹 기반 + AI 통합 + 생물통계 특화 + 한국어 → BioHub만 해당

### 2-2. 과학 시각화

| 서비스 | 가격 | 강점 | 약점 |
|---|---|---|---|
| **GraphPad Prism** | $142+/년 | 바이오메디컬 표준. 통계+그래프 통합 | 데스크탑, 비쌈, AI 없음 |
| **Plotivy** | 무료 | Prism 대안. Python 코드 출력 | 통계 연계 없음. AI 없음 |
| **BioRender** | $35+/월 | 생물 다이어그램 업계 표준 (~2M 사용자) | 데이터 차트 불가. 비쌈 |
| **OriginPro** | ~$1,000+ | 물리/화학 연구 표준 | 데스크탑, 고가 |

**Graph Studio 포지셔닝**: Prism 무료 대안 — "무료 + AI 자연어 편집 + 한국어 저널 프리셋"

### 2-3. AI 연구 도구 (2026 신규 위협 포함)

| 서비스 | 출시 | 위협도 | 내용 |
|---|---|:---:|---|
| **OpenAI Prism** | 2026-01-27 | ★★★★★ | 무료 AI 과학 워크스페이스. LaTeX, 공동작업, ChatGPT 통합. "연구자용 올인원" 직접 포지셔닝 |
| **ChatGPT Advanced Data Analysis** | 활성 | ★★★★ | Python sandbox로 통계 분석. 무료(제한)/Plus $20/월. 재현성 없음, 한국어 약함 |
| **Claude Analysis Tool** | 활성 | ★★★ | Python 실행. 코드 품질 우수. 세션 간 상태 없음 |
| **Julius AI** | 활성 | ★★★★ | 학술 타겟 AI 분석. 성장 중 |
| **marimo** | 활성 | ★★★ | 반응형 Python 노트북. AI 내장. Pyodide 지원. 15k+ GitHub stars |

### 2-4. 논문 작성 / 문헌 검색

| 서비스 | 가격 | 강점 | BioHub 연관성 |
|---|---|---|---|
| **Elicit** | 무료/$12~49/월 | 체계적 문헌 검토, PRISMA, 2M+ 연구자 | 문헌 검색은 Elicit이 앞섬 — 연계로 충분 |
| **Consensus** | 무료/$9/월 | 증거 기반 Q&A, 200M+ 논문 | 연계로 충분 |
| **SciSpace** | $12~70/월 | 논문 이해 + AI 글쓰기 통합 | BioHub Paper Writer와 겹치나 "수치 정확성"이 차별점 |
| **Perplexity Deep Research** | 무료/$20/월 | 다단계 리서치, Wiley 파트너십 (2025-05) | 일반 검색은 대체됨 |
| **Semantic Scholar** | 무료 (API) | 200M+ 논문, 무료 API | BioHub 내 인용 검증 버튼에 활용 |
| **Scite** | $20/월 | 인용 지지/반박 분류 1.2B+ | 특화 틈새. 연계 고려 |

---

## 3. BioHub의 해자 (경쟁상대가 복제 못하는 것)

```
1. 브라우저 완전 실행 (Pyodide)
   - 서버 비용 $0 / 설치 없음 / 오프라인 가능
   - Julius AI, ChatGPT는 서버 의존

2. 분석 수치의 정확성 → 논문 자동 연결
   - t=3.21, df=28, p=0.003 이 실제 계산값
   - OpenAI Prism, SciSpace는 이 수치를 모름 → 환각 위험

3. 수산/생태/생물 특화 통계 (Bio-Tools)
   - PERMANOVA, NMDS, VBGF, 생물다양성 지수 등
   - JASP/jamovi/SPSS에 없음

4. 한국어 + 한국 저널 프리셋
   - 모든 경쟁자가 영어 중심

5. 통계 → 시각화 → 논문 끊김 없는 워크플로우
   - 어떤 단일 경쟁상대도 3개를 통합하지 않음
   - Smart Flow 결과 → Graph Studio → Paper Writer
```

---

## 4. 기능별 전략 분류

### A. BioHub 안에서 구현 (통합 가치 명확)

| 기능 | 이유 |
|---|---|
| **Bio-Tools 12개** | 경쟁상대 없음. Pyodide로 무료 구현 가능 |
| **Paper Writer** | 실제 계산값 삽입이 핵심. OpenAI Prism/SciSpace는 수치 없음 |
| **PRISMA/STROBE/CONSORT 체크리스트** | 어떤 분석을 했는지 BioHub가 알고 있어 자동 감지 가능 |
| **R 코드 생성** | 분석 결과 → 재현 가능한 R/Python 코드 출력. 사용자 편의. 경쟁 없음 |
| **의학/임상 통계 확장** | SPSS 대체 수요 큼. 무료 웹 경쟁자 없음 |
| **심리/사회과학 통계 확장** | jamovi 사용자 흡수 가능 (AI 없는 jamovi 대비 우위) |

### B. 연계로 흡수 (독립 섹션 불필요)

| 기능 | 전략 | 이유 |
|---|---|---|
| PubMed/arXiv 검색 | Paper Writer 내 "인용 검색" 버튼 | Elicit/Perplexity가 훨씬 앞섬 |
| 인용 검증 | Semantic Scholar API 버튼 1개 | 독립 섹션 만들 이유 없음 |
| 논문 발견 | 분석 결과에서 "관련 논문 찾기" 외부 링크 | Connected Papers/Research Rabbit 연결 |
| 일반 AI 글쓰기 | LLM Discussion 생성으로 충분 | OpenAI Prism이 2026-01 무료 출시 |

### C. 포기 또는 장기 보류

| 기능 | 이유 |
|---|---|
| **Literature Hub 독립 섹션** | Elicit, Perplexity Deep Research, Consensus가 훨씬 앞섬. 따라잡기 불가 |
| **Galaxy식 Bioinformatics 파이프라인** | Galaxy는 10년 기관 지원. 서버 비용 감당 불가 |
| **scRNA-seq 전체 파이프라인** | Leiden/UMAP 서버 필요. 10x Genomics Cloud, Seurat Cloud와 경쟁 불가 |
| **KEGG/Ensembl 독립 조회 섹션** | 기존 웹사이트 + AI 설명으로 충분 |
| **BioRender식 다이어그램** | BioRender가 2M+ 사용자 기반 압도적 |

---

## 5. 확장 로드맵

```
2026 Q2
  Phase 15-1  Bio-Tools 12개 (생태/수산/생물통계)
  Phase 16    Paper Writer — Methods/Results/Captions/Discussion
               + PRISMA/STROBE/CONSORT 자동 감지 + 체크리스트
               + Semantic Scholar 인용 검증 버튼

2026 Q3-Q4
  Phase 17    의학/임상 통계 확장
               — Mixed effects models, Diagnostic accuracy (sensitivity/specificity/LR)
               — NNT/NNH, Dose-response (LOEC/NOEC), Bland-Altman 제외 이유 포함
               — Kaplan-Meier 보강 (이미 있음, UI 개선)
  Phase 18    심리/사회과학 통계 확장
               — Item Response Theory (IRT), Confirmatory Factor Analysis (CFA)
               — Reliability (이미 있음, 확장), Agreement (Cohen's kappa 이미 있음)
               — Mediation/Moderation analysis

2026 Q4 ~
  Phase 19    R 코드 생성
               — 분석 결과 → 재현 가능한 R 코드 (ggplot2 + stats + 적절한 패키지)
               — 복사 버튼 1개로 R Studio에서 즉시 재현 가능

2027 ~
  Phase 20    scRNA-seq (Pyodide 한도 내)
               — QC, normalization, PCA: Pyodide (numpy/scipy) 가능
               — Leiden, UMAP: 서버 비용 해결 후 재검토
  Phase 21    Bioinformatics 서열 분석 (biopython 경량 기능)
               — FASTA 파싱, ORF 탐지: Pyodide 가능
               — BLAST: NCBI REST API 연계
```

---

## 6. 섹션 구조 (목표)

```
/                  Smart Flow (통계) — 현재
/graph-studio      Graph Studio (시각화) — 현재
/bio-tools         Bio-Tools (생물/생태/수산 통계) — Phase 15-1
/paper             Paper Writer (논문 초안) — Phase 16
/clinical-stats    의학/임상 통계 — Phase 17 (또는 Smart Flow 메서드 통합)
/social-stats      사회과학 통계 — Phase 18 (또는 Smart Flow 메서드 통합)
```

> Phase 17-18은 독립 섹션보다 **Smart Flow 메서드 추가**로 통합하는 것이 UX 일관성 면에서 유리할 수 있음. 결정 필요.

---

## 7. 참고

- **Graph Studio 경쟁 분석**: [graph-studio/GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md](graph-studio/GRAPH_STUDIO_COMPETITIVE_ANALYSIS.md)
- **기존 Paper Writer 계획**: [PLAN-PAPER-DRAFT-GENERATION.md](PLAN-PAPER-DRAFT-GENERATION.md)
- **Paper Writer 아이디어 확장**: [IDEAS-PAPER-DRAFT-ENHANCEMENTS.md](IDEAS-PAPER-DRAFT-ENHANCEMENTS.md)
- **Bio-Tools 상세**: [../../study/PLAN-BIO-STATISTICS-AUDIT.md](../../study/PLAN-BIO-STATISTICS-AUDIT.md)

# RAG System Week 1 Day 1 - AI 리뷰 요청 문서

**작업 날짜**: 2025-10-31
**작업자**: Claude Code (Sonnet 4.5)
**소요 시간**: ~2시간
**리뷰 목적**: 현재 진행 방향 검증 및 개선 사항 도출

---

## 📋 리뷰 요청 항목

### 1. ✅ 아키텍처 설계 검증
- RAG 시스템 문서 계층 구조 (Tier 0-3)가 적절한가?
- Crawl4AI 선택이 최선인가? (대안: Beautiful Soup, Scrapy, Playwright 직접 사용)

### 2. ✅ 데이터 품질 검증
- 크롤링된 문서의 Markdown 변환 품질
- 메타데이터 구조 적절성 (YAML frontmatter)

### 3. ✅ 법적 리스크 검토
- BSD 3-Clause 라이선스 준수 여부
- Fair Use 범위 내 사용인지 확인

### 4. ✅ 기술 스택 검증
- LangChain + Vercel AI SDK 조합 적절성
- Vector DB 선택 (Chroma vs FAISS vs Pinecone)

### 5. ⚠️ 문제점 및 리스크 식별
- 현재 접근 방식의 약점
- 확장성 문제 (61개 문서 → 수백 개 확장 시)

---

## 🏗️ 프로젝트 개요

### 목표
**전문가급 통계 분석 플랫폼**에 RAG 시스템을 추가하여:
- 사용자가 자연어로 통계 방법 질문 ("어떤 검정을 써야 하나요?")
- AI가 SciPy/NumPy 문서 및 통계 방법론 가이드를 참조하여 답변
- 정확한 함수 호출 예제 제공 (코드 생성)

### 기술 스택
```
Frontend: Next.js 15 + TypeScript + shadcn/ui
Backend: Pyodide (브라우저 내 Python 실행)
RAG 시스템:
  - Document Crawler: Crawl4AI v0.7.6
  - Vector DB: Chroma (예정)
  - LLM Framework: LangChain + Vercel AI SDK
  - Embedding: OpenAI text-embedding-3-small (예정)
```

### 아키텍처
```
사용자 질문
    ↓
LangChain RAG Pipeline
    ↓
Vector DB (Chroma) ← Embedding 검색
    ↓
Retrieved Documents (Top-K)
    ↓
LLM (GPT-4o-mini) ← Context Injection
    ↓
답변 생성 (함수 호출 예제 포함)
```

---

## 📊 현재 진행 상황 (Week 1 Day 1)

### ✅ 완료된 작업

#### 1. 문서 수집 계획 수립 (CRAWL_MANIFEST.md)

**Tier 0: 통계 방법론 가이드** (4개, 수동 작성) ✅
- `statistical-decision-tree.md` (652줄) - 연구 질문 → 통계 방법 선택
- `assumption-guide.md` (638줄) - 가정 검증 및 대안
- `interpretation-guide.md` (559줄) - p-value, 효과크기 해석
- `method-comparison.md` (524줄) - 모수/비모수 비교

**Tier 1: SciPy/NumPy 공식 문서** (61개, 크롤링 예정)
- SciPy: 41개 함수 (ttest_ind, mannwhitneyu, f_oneway 등)
- NumPy: 20개 함수 (mean, std, percentile 등)
- **샘플 크롤링 완료**: 5개 (scipy 3개 + numpy 2개)

**Tier 2: 프로젝트 내부 문서** (6개, 추출 예정)
- Worker 1-4 Python 주석
- method-metadata.ts (60개 메서드 메타데이터)

**Tier 3: statsmodels/pingouin** (보류)
- 현재 Worker 1-4에서 미사용 → 크롤링 보류

#### 2. Crawl4AI 환경 구축

**설치 완료**:
- Crawl4AI: v0.7.6 (최신)
- Playwright: v1.55.0
- Python: 3.13

**샘플 크롤링 (5개)**:
| 파일 | 라인 수 | 글자 수 | 검증 |
|------|--------|---------|------|
| scipy/ttest_ind.md | 305 | 34,213 | ✅ |
| scipy/mannwhitneyu.md | 269 | 33,347 | ✅ |
| scipy/f_oneway.md | 224 | 26,066 | ✅ |
| numpy/mean.md | 254 | 16,747 | ✅ |
| numpy/percentile.md | 316 | 18,295 | ✅ |

**품질 검증** (8개 항목 모두 통과):
- ✅ HTML → Markdown 변환 완벽
- ✅ LaTeX 수식 보존
- ✅ 코드 블록 형식 유지
- ✅ 메타데이터 YAML frontmatter 포함
- ✅ UTF-8 인코딩 (한글 설명 정상 표시)
- ✅ 저작권 표시 (BSD 3-Clause)
- ✅ 크롤링 날짜 기록

#### 3. 메타데이터 구조 설계

**각 크롤링 문서 헤더**:
```yaml
---
title: scipy.ttest_ind
description: 독립표본 t-검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---
```

**메타데이터 활용 계획**:
- `library` + `version`: 버전별 문서 필터링
- `license` + `copyright`: 법적 추적
- `crawled_date`: 업데이트 필요 시점 판단 (6개월 주기)

---

## 🔧 해결한 기술 문제

### 문제 1: Windows UTF-8 인코딩 충돌 ❌ → ✅

**증상**:
```python
UnicodeEncodeError: 'cp949' codec can't encode character '\U0001f50d' in position 2
```

**원인**:
- Windows 기본 콘솔: cp949 (한글 Windows)
- Python stdout: cp949 사용
- 이모지/Unicode 확장 문자 미지원

**해결책** (3단계):
1. **VSCode 설정** (`.vscode/settings.json`):
   ```json
   {
     "terminal.integrated.profiles.windows": {
       "PowerShell": {
         "args": ["-NoExit", "-Command", "chcp 65001"]
       }
     }
   }
   ```

2. **Python 스크립트 래퍼**:
   ```python
   if sys.platform == "win32":
       sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
   ```

3. **Git 설정** (`.gitattributes`):
   ```gitattributes
   * text=auto eol=lf
   *.py text eol=lf
   ```

**결과**: ✅ 이모지 정상 출력, 향후 프로젝트에서도 재사용 가능

### 문제 2: Python 환경 버전 불일치 ❌ → ✅

**증상**:
```bash
python --version  # Python 3.11.9
python -m pip list | grep crawl4ai  # 출력 없음
```

**원인**:
- 시스템 PATH: Python 3.11.9 우선
- Crawl4AI 설치: Python 3.13 환경

**해결책**:
1. 명시적 Python 경로 사용:
   ```bash
   C:/Users/User/AppData/Local/Programs/Python/Python313/python.exe
   ```

2. VSCode 설정:
   ```json
   {
     "python.defaultInterpreterPath": "C:/Users/.../Python313/python.exe"
   }
   ```

**결과**: ✅ 환경 불일치 해결, 향후 버전 추적 용이

---

## 📁 현재 파일 구조 (실제 저장소 상태)

```
statistical-platform/rag-system/
├── data/                          # 크롤링 문서 저장소
│   ├── CRAWL_MANIFEST.md          # 추적 시스템 (353줄)
│   ├── methodology-guide/         # Tier 0 (4개 파일, 2,373줄)
│   │   ├── statistical-decision-tree.md
│   │   ├── assumption-guide.md
│   │   ├── interpretation-guide.md
│   │   └── method-comparison.md
│   ├── scipy/                     # Tier 1 SciPy (16개 크롤링 완료)
│   │   ├── ttest_ind.md, ttest_rel.md, ttest_1samp.md
│   │   ├── mannwhitneyu.md, wilcoxon.md
│   │   ├── kruskal.md, friedmanchisquare.md, f_oneway.md
│   │   ├── chi2_contingency.md, chisquare.md, fisher_exact.md
│   │   ├── kstest.md, shapiro.md, levene.md
│   │   ├── pearsonr.md, spearmanr.md
│   │   └── (나머지 25개 대기)
│   ├── numpy/                     # Tier 1 NumPy (2개 크롤링 완료)
│   │   ├── mean.md, percentile.md
│   │   └── (나머지 18개 대기)
│   ├── project-docs/              # Tier 2 (미구축)
│   ├── statsmodels/               # Tier 3 (보류)
│   └── pingouin/                  # Tier 3 (보류)
├── scripts/                       # 크롤링 스크립트
│   ├── test_crawl4ai.py           # 샘플 크롤러 (238줄)
│   └── crawl_scipy_batch.py       # 배치 크롤러 (신규, 259줄)
├── docs/                          # 문서화
│   ├── UTF8_SETUP_GUIDE.md        # UTF-8 문제 해결 가이드 (300줄)
│   ├── RAG_WEEK1_DAY1_REVIEW.md   # 이 문서 (AI 리뷰용)
│   └── WEEK1_DAY1_FINAL_CHECKLIST.md  # 최종 점검 보고서
└── (미래 디렉터리 - 현재 빈 폴더)
    ├── vector-db/                 # Chroma DB 저장소
    ├── embeddings/                # 임베딩 캐시
    └── pipeline/                  # LangChain 파이프라인

# 프로젝트 루트 (d:/Projects/Statics/)
.vscode/
├── settings.json                  # VSCode 프로젝트 설정 (UTF-8 설정 포함)
.gitattributes                     # Git 라인엔딩 설정 (LF 정규화)
```

**실제 통계 (2025-10-31 현재)**:
- **총 파일**: 31개 (Markdown 23개 + Python 2개 + JSON 1개 + 기타 5개)
- **크롤링 완료**: 22개 문서 (방법론 4개 + SciPy 16개 + NumPy 2개)
- **크롤링 대기**: 43개 (SciPy 25개 + NumPy 18개)
- **총 라인**: ~6,500줄 (추정)
- **총 크기**: ~400KB (추정)

**주의**: 이 문서는 **Day 1 계획서**이지만, 실제로는 일부 Day 2 작업이 진행되어 SciPy 16개가 크롤링된 상태입니다.

---

## 🎯 핵심 설계 결정

### 결정 1: 4-Tier 문서 계층 구조

**이유**:
1. **Tier 0 (방법론)**: 통계 개념 설명 → "어떤 검정을 써야 하나요?" 질문 대응
2. **Tier 1 (공식 문서)**: 정확한 함수 시그니처 및 예제 → "코드를 어떻게 작성하나요?" 대응
3. **Tier 2 (프로젝트 문서)**: 내부 구현 맥락 → "이 프로젝트에서는 어떻게 구현되어 있나요?" 대응
4. **Tier 3 (확장 라이브러리)**: 미래 확장성 → 현재는 보류

**대안 고려**:
- ❌ 모든 문서를 단일 계층에 저장 → 검색 품질 저하
- ❌ Tier 분리 없이 태그만 사용 → 우선순위 부여 어려움

### 결정 2: Crawl4AI 선택

**이유**:
1. ✅ LLM-friendly Markdown 변환 (LaTeX 보존)
2. ✅ Async/Await 지원 (대량 크롤링 효율적)
3. ✅ Playwright 기반 (JavaScript 렌더링 지원)
4. ✅ 메타데이터 추출 자동화

**대안 고려**:
| 도구 | 장점 | 단점 | 선택 이유 |
|------|------|------|----------|
| **Crawl4AI** ✅ | LLM 최적화, 비동기 | 의존성 무거움 (Playwright) | **LLM 통합 우선** |
| Beautiful Soup | 가볍고 단순 | 수동 파싱 필요 | Markdown 변환 번거로움 |
| Scrapy | 대규모 크롤링 특화 | 과잉 기능 (61개 문서만) | 프로젝트 규모에 맞지 않음 |
| Playwright 직접 | 완전 제어 가능 | 코드량 증가 | Crawl4AI가 추상화 제공 |

### 결정 3: YAML Frontmatter 메타데이터

**이유**:
1. ✅ Markdown 표준 (Jekyll, Hugo, 11ty 등 지원)
2. ✅ LangChain Document Loader 자동 파싱
3. ✅ 사람도 읽기 쉬움 (Git 리뷰 용이)

**대안 고려**:
- ❌ JSON 메타데이터 파일 분리 → 문서와 메타데이터 동기화 어려움
- ❌ HTML `<meta>` 태그 → Markdown이 아님
- ❌ 파일명에 메타데이터 포함 → 파일명 길어짐

### 결정 4: 수동 작성 vs 크롤링 분리

**이유**:
- **Tier 0 (수동 작성)**: 통계 방법론은 여러 교과서/논문 종합 → 크롤링 불가능
- **Tier 1 (크롤링)**: 공식 문서는 단일 출처 → 크롤링 효율적
- **Tier 2 (자동 추출)**: 프로젝트 코드 주석 → AST 파싱

**대안 고려**:
- ❌ Tier 0도 크롤링 (Wikipedia, 통계 교과서) → 저작권 문제 + 품질 불균일

---

## 📋 다음 단계 (Week 1 Day 2-7)

### Day 2 (2025-11-01 예정)
**목표**: 나머지 SciPy 38개 함수 크롤링

**작업 계획**:
1. `scripts/crawl_scipy_batch.py` 작성 (배치 크롤링)
2. 41개 함수 목록 (CRAWL_MANIFEST.md에서 추출)
3. 1초 간격 순차 크롤링 (서버 부하 고려)
4. 품질 검증 (8개 항목 체크)
5. CRAWL_MANIFEST 업데이트

**예상 결과**:
- 38개 문서 (~3,800줄, ~380KB)
- 예상 시간: ~1시간 (크롤링 38분 + 검증 20분)

### Day 3 (2025-11-02 예정)
**목표**: NumPy 18개 함수 크롤링

**작업 계획**:
1. `scripts/crawl_numpy_batch.py` 작성
2. 20개 함수 목록에서 남은 18개 크롤링
3. 품질 검증

**예상 결과**:
- 18개 문서 (~1,800줄, ~180KB)
- 예상 시간: ~30분

### Day 4 (2025-11-03 예정)
**목표**: 프로젝트 내부 문서 추출 (Tier 2)

**작업 계획**:
1. Python AST 파서 작성 (docstring 추출)
2. Worker 1-4 주석 추출 → Markdown 변환
3. TypeScript 파서 작성 (JSDoc 추출)
4. `method-metadata.ts` → Markdown 변환

**예상 결과**:
- 6개 문서 (~1,480줄)
- 예상 시간: ~2시간 (파서 작성 포함)

### Day 5-7 (2025-11-04~06 예정)
**목표**: RAG 파이프라인 구축

**Day 5 (Vector DB 구축)**:
1. Chroma DB 설치 및 설정
2. 문서 임베딩 (OpenAI text-embedding-3-small)
3. 컬렉션 생성 (Tier별 분리)

**Day 6 (LangChain 통합)**:
1. Document Loader 작성 (YAML frontmatter 파싱)
2. Retriever 설정 (Hybrid Search: 키워드 + 의미 검색)
3. Prompt 템플릿 작성

**Day 7 (API 통합)**:
1. Vercel AI SDK 통합
2. Next.js API Route 작성 (`/api/rag/ask`)
3. 스트리밍 응답 구현

---

## 🚨 리스크 및 우려사항

### 리스크 1: 문서 업데이트 주기

**문제**:
- SciPy/NumPy는 매 6개월마다 메이저 업데이트
- 크롤링한 문서가 outdated 될 가능성

**현재 대응책**:
- 크롤링 날짜 메타데이터 기록 (`crawled_date`)
- 6개월 주기 재크롤링 계획

**추가 제안 요청**:
- ⚠️ 자동 업데이트 체크 시스템 필요?
- ⚠️ 버전별 문서 보관 vs 최신 버전만 유지?

### 리스크 2: 저작권 및 라이선스

**현재 상태**:
- ✅ SciPy/NumPy: BSD 3-Clause (상업적 사용 허용)
- ✅ 저작권 표시 YAML frontmatter에 포함
- ✅ Fair Use 범위 내 (교육/연구 목적)

**우려사항**:
- ⚠️ 크롤링한 문서를 RAG로 재가공 후 상업적 서비스에 사용 → 라이선스 위반?
- ⚠️ BSD 3-Clause는 "소스 코드" 라이선스인데 "문서"에도 적용되는지 명확하지 않음

**추가 제안 요청**:
- 법적 리스크 평가 필요
- 라이선스 고지 방법 개선 (UI에 표시?)

### 리스크 3: 검색 품질

**우려사항**:
- 61개 문서는 소규모 → Vector Search 효과 제한적
- 키워드 검색만으로도 충분할 수 있음

**현재 계획**:
- Hybrid Search (키워드 + 의미 검색)
- Tier별 우선순위 부여 (Tier 0 > Tier 1 > Tier 2)

**추가 제안 요청**:
- ⚠️ 61개 문서에서 Vector Search가 오버엔지니어링인가?
- ⚠️ 단순 키워드 검색 (Elasticsearch/MeiliSearch)이 더 나은가?

### 리스크 4: 비용

**현재 계획**:
- Embedding: OpenAI text-embedding-3-small ($0.02/1M tokens)
- LLM: GPT-4o-mini ($0.15/1M input tokens)

**예상 비용 (월간 1,000명 사용자 가정)**:
- Embedding (1회만): 61개 문서 × 평균 1,500 tokens = 91,500 tokens → **$0.002**
- LLM (1,000 쿼리/월): 평균 2,000 tokens/쿼리 × 1,000 = 2M tokens → **$0.30/월**
- 총 비용: **~$4/년** (매우 저렴)

**우려사항**:
- ⚠️ 사용자 증가 시 비용 폭증 가능성
- ⚠️ Self-hosted LLM (Ollama) 고려해야 하는가?

### 리스크 5: 응답 정확도

**우려사항**:
- RAG는 Hallucination 감소하지만 완전히 제거 불가능
- 통계 분석은 정확도가 생명 → 잘못된 답변 시 연구 데이터 손상

**현재 대응책**:
- 출처 표시 (Retrieved Documents 링크 제공)
- 신뢰도 점수 표시 (Retrieval Score)

**추가 제안 요청**:
- ⚠️ 답변 검증 메커니즘 필요? (Rule-based Validation)
- ⚠️ 사용자 피드백 수집 (Thumbs Up/Down)

---

## 🤔 AI 리뷰어에게 질문

### 질문 1: 아키텍처 검증

**Q1.1**: 4-Tier 문서 계층 구조가 적절한가?
- Tier 0 (방법론) / Tier 1 (공식 문서) / Tier 2 (프로젝트 문서) / Tier 3 (확장)
- 대안: 단일 계층 + 태그 시스템

**Q1.2**: Crawl4AI 선택이 최선인가?
- 대안: Beautiful Soup, Scrapy, Playwright 직접 사용
- 61개 문서 규모에서 Crawl4AI가 오버엔지니어링인가?

**Q1.3**: Vector DB 선택
- Chroma (계획) vs FAISS vs Pinecone
- 61개 문서에서 Vector Search가 필요한가? (키워드 검색으로 충분?)

### 질문 2: 데이터 품질

**Q2.1**: 메타데이터 구조가 충분한가?
```yaml
title, description, source, library, version, license, copyright, crawled_date
```
- 추가 필요 항목: `tags`, `difficulty_level`, `prerequisites`?

**Q2.2**: Markdown 변환 품질 검증 방법
- 현재: 수동 샘플 검증 (16개)
- 개선: 자동화 테스트 필요? (LaTeX 파싱, 코드 블록 검증)

**Q2.3**: 문서 중복 및 일관성 관리
- 현재: 각 함수별 개별 문서 (41개 SciPy + 20개 NumPy)
- 우려: 중복 내용 (예: 모든 검정 함수에 p-value 설명 반복)
- 대안: 공통 개념 문서 분리 vs 중복 허용 (검색 품질 향상)

### 질문 3: 법적 리스크

**Q3.1**: BSD 3-Clause 라이선스 준수 충분한가?
- 현재: YAML frontmatter에 저작권 표시
- 추가: UI에 라이선스 고지 필요?

**Q3.2**: Fair Use 범위 내인가?
- 크롤링한 공식 문서를 RAG로 재가공 → 상업적 서비스 제공
- 법적 리스크 평가 필요?

**Q3.3**: 문서 출처 표시 방법
- 현재: YAML frontmatter에 `source` URL 포함
- 추가: RAG 답변 시 출처 표시 방법?
  - Option A: 답변 하단에 "참고: scipy.stats.ttest_ind 문서" 링크
  - Option B: UI에 "출처 보기" 버튼
  - Option C: 라이선스 페이지에 일괄 표시

### 질문 4: 확장성

**Q4.1**: 문서 수 증가 시 대응 전략
- 현재: 61개 문서
- 미래: 500+ 문서 (statsmodels, pingouin 추가)
- 검색 성능 저하 우려?

**Q4.2**: 문서 업데이트 주기
- 6개월마다 재크롤링 vs 자동 업데이트 체크
- 버전별 문서 보관 vs 최신 버전만 유지?

**Q4.3**: 다국어 지원 계획
- 현재: SciPy/NumPy 영문 문서 + 한글 설명 (메타데이터)
- 미래: 한글 통계 교과서 크롤링 vs 영문만 유지?
- 우려: 다국어 임베딩 품질 저하 가능성

### 질문 5: 비용 최적화

**Q5.1**: 임베딩 비용 절감
- OpenAI Embedding vs Self-hosted (sentence-transformers)
- 61개 문서에서 차이 미미 ($0.002/월) → 확장 시 고려?

**Q5.2**: LLM 비용 절감
- GPT-4o-mini vs Self-hosted (Ollama + Llama 3)
- 정확도 vs 비용 트레이드오프

**Q5.3**: 캐싱 전략
- 현재: 매 쿼리마다 LLM 호출
- 개선: 자주 묻는 질문(FAQ) 캐싱?
  - Redis 캐시 (쿼리 → 답변 매핑)
  - 유사 질문 감지 (임베딩 거리 < 0.1)
  - 비용 절감 효과: 80% 쿼리 캐시 히트 시 → $0.06/월

---

## 📊 현재 상태 요약

### ✅ 성공한 부분

1. **명확한 계획 수립**: CRAWL_MANIFEST.md로 전체 문서 추적
2. **품질 보증**: 8개 항목 체크리스트 통과 (샘플 5개)
3. **법적 안전성**: BSD 3-Clause 준수, 메타데이터 기록
4. **재현 가능성**: Crawl4AI 스크립트로 재크롤링 가능
5. **문제 해결**: UTF-8 인코딩, Python 환경 불일치 해결

### ⚠️ 미해결 우려사항

1. **검색 품질**: 61개 문서에서 Vector Search 효과 검증 필요
2. **비용**: 사용자 증가 시 LLM 비용 폭증 가능성
3. **정확도**: RAG Hallucination 대응 메커니즘 부족
4. **확장성**: 500+ 문서로 확장 시 성능 검증 필요
5. **법적 리스크**: 상업적 서비스 제공 시 라이선스 재검토 필요

### 📈 진행률

| 단계 | 상태 | 진행률 | 완료일 |
|------|------|-------|--------|
| **Week 1 Day 1** | ✅ 완료 | 100% | 2025-10-31 |
| Week 1 Day 2 | ⏳ 대기 | 0% | 2025-11-01 (예정) |
| Week 1 Day 3 | ⏳ 대기 | 0% | 2025-11-02 (예정) |
| Week 1 Day 4 | ⏳ 대기 | 0% | 2025-11-03 (예정) |
| Week 1 Day 5-7 | ⏳ 대기 | 0% | 2025-11-04~06 (예정) |

**전체 진행률**: **14%** (Day 1/7 완료)

---

## 🎯 AI 리뷰어 체크리스트

리뷰 시 다음 항목 검토 요청:

- [ ] **아키텍처 설계**: 4-Tier 구조 적절성
- [ ] **기술 스택**: Crawl4AI, LangChain, Chroma 선택 타당성
- [ ] **데이터 품질**: 메타데이터 구조 및 Markdown 변환 품질
- [ ] **법적 리스크**: 라이선스 준수 및 Fair Use 범위
- [ ] **확장성**: 문서 수 증가 시 성능 대응 전략
- [ ] **비용**: OpenAI API 비용 최적화 방안
- [ ] **정확도**: Hallucination 대응 메커니즘
- [ ] **코드 품질**: Python 스크립트 구조 및 에러 처리
- [ ] **문서화**: CRAWL_MANIFEST, UTF8_SETUP_GUIDE 완성도
- [ ] **다음 단계**: Week 1 Day 2-7 계획 타당성

---

## 📎 참고 파일

### 핵심 문서
1. [data/CRAWL_MANIFEST.md](../data/CRAWL_MANIFEST.md) - 크롤링 추적 시스템
2. [docs/UTF8_SETUP_GUIDE.md](UTF8_SETUP_GUIDE.md) - UTF-8 문제 해결
3. [scripts/test_crawl4ai.py](../scripts/test_crawl4ai.py) - 샘플 크롤러

### 크롤링 샘플
- [data/scipy/ttest_ind.md](../data/scipy/ttest_ind.md)
- [data/numpy/mean.md](../data/numpy/mean.md)

### 방법론 가이드
- [data/methodology-guide/statistical-decision-tree.md](../data/methodology-guide/statistical-decision-tree.md)
- [data/methodology-guide/assumption-guide.md](../data/methodology-guide/assumption-guide.md)

---

**리뷰 방법**:
1. 이 문서를 다른 AI (GPT-4, Claude, Gemini)에게 제공
2. "위 RAG 시스템 개발 계획을 검토하고 개선 사항을 제안해주세요" 요청
3. 특히 "🤔 AI 리뷰어에게 질문" 섹션 5개 질문에 답변 요청

**작성자**: Claude Code (Sonnet 4.5)
**최종 업데이트**: 2025-10-31

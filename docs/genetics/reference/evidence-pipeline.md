# Marker Recommendation Engine — 근거 수집 & 점수화 파이프라인

> **상위 문서**: [../README.md](../README.md) — Genetics 로드맵
> **출처**: 외부 AI 리서치 (2026-03-21) — 검증 필요 항목 포함
> **용도**: SpeciesMarkerRecord 시드 데이터를 논문 근거 기반으로 생성하고 갱신하는 파이프라인 설계
>
> **관련 문서**:
> - [taxa-guide.md](taxa-guide.md) — 분류군별 마커 정성 데이터 (파이프라인 입력의 시드)
> - [databases.md](databases.md) — API 기술 가이드 (OpenAlex, NCBI E-utils)
> - [barcoding-service.md](barcoding-service.md) — 서비스 비전 & COI 실패 대응 엔진

---

## 핵심 원칙

서열 DB는 BOLD/NCBI가 담당하고,
**추천 DB는 우리 서비스가 "논문 근거를 구조화해서" 만든다.**

추천 DB의 성격:
- "이 종에는 COI가 잘 된다/안 된다"
- "안 되면 어떤 마커를 우선 추천할지"
- "그 판단의 근거가 몇 편의 논문에서 왔는지"
- "근거의 품질이 어느 정도인지"
- "추천의 신뢰도를 몇 점으로 줄지"

**정답 테이블이 아니라 근거 기반 추천 테이블.**

---

## 1. DB 스키마 (4 테이블)

### A. marker_evidence_paper — 논문 단위 원천 근거

| 컬럼 | 타입 | 설명 |
|------|------|------|
| paper_id | PK | |
| doi | string | |
| title | string | |
| year | int | |
| source | enum | openalex, pubmed, manual |
| taxon_name | string | |
| rank | enum | species, genus, family |
| marker_name | string | COI, cytb, D-loop 등 |
| claim_type | enum | effective_discrimination, poor_resolution, recommended_alternative, insufficient_data |
| evidence_direction | enum | positive, negative, mixed |
| sample_size | int | |
| region_scope | string | |
| has_species_pair_test | bool | 종간 비교가 실제로 있었는지 |
| has_empirical_sequences | bool | |
| is_review | bool | |
| is_retracted | bool | |
| abstract_confidence | float | |
| manual_validated | bool | |

### B. taxon_marker_evidence_agg — 종/속/과 + 마커 단위 집계

| 컬럼 | 타입 | 설명 |
|------|------|------|
| taxon_name | string | |
| rank | enum | |
| marker_name | string | |
| positive_paper_count | int | |
| negative_paper_count | int | |
| mixed_paper_count | int | |
| weighted_support_score | float | |
| weighted_contra_score | float | |
| evidence_count_total | int | |
| latest_evidence_year | int | |
| coverage_level | string | |

### C. species_marker_recommendation — 사용자에게 보여줄 최종 결과

> SpeciesMarkerRecord (PLAN-MODULE-E) 인터페이스와 매핑되어야 함.

| 컬럼 | 타입 | 설명 | SpeciesMarkerRecord 매핑 |
|------|------|------|-------------------------|
| taxon_name | string | | `taxonName` |
| rank | enum | species, genus, family, order, class | `rank` |
| recommended_primary_marker | string | | `primaryMarker` |
| recommended_secondary_markers | string[] | | `secondaryMarkers` |
| coi_resolution | float | 0.0~1.0 — 서열 확보 후 종 해상도 | `coiResolution` |
| coi_amplification | float | 0.0~1.0 — 프라이머 증폭 성공률 | `coiAmplification` |
| coi_failure_reason | string | "" (신뢰 시) / 실패 사유 | `coiFailureReason` |
| threshold_species | float | 종 수준 임계값 (예: 0.97) | `thresholds.species` |
| threshold_genus | float | 속 수준 임계값 (예: 0.90) | `thresholds.genus` |
| edna_marker | string | eDNA 용 마커 (예: "12S") | `ednaMarker` |
| degraded_marker | string | 분해 시료용 마커 (예: "mini-COI") | `degradedMarker` |
| recommendation_confidence | int | 0~100 — 추천 자체의 신뢰도 | (추가 필드) |
| evidence_count_total | int | 근거 논문 수 | (추가 필드) |
| latest_evidence_year | int | 최신 근거 연도 | (추가 필드) |
| last_updated_at | datetime | | (추가 필드) |

### D. taxonomy_alias — 동의어/오타/구 학명 처리

> **주의**: Module A (WoRMS/FishBase)에 이미 종 정보 + 학명 체계가 있음.
> 이 테이블은 Module A가 커버하지 못하는 비어류/비해양 분류군용.
> Module A 데이터와 중복되지 않도록 scope 구분 필요.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| submitted_name | string | 사용자 입력 학명 |
| accepted_name | string | 정식 학명 |
| source_authority | string | WoRMS, NCBI Taxonomy, GBIF 등 |

---

## 2. 논문 자동 수집 파이프라인

### 2-1. 수집원 우선순위

| 순서 | 소스 | 역할 |
|------|------|------|
| 1차 | **OpenAlex** | 대량 메타데이터 (DOI, 연도, 인용수, abstract) |
| 2차 | **NCBI PubMed / Nucleotide** | 생물학 논문 보강. 배치 수집은 E-utilities History 서버 사용 |
| 3차 | **수동 큐레이션** | 문제 taxa (참치, 상어, 근연종) 사람 검토 필수 |

### 2-2. 검색 질의 템플릿

종명 하나만 검색하면 잡음이 많으므로 구조화 필요.

예: Thunnus
```
"Thunnus" AND (COI OR "cytochrome oxidase I" OR barcode)
"Thunnus" AND ("D-loop" OR "control region" OR cytb)
"Thunnus" AND ("species identification" OR discrimination OR barcoding)
"Thunnus" AND (introgression OR "recent divergence" OR phylogeny)
```

OpenAlex works API ([공식 필터 문서](https://developers.openalex.org/api-entities/works/filter-works)):
- 인증: **API key 필수** (2026-02-13~, 구 polite pool 폐지)
- Rate limit: 일일 기준 — list 10,000건, search 1,000건 (초당 제한 없음)
- 필터 예: `filter=has_abstract:true,is_retracted:false,from_publication_date:2011-01-01`
- `is_retracted`: boolean (확인됨), `has_abstract`: 필터 전용 (응답은 `abstract_inverted_index`)

### 2-3. 수집 필터

**포함 우선:**
- 최근 15년 논문
- DOI 또는 PMID 보유
- abstract 보유
- 원저 중심

**감점/제외:**
- is_retracted = true (OpenAlex 필드)
- 단순 종 목록 보고
- marker 비교 아닌 다른 주제에서 키워드만 걸린 경우

---

## 3. 논문에서 주장(claim) 추출

논문마다 5개 질문에 답하도록 추출:

1. 어떤 taxon을 다루는가
2. 어떤 marker를 평가했는가
3. COI가 종 구분에 유효하다고 했는가, 부족하다고 했는가
4. 대체 marker를 추천했는가
5. 실제 데이터 기반 실험인가, 리뷰인가

**추출 방식**: LLM + 규칙 혼합. LLM은 **초안 생성기**이지 최종 판정자가 아님.

> **미정의 사항 (구현 시 결정 필요)**:
> - LLM 선택: Claude API 사용 시 비용 추정 필요 (논문 1건 abstract ≈ 500 토큰 입력)
> - 실행 환경: 로컬 Python 스크립트 (`.venv-skills/`)에서 Claude API 호출
> - abstract만으로 5개 질문 전부 답변 가능한지 파일럿 필요 (marker 이름이 abstract에 없는 논문 존재)
> - Phase 1에서는 LLM 불필요 — 수동 JSON화로 충분

추출 예시 출력:
```json
{
  "taxon_name": "Thunnus",
  "marker_name": "COI",
  "claim_type": "poor_resolution",
  "evidence_direction": "negative",
  "alternative_markers": ["D-loop", "cytb"],
  "sample_size": 84,
  "has_species_pair_test": true,
  "manual_review_needed": true
}
```

---

## 4. 신뢰성 점수화 알고리즘

### 4-1. 논문 단위 품질 점수 (paper_quality_score)

> **주의**: 아래 가중치는 미검증 초안값. 파일럿 테스트(20개 taxon) 후 조정 필수.
> is_retracted = true인 논문은 점수화하지 않고 **수집 단계에서 제외** (섹션 2-3).

```
paper_quality_score =
  base (1.0)
  + sample_size_score      min(log2(n+1)/4, 1.0)
  + recency_score          0.0 ~ 1.0
  + citation_score         0.0 ~ 1.0
  + empirical_bonus        0.7 (실제 서열 실험 포함)
  + species_pair_bonus     0.6 (근연종 비교 명시적)
  - review_only_penalty    0.4
  - ambiguity_penalty      0.3
```

서비스 정책값 (파일럿 후 조정).

### 4-2. 마커 지지 점수 (support_score)

```
support_score = Sum(paper_quality_score x direction_weight x relevance_weight)
```

| direction_weight | 조건 |
|-----------------|------|
| +1 | COI 유효 |
| -1 | COI 부족 |
| +/-0.3 | 혼합 결과 |

| relevance_weight | taxon 거리 |
|-----------------|------------|
| 1.0 | 종 직접 근거 |
| 0.7 | 같은 속 |
| 0.4 | 같은 과 |

### 4-3. COI 신뢰도 점수 (coi_resolution)

> SpeciesMarkerRecord의 `coiResolution` (0.0~1.0)에 매핑.
> 사용자 표시 시 x100 하여 0~100 스케일 사용.

```
weighted_positive = Sum(paper_quality_score x relevance_weight)  -- direction=positive인 논문만
weighted_negative = Sum(paper_quality_score x relevance_weight)  -- direction=negative인 논문만
weighted_mixed    = Sum(paper_quality_score x relevance_weight x 0.3) -- direction=mixed

coi_resolution = weighted_positive / (weighted_positive + weighted_negative + weighted_mixed)
```

> **최소 근거 조건**: evidence_count_total < 3이면 점수를 계산하지 않고
> "근거 부족 (insufficient evidence)"으로 표시. 임의 점수 생성 방지.

| 점수 | 해석 |
|------|------|
| 80~100 | COI 매우 적합 |
| 60~79 | 대체로 적합 |
| 40~59 | 경계 |
| 20~39 | 종 수준 판별 주의 |
| 0~19 | COI 비추천 |

### 4-4. 추천 confidence

COI 점수와 별개. 추천 자체의 신뢰도:

```
recommendation_confidence = f(
  evidence_count_total,        # 논문 수
  weighted_consistency,        # 결론 일관성
  latest_evidence_year,        # 최신성
  taxon_directness,            # 해당 종 직접 근거 비율
  human_validation_ratio       # 사람 검수 비율
)
```

---

## 5. 검증 장치 (3단계)

### 5-1. 추출 검증

| 단계 | 방법 |
|------|------|
| 1차 | 규칙 추출 (title/abstract에서 barcoding, species identification, COI, cytb 등) |
| 2차 | LLM 구조화 (논문 주장 JSON 추출) |
| 3차 | 사람 검토 큐 (아래 조건 시 무조건 수동) |

**수동 검토 트리거:**
- negative evidence가 강한데 논문 수 적음
- 긍정/부정 심하게 충돌
- 상업적으로 민감한 종
- 규제/위판/식품 위조 이슈 종

### 5-2. 자동 제외/감점 규칙

- is_retracted = true → 제외 또는 큰 감점
- 초록만 있고 핵심 결과 불명확
- marker 비교 아닌 단순 종 보고
- taxon이 질문 종과 너무 멂

### 5-3. 사용자 표시 원칙

**절대 안 됨**: "정답은 D-loop입니다"

**올바른 표현**:
- "현재 수집된 근거 기준으로 D-loop가 우선 추천됩니다"
- "직접 근거 6편, 같은 속 근거 9편"
- "신뢰도 82/100"

---

## 6. 운영 파이프라인

> **스택 제약**: BioHub는 Cloudflare Workers(서버리스) + Turso + 1인 개발.
> 전용 배치 서버(Celery/Redis)가 없으므로 아래 2가지 실행 환경으로 구분.

### 실행 환경

| 환경 | 용도 | 제약 |
|------|------|------|
| **로컬 스크립트** (Python, `.venv-skills/`) | 논문 수집 + claim 추출 + 점수 계산 | 수동 실행, 개발자 PC |
| **Workers Cron Trigger** | 소규모 재계산 (집계 갱신) | wall-clock 15분, CPU 30s~15분 ([공식 문서](https://developers.cloudflare.com/workers/configuration/cron-triggers/)) |
| **Tauri 데스크탑** (향후) | CORS 없이 API 직접 호출, 로컬 DB | 사용자별 IP 분산 |

### 배치 주기 (현실적)

| 작업 | 주기 | 실행 환경 |
|------|------|----------|
| OpenAlex 논문 수집 | 필요 시 수동 | 로컬 Python 스크립트 |
| PubMed 보강 | 필요 시 수동 | 로컬 Python 스크립트 |
| taxon-marker 집계 재계산 | 데이터 갱신 후 | Workers Cron 또는 로컬 |
| 사람 검토 | 데이터 갱신 후 | 수동 (1인 개발 현실) |

> NCBI 대량 작업: E-utilities History 서버 + 배치 retrieval 권장.
> [E-utilities 공식 문서](https://www.ncbi.nlm.nih.gov/books/NBK25497/)

### 처리 흐름

```
taxon 목록 준비
  ↓
OpenAlex / PubMed 수집 (로컬 Python, API key 필수)
  ↓
중복 제거 (DOI, PMID 기준)
  ↓
논문별 주장 추출 (규칙 + LLM)
  ↓
품질 점수 계산
  ↓
taxon-marker 집계
  ↓
recommendation JSON 생성
  ↓
낮은 confidence 항목 → 수동 검토
  ↓
정적 JSON으로 빌드에 포함 또는 Turso에 저장
```

---

## 7. 구현 단계

| Phase | 범위 | 내용 |
|-------|------|------|
| **1** | 최소 | [02-taxa-guide.md](02-taxa-guide.md) 정성 데이터 → **수동 JSON화** → SpeciesMarkerRecord 시드 생성. 20~30 taxon. 파이프라인 불필요 |
| **2** | 반자동 | 문제 taxon 대상 OpenAlex 수집 스크립트(로컬 Python) + title/abstract 기반 claim 추출 + 수동 검토 |
| **3** | 확장 | PubMed 연결, DOI/PMID 중복 정리, 점수 자동 재계산, Turso 저장 |
| **4** | 고도화 | full text 범위 확장, LLM claim 추출 자동화, 벡터 검색 |

> **Phase 1은 이 파이프라인을 쓰지 않음.**
> 02-taxa-guide.md의 분류군별 정성 데이터가 이미 있으므로,
> 이를 SpeciesMarkerRecord JSON으로 변환하는 것이 첫 단계.
> 자동 파이프라인은 Phase 2부터.

---

## 8. 예시: Thunnus 최종 레코드

> **주의**: 아래는 구조 설명용 **가공 예시**. 실제 논문 수치 아님. 구현 시 논문 DOI 기반 실측 필요.

SpeciesMarkerRecord 형식으로 변환한 예시:
```json
{
  "taxonName": "Thunnus",
  "rank": "genus",
  "primaryMarker": "CR",
  "secondaryMarkers": ["Cyt b", "SNP panel"],
  "coiResolution": 0.24,
  "coiAmplification": 0.95,
  "coiFailureReason": "최근 진화 + mtDNA introgression으로 종간 barcode gap 부재",
  "thresholds": { "species": 0.97, "genus": 0.90 },
  "ednaMarker": "12S",
  "degradedMarker": "mini-COI",
  "_meta": {
    "recommendation_confidence": 81,
    "evidence_count_total": 13,
    "direct_negative_papers": 7,
    "direct_positive_papers": 1,
    "genus_level_negative_papers": 5,
    "latest_evidence_year": 2025,
    "last_updated_at": "2026-03-21"
  }
}
```

> `_meta`는 프론트 표시용 부가 정보. SpeciesMarkerRecord 인터페이스 외 확장 필드.

---

## 9. 운영 원칙 5가지

1. **종 직접 근거와 속/과 근거를 분리**
2. **긍정 근거보다 부정 근거가 더 중요할 수 있음**
3. **논문 수보다 논문 품질 가중치가 중요**
4. **LLM 자동 추출은 반드시 검수 큐와 함께**
5. **최종 출력은 "권고"이지 "단정"이 아님**

---

## 검증 필요 항목

- [x] OpenAlex works API 필터 필드 최신 확인 → 아래 검토 결과 참조
- [ ] paper_quality_score 가중치 파일럿 테스트 (20개 taxon)
- [ ] LLM claim 추출 정확도 측정 (precision/recall)
- [ ] Turso vs D1 스키마 적합성 비교
- [ ] taxonomy_alias 데이터 출처 선정 (WoRMS? NCBI Taxonomy?)

---

## 검토 결과 (2026-03-21)

> 외부 AI 리서치 원본을 BioHub 실제 스택/API 문서 기준으로 검토한 결과.

### A. BioHub 스택과 안 맞는 부분 (운영 파이프라인 섹션 6)

이 문서의 운영 파이프라인은 **팀 단위 + 전용 서버**를 전제로 설계되어 있음.
BioHub는 서버리스(Cloudflare Workers + Pages) + Turso + 소규모.

| 문서 제안 | BioHub 실제 | 문제 |
|-----------|------------|------|
| Celery + Redis 큐 | Cloudflare Workers | persistent server 없음 |
| "매일 밤 재계산" cron | Workers Cron Triggers | 가능하나 제약 있음 (아래 참조) |
| "주 1회 OpenAlex 수집" | 배치 서버 없음 | 어디서 실행? |
| "사람 검토 큐 주 2회" | 1인 개발 | 지속적 인력 투입 비현실적 |

**Cloudflare Workers 실제 제한** ([공식 문서](https://developers.cloudflare.com/workers/platform/limits/)):

| 항목 | Free | Paid ($5/mo) |
|------|------|-------------|
| HTTP 요청 CPU | 10ms | **기본 30s, 최대 5분** |
| Cron Trigger CPU | 10ms | 30s (< 1시간 간격) / 15분 (>= 1시간 간격) |
| Cron Trigger wall-clock | — | **최대 15분** |
| Cron 수 | 5개 | 250개 |
| 월 CPU 할당 | — | 30M CPU ms 포함 |

- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Queues Limits](https://developers.cloudflare.com/queues/platform/limits/) — 배치 처리용 대안

> **참고**: CLAUDE.md의 "CPU 10ms/req(무료), 50ms(유료)"는 **구 Bundled 플랜** 기준.
> 현재 Workers Paid는 요청당 최대 5분 CPU 사용 가능. 문서 업데이트 필요.

**현실적 대안**: Workers Cron Trigger(15분 wall-clock)로 소규모 배치는 가능.
대규모 수집은 Tauri 데스크탑 또는 별도 스크립트(로컬 실행) 검토.

### B. DB 스키마 vs SpeciesMarkerRecord 불일치 — 수정됨

~~PLAN-MODULE-E의 TypeScript 인터페이스와 테이블 C 필드가 달랐음.~~
→ **테이블 C를 SpeciesMarkerRecord에 맞춰 재정의 완료** (섹션 1-C 참조).
→ 예시 JSON도 SpeciesMarkerRecord 형식으로 변환 (섹션 8 참조).

### C. 점수화 알고리즘 문제 — 부분 수정됨

**4-1. paper_quality_score**:
- ~~`retraction_penalty = 2.0` 문제~~ → **수정**: retracted 논문은 수집 단계에서 제외로 변경. 점수화 대상 아님
- 가중치는 여전히 **임의값** — 파일럿 테스트 전에는 참고만

**4-3. coi_resolution (구 coi_reliability_score)**:
- ~~단순 sum vs weighted 불일치~~ → **수정**: weighted 값으로 통일
- ~~논문 1편 = 100/0 문제~~ → **수정**: evidence_count_total < 3이면 "근거 부족" 표시, 점수 미생성

### D. LLM claim 추출 — 미정의 사항 주석 추가됨

~~구체적 사항 없었음~~ → **수정**: 섹션 3에 미정의 사항 주석 추가 (LLM 선택, 실행 환경, 비용, 파일럿 필요성).
Phase 1에서는 LLM 불필요(수동 JSON화)이므로 Phase 2 진입 시 결정.

### E. 규모 대비 과잉 설계 — 구현 단계 조정됨

~~Phase 1부터 파이프라인 사용~~ → **수정**: Phase 1 = 수동 JSON화, Phase 2부터 반자동.
섹션 7 구현 단계를 4단계로 세분화. 이 파이프라인은 Phase 2+ 참고용.

### F. OpenAlex API — 검증 완료

| 항목 | 문서 내용 | 실제 (검증됨) |
|------|----------|-------------|
| 인증 | 명시 안 됨 | **API key 필수** (2026-02-13~, 구 polite pool 폐지) |
| `is_retracted` | 언급됨 | **확인됨** — works 최상위 boolean 필드 |
| `has_abstract` | 언급됨 | **확인됨** — 필터로 사용 가능 (응답에는 `abstract_inverted_index`) |
| Rate limit | 명시 안 됨 | 일일 기준: list 10,000건, search 1,000건, 초당 제한 없음 |

- [OpenAlex Rate Limits & Auth](https://developers.openalex.org/how-to-use-the-api/rate-limits-and-authentication)
- [Works Object](https://developers.openalex.org/api-entities/works/work-object)
- [Works Filter](https://developers.openalex.org/api-entities/works/filter-works)
- [Filtering Guide](https://developers.openalex.org/guides/filtering)

### G. NCBI API — 검증 완료

| 항목 | 문서 내용 | 실제 (검증됨) |
|------|----------|-------------|
| E-utils key 없음 | 3 req/sec | **맞음** |
| E-utils key 있음 | 10 req/sec | **맞음** |
| BLAST 제출 | 명시 안 됨 | **10초당 1건** |
| BLAST 폴링 | 명시 안 됨 | **분당 1회** |
| BLAST 일일 | 명시 안 됨 | **100건/24시간** 초과 시 제한/차단 |
| 상용 별도 티어 | 없음 | **맞음** — 무료, 고빈도 시 eutilities@ncbi.nlm.nih.gov 문의 |

- [E-utilities General Introduction](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- [API Key Announcement](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
- [BLAST Developer Info](https://blast.ncbi.nlm.nih.gov/doc/blast-help/developerinfo.html)
- [NCBI Data Policies](https://www.ncbi.nlm.nih.gov/home/about/policies/)

> **BLAST 100건/일 제한이 핵심 병목**: 파이프라인에서 BLAST를 논문 수집에 직접 쓰지는 않지만,
> E-0 사용자 서비스에서 BLAST 호출이 일일 100건이면 캐싱 필수 (REFERENCE-E0 문서와 일치).

### H. 누락 항목 — 부분 해결

1. **파이프라인 출력 → 앱 연결**: → **수정**: 섹션 6 처리 흐름에 "정적 JSON으로 빌드 포함 또는 Turso 저장" 추가
2. **taxonomy_alias vs Module A 중복**: → **수정**: 섹션 1-D에 Module A와의 scope 구분 주석 추가
3. **Thunnus 예시(섹션 8)**: → **수정**: "가공 예시" 경고 + SpeciesMarkerRecord 형식으로 변환

### I. 유지 가치 있는 부분

| 섹션 | 판정 | 사유 |
|------|------|------|
| 핵심 원칙 | 유지 | "서열 DB는 BOLD/NCBI, 추천 DB는 우리가 만든다" — 방향 맞음 |
| claim 추출 5개 질문 (섹션 3) | 유지 | 논문에서 뽑을 정보 정의 |
| 사용자 표시 원칙 (5-3) | 유지 | "정답" 아닌 "권고" 표현 — 중요 |
| 운영 원칙 5가지 (섹션 9) | 유지 | 그대로 적용 가능 |
| DB 스키마 (섹션 1) | 참고만 | 방향은 맞으나 SpeciesMarkerRecord 매핑 필요 |
| 점수 공식 (섹션 4) | 참고만 | 임의값 + 일관성 문제, 파일럿 필수 |
| 운영 파이프라인 (섹션 6) | 수정 필요 | BioHub 스택에 안 맞음 |

### 종합 판정

> **본문 수정 완료 항목**: 테이블 C ↔ SpeciesMarkerRecord 매핑, 점수 공식 일관성,
> retracted 제외 정책, 운영 파이프라인 BioHub 스택 반영, 구현 단계 세분화,
> OpenAlex API 정보 갱신, 예시 JSON 형식 통일, 미정의 사항 주석.
>
> **여전히 미검증**: 점수 가중치(파일럿 필요), LLM 정확도, OpenAlex search 일일 1,000건 한도 실용성.
>
> **Phase 1은 이 파이프라인 불필요** — 02-taxa-guide.md 수동 JSON화가 먼저.
> Phase 2+에서 이 문서의 수집/추출/점수화 설계를 참고.

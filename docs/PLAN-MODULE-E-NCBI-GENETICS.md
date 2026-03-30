# Module E: NCBI 연결 + 유전학 분석 — 상세 구현 계획

**작성일**: 2026-03-21
**목적**: Phase 15-5 구현 전, Module E 기능의 최신 사용 현황 검증 + 구현 가능성 확인
**기반**: ROADMAP.md Phase 15-5 (NCBI + 개체군 유전학)

---

## 검증 기준

| 기준 | 설명 |
|------|------|
| **최근 사용 빈도** | 2023-2025 논문에서 실제로 많이 사용되는가? |
| **Python 구현 가능성** | Pyodide (scipy/numpy/scikit-learn) 또는 Cloudflare Workers로 구현 가능한가? |
| **기존 도구와 차별성** | Bio-Tools 12개, 43개 통계 메서드와 겹치지 않는가? |
| **타겟 사용자 관련성** | 수산과학/분자생물학 연구자가 실제로 필요로 하는가? |
| **정통성** | 검증된 방법론인가? |

---

## 최종 판정 요약

### 확정 (구현 대상) — 7개

| # | 기능명 | 분류 | 판정 근거 | 구현 방법 |
|---|--------|------|----------|----------|
| 1 | DNA 바코딩 종 동정 | E-0 | 수산물 위변조 검사, 계통분류 표준. COI 단일 마커로 대부분 종 동정 가능 | BOLD API + NCBI BLAST API (Workers 프록시) |
| 2 | 서열 기본 통계 | E-1 | GC content, 길이 분포는 모든 서열 분석 논문의 첫 단계 | Pyodide (순수 Python 계산) |
| 3 | 다종 유사도 행렬 + 클러스터링 | E-1 | 여러 종 동일 유전자 비교 → 거리행렬 → 클러스터 표준 워크플로우 | Pyodide (scipy) |
| 4 | 계통수 시각화 (UPGMA/NJ) | E-1 | 간단한 수준의 계통수는 연구자 직관 확인용으로 여전히 유용 | Pyodide (scipy.cluster.hierarchy) + D3.js |
| 5 | Haplotype 빈도 분석 | E-2 | 미토콘드리아 DNA 연구 필수. 개체군 구조의 첫 번째 출력 | Pyodide (numpy) |
| 6 | Fst (집단 분화도) | E-2 | 개체군 유전학 핵심 통계. 수산 양식·자원 관리 연구에서 실제 사용 | Pyodide (numpy, Weir & Cockerham 공식) |
| 7 | AMOVA (분자분산분석) | E-2 | Fst와 세트로 사용. 집단간/집단내 분산 분해 표준 | Pyodide (numpy 순수 구현) |

> **주의**: Hardy-Weinberg, Mantel test는 이미 Bio-Tools 12개(#11, #12)에 포함됨 → 중복 구현 불필요.
> E-2 분석 시 Bio-Tools의 해당 분석으로 자연스럽게 연결 (크로스링크).

### 조건부 확정 — 2개

| # | 기능명 | 판정 | 근거 |
|---|--------|------|------|
| 8 | 유전적 다양성 지수 (π, Hd) | **조건부** | nucleotide diversity (π), haplotype diversity (Hd) — 개체군유전학 논문 표준이나, Haplotype 분석(#5) 구현 후 추가 여부 결정 |
| 9 | Haplotype network (MSN) | **조건부** | Minimum Spanning Network — TCS 알고리즘 구현 복잡도 높음. 시각화 라이브러리(D3.js) 커스텀 필요. Haplotype 빈도(#5) 완료 후 검토 |

### 제외 — 3개

| # | 기능명 | 제외 근거 |
|---|--------|----------|
| ~~A~~ | 서열 정렬 (Multiple Sequence Alignment) | NCBI BLAST / Clustal이 이미 최고. Pyodide에서 대규모 정렬은 성능 한계 |
| ~~B~~ | 계통수 부트스트랩 검증 | 구현 복잡도 대비 사용 빈도 낮음. 전용 도구(MEGA, IQ-TREE)가 훨씬 우수 |
| ~~C~~ | SNP genotyping / GWAS | 대용량 데이터 필수 (수천 SNP × 수백 샘플). 브라우저 환경 성능 한계 |

---

## 확정 기능 상세

### E-0. DNA 바코딩 종 동정 (신규 추가)

> **참고 자료**: [genetic-identification/REFERENCE-E0-BARCODING-SERVICE.md](genetic-identification/REFERENCE-E0-BARCODING-SERVICE.md) — 시장 분석, COI 실패 대응 엔진, 캐싱/rate limit 아키텍처, 상용화 비용

- **사용 맥락**: 서열 1개 입력 → 참조 DB 비교 → 종 동정
- **최근 현황**: 수산물 원산지/종 위변조 검사 표준. 계통분류 1차 스크리닝
- **지원 마커**:
  - COI (Cytochrome c oxidase I) — 동물 표준, BOLD 전용 DB
  - ITS (Internal Transcribed Spacer) — 균류/식물
  - 16S rRNA — 세균
  - rbcL / matK — 식물
- **데이터베이스**:
  - **NCBI BLAST API** — 1순위. 범용, 모든 마커 지원. API 테스트 완료 (2026-03-22)
  - **EBI BLAST API** — 백업. NCBI 실패 시 자동 전환
  - **BOLD Portal API** — 메타데이터 조회용 (BIN, voucher). 종 동정 REST API 미공개 (v5)
- **출력**:
  - 상위 10개 매칭 종 + 유사도 % + 신뢰도 등급 (Decision Engine 4단계)
  - 분류군 감지 → 맞춤 안내 (참치/양서류/이매패류 등)
  - 실패 시: 원인 + 대안 마커 + 근거
- **구현**: Cloudflare Workers 프록시 (`/api/ncbi-blast`) + D1 캐시
- **기술 제약**:
  - BOLD API: CORS 미지원 → Workers 필수. 동기 응답
  - NCBI BLAST: 비동기 방식 — `qblast()` 제출 → RID(Request ID) 반환 → 결과 polling 필요
    Workers에서 RID 저장 후 클라이언트가 `/api/ncbi-blast/result?rid=XXX`로 polling
    응답 대기 중 progress 표시 (통상 10~30초)

```
[FASTA 서열 입력]
    │
    ├─ D1 캐시 체크 ─→ 히트 → 즉시 반환 (캐시 뱃지)
    │
    └─ 미스 → [NCBI BLAST API] (Workers 프록시, 초당 스로틀)
                    │
              [RID 반환 → 폴링 → 결과 수신]
                    │         └─ 실패 → [EBI BLAST 자동 전환]
                    │
              [Decision Engine] (4단계: 고신뢰/모호/저신뢰/실패)
                    │
              [분류군 감지] → 맞춤 안내 카드 (참치, 양서류 등)
                    │
              [보고서 생성 + 다음 행동 버튼]
```

> 상세 UX 플로우: [REFERENCE-E0 섹션 8](genetic-identification/REFERENCE-E0-BARCODING-SERVICE.md)

#### Marker Recommendation Engine — 데이터 스키마

> **데이터 출처**: [genetic-identification/02-taxa-guide.md](genetic-identification/02-taxa-guide.md) 요약 매트릭스

**TypeScript 인터페이스** (구현 시 사용):

```typescript
interface SpeciesMarkerRecord {
  taxonName: string;            // "Thunnus" | "Amphibia" | "Insecta"
  rank: "species" | "genus" | "family" | "order" | "class";
  primaryMarker: string;        // "CR" | "COI" | "COI+16S"
  secondaryMarkers: string[];   // ["ITS1", "Cyt b"]
  coiResolution: number;        // 0.0~1.0 — 서열 확보 후 종 해상도 (barcode gap 기반)
  coiAmplification: number;     // 0.0~1.0 — 프라이머 증폭/시퀀싱 성공률
  coiFailureReason: string;     // "" (신뢰 시) | "최근 진화 + mtDNA introgression"
  thresholds: {
    species: number;            // 0.97 (일반) | 0.90 (양서류)
    genus: number;              // 0.90
  };
  ednaMarker: string;           // "12S" | "COI" | "12S+16S"
  degradedMarker: string;       // "mini-COI" | "Cyt b 단편"
}
// coiResolution: "깨끗한 서열을 얻었을 때 종 구분이 되는가?"
// coiAmplification: "프라이머로 서열을 얻을 수 있는가?"
// Decision Engine은 둘 다 참조: 증폭 실패 → 프라이머 문제 안내, 해상도 낮음 → 대안 마커 추천
```

**시드 데이터**: 구현 시 별도 파일로 작성 예정. 각 수치에 논문 출처(DOI)를 반드시 첨부할 것.
정성적 참고 데이터는 [02-taxa-guide.md](genetic-identification/02-taxa-guide.md) 요약 매트릭스 참조.

---

### E-1. NCBI 서열 조회 + 기본 분석

#### 1. NCBI Entrez 연동

- **입력**: 종명 또는 유전자명
- **API**: NCBI E-utilities (esearch → efetch)
- **출력**: 유전자 목록, FASTA 서열, 관련 PubMed 논문
- **구현**: Cloudflare Workers 프록시 (`/api/ncbi`)
- **NCBI API key**: Workers 환경변수로 관리 (rate limit 3→10 req/s 향상)

#### 2. 서열 기본 통계

- **입력**: FASTA 서열 (단일 또는 다중)
- **출력**:
  - GC content (%)
  - 서열 길이 분포 (히스토그램)
  - N 비율 (불확실 염기)
  - 뉴클레오타이드 조성 (A/T/G/C %)
- **구현**: Pyodide 순수 Python (외부 라이브러리 불필요)

```python
# GC content
gc = (seq.count('G') + seq.count('C')) / len(seq) * 100
```

#### 3. 다종 유사도 행렬 + 클러스터링

- **입력**: 여러 종의 동일 유전자 FASTA
  - 정렬된 서열(aligned FASTA) 권장 — 컬럼별 비교로 정확한 유사도
  - 미정렬 서열 입력 시: 길이 기반 단순 유사도로 계산 + 경고 메시지 표시 ("정렬 후 사용 권장")
- **유사도 계산**: pairwise identity (%) — 동일 위치 뉴클레오타이드 비율
- **출력**: 유사도 행렬 (heatmap) → 기존 클러스터 분석 엔진으로 연결
- **구현**: numpy (행렬 연산)

#### 4. 계통수 시각화 (UPGMA / NJ)

- **사용 맥락**: 유사도 행렬 → 계통 관계 시각화 (직관 확인용)
- **알고리즘**:
  - UPGMA (Unweighted Pair Group Method with Arithmetic mean)
  - NJ (Neighbor-Joining) — 더 정확, 불균등 진화 속도 허용
- **구현**: `scipy.cluster.hierarchy` (UPGMA) + numpy 순수 구현 (NJ)
- **시각화**: D3.js (`d3-hierarchy`, `d3-shape`, `d3-selection` 모듈만 추가, ~20KB)
  - `"use client"` + `useEffect` 패턴 (기존 Plotly 컴포넌트와 동일)
  - 전체 `import * as d3` 금지 — 모듈별 import만 허용
- **주의**: 부트스트랩 검증 미지원 (전용 도구 권장 안내 포함)

---

### E-2. Population Genetics (개체군 유전학)

#### 5. Haplotype 빈도 분석

- **입력**: 미토콘드리아 DNA haplotype 데이터 (샘플 × haplotype 행렬)
- **출력**:
  - Haplotype 목록 + 빈도 + 집단별 분포
  - 파이 차트 / 막대 차트
- **구현**: numpy (Pyodide) — pandas 불필요, 로딩 오버헤드 회피

#### 6. Fst (집단 분화도)

- **수식**: Weir & Cockerham (1984) — 표준 추정량
- **사용 맥락**: 두 집단간 유전적 분화 정도 (0=동일, 1=완전분화)
- **최근 현황**: 수산 자원 관리, 양식 품종 판별 연구에서 지속 사용
- **핵심 출력**: 집단쌍별 Fst 행렬 + p-value (순열 검정)
- **구현**: numpy 순수 구현 (Weir & Cockerham 공식)

```
Weir & Cockerham (1984) θ 추정량:
θ = (MSP - MSI) / (MSP + (nc-1)·MSI)

MSP: 집단간 평균 제곱합
MSI: 집단내 개체간 평균 제곱합
nc: 샘플 수 보정 계수

※ Wright의 단순화 버전(Fst = (Ht-Hs)/Ht)과 수치 다름 — θ가 표준
```

#### 7. AMOVA (Analysis of Molecular Variance)

- **사용 맥락**: 분산을 집단간/집단내/개체내로 분해 → 유전 구조 위계 파악
- **최근 현황**: Fst와 세트 사용. 2024-2025 집단유전학 논문 표준
- **핵심 출력**: 분산 성분 (%), Phi 통계량, p-value (순열 검정)
- **구현**: numpy 순수 구현 (거리행렬 기반 분산 분해)
- **기술 제약**: 전용 라이브러리 (Arlequin, pegas) Pyodide 미지원 → 공식 직접 구현

---

## 기술 아키텍처

### 인프라

```
[브라우저 (Pyodide)]
    ├─ 서열 기본 통계 (#2)
    ├─ 유사도 행렬 (#3)
    ├─ 계통수 계산 (#4, scipy.cluster.hierarchy) → D3.js 렌더링
    ├─ Haplotype 빈도 (#5)
    ├─ Fst (#6)
    └─ AMOVA (#7)

[Cloudflare Workers]
    ├─ /api/bold      → BOLD Systems API (COI 바코딩)
    ├─ /api/ncbi      → NCBI Entrez (서열 조회)
    └─ /api/ncbi-blast → NCBI BLAST (종 동정)
```

### 데이터 입력 형식

| 기능 | 입력 형식 | 예시 |
|------|----------|------|
| DNA 바코딩 | FASTA 텍스트 또는 파일 | `>sample1\nATGCTG...` |
| 서열 기본 통계 | FASTA (단일/다중) | — |
| 다종 유사도 | FASTA (정렬된 다중 서열) | aligned FASTA |
| 계통수 | 유사도 행렬 (다종 유사도 #3 출력 사용) | — |
| Haplotype 분석 | CSV (샘플명, 집단, haplotype) | — |
| Fst / AMOVA | CSV (샘플명, 집단, 대립유전자) | — |

---

## 페이지 구성 및 UI 구현 전략

**경로**: `/bio-tools/genetics` — Bio-Tools 6번째 페이지로 추가

### 탭 구조

```
/bio-tools/genetics
├─ [종 동정]        DNA 바코딩 — FASTA 입력 → BOLD/BLAST → 종명 + 신뢰도
├─ [서열 분석]      NCBI 조회 → 기본통계 + 유사도 행렬 + 계통수
├─ [개체군 유전학]  Haplotype 빈도 + Fst + AMOVA
└─ [확장 예정]      (아래 후보 목록 참조)
```

### 탭 간 데이터 흐름

```
[종 동정] 결과 종명
    └─→ [서열 분석] NCBI 자동 검색으로 연결 가능

[서열 분석] 유사도 행렬
    └─→ [개체군 유전학] Fst/AMOVA 입력으로 연결 가능

[종 동정] Best match 종명
    └─→ Module A (WoRMS/FishBase) 종 상세 정보로 이동
```

### 기존 컴포넌트 활용 (shadcn/ui 기반, 신규 개발 최소화)

| 필요한 UI 요소 | 사용할 기존 컴포넌트 | 비고 |
|--------------|-------------------|------|
| 탭 구조 | `components/ui/tabs.tsx` | — |
| FASTA 파일 업로드 | `components/ui/file-upload.tsx` | CSV 파싱 로직만 FASTA 파서로 교체 |
| 서열 직접 붙여넣기 | `components/ui/textarea.tsx` | — |
| 결과 테이블 | `components/ui/table.tsx` | — |
| 로딩 / 진행률 | `components/ui/loading-spinner.tsx`, `progress.tsx` | BLAST polling 대기 시 |
| 에러 표시 | `components/common/InlineError.tsx` | API 실패, 파싱 오류 |
| 단계 표시 | `components/common/StepIndicator.tsx` | 조회 → 분석 → 결과 |
| 카드 레이아웃 | `components/ui/card.tsx` + `common/card-styles.ts` | — |
| 배지 (신뢰도 등급 등) | `components/ui/badge.tsx` | — |

### 신규 개발 필요한 것

| 항목 | 위치 | 내용 |
|------|------|------|
| FASTA 파서 | `lib/data-processing` | CSV 파서 옆에 추가. 다중 서열 파싱, 헤더/서열 분리 |
| 계통수 시각화 | `components/visualizations/` | D3.js dendrogram |
| Haplotype network | `components/visualizations/` | D3.js MSN (조건부, 나중에) |

### 기존 Bio-Tools 페이지와 다른 점

| | 기존 Bio-Tools (1~5페이지) | 유전학 페이지 |
|-|--------------------------|-------------|
| 입력 | CSV | FASTA(종 동정·서열 분석) + CSV(개체군 분석) |
| 데이터 흐름 | 업로드 → 즉시 분석 | API 조회 → 결과 → 추가 분석, 또는 직접 업로드 |
| 외부 의존 | 없음 (순수 Pyodide) | NCBI, BOLD (Workers 프록시) |
| 오프라인 | 완전 가능 | 종 동정·서열 조회 불가, 개체군 분석은 가능 |

---

## 확장 후보 (탭 추가 또는 기존 탭 내 기능 확장)

유사한 유전자 서열을 활용한 분석으로 자연스럽게 확장 가능한 항목:

| # | 기능명 | 내용 | 구현 방법 | 우선순위 |
|---|--------|------|----------|---------|
| E-3-1 | **보존 영역 분석** | 여러 종 정렬 서열에서 종간 공통 보존 구간 탐지 + 시각화 | numpy (컬럼별 동일도 계산) | 중 |
| E-3-2 | **Microsatellite (SSR) 분석** | 반복 단위 탐지 → 대립유전자 빈도 → 품종/집단 판별 | regex + numpy | 중 |
| E-3-3 | **분자 진화 (dN/dS)** | 동의/비동의 치환율 비율 → 양성/정화 선택압 판별 | numpy 순수 구현 (Nei-Gojobori) | 구현 복잡 (후순위) |
| E-3-4 | **유전적 다양성 지수 (π, Hd)** | nucleotide diversity (π), haplotype diversity (Hd) | numpy | 낮음 (조건부 #8) |
| E-3-5 | **Haplotype network (MSN)** | Minimum Spanning Network 시각화 | D3.js (TCS 알고리즘) | 낮음 (조건부 #9) |

> **구현 원칙**: 확장 항목도 BLAST/MSA 같은 대규모 서열 정렬은 하지 않음.
> 정렬된 서열(aligned FASTA)을 입력받아 통계 분석하는 것이 이 플랫폼의 역할.

### 장기 확장 방향: 계군/품종 판별 서비스

현재 Module E는 **종(species) 판별** + **분석 도구**(Fst, AMOVA 등)까지.
계군/품종 **판별 서비스**는 성격이 다름:

| 구분 | 종 판별 | 계군(population) 판별 | 품종(breed) 판별 |
|------|--------|---------------------|-----------------|
| 공개 참조 DB | BOLD, GenBank (풍부) | 거의 없음 | 거의 없음 |
| 필요한 것 | 서열 → DB 검색 | reference population 데이터셋 | SNP panel + breed registry |
| 데이터 소유 | 공개 | 개별 연구실/기관 | 산업체/정부 |
| 논문으로 커버 | 불필요 (DB 충분) | 부분적 (FST, haplotype 공개) | 제한적 (형식/마커 비표준) |

**현재 제공하는 것**: 사용자가 자기 데이터를 올려 Fst/AMOVA/Haplotype 분석하는 **도구**.
**장기 목표**: 논문 + 공개 데이터 축적으로 주요 종의 reference panel을 구축하여 **판별 서비스**로 확장.
단, reference DB 구축은 데이터 표준화 + 전문가 큐레이션이 필요한 별도 사업 영역.

---

## 구현 일정 (Phase 15-5, 수정판)

| 기능 | 기간 | 의존성 |
|------|------|--------|
| Workers 프록시 (BOLD, NCBI, BLAST) | 2일 | Phase 15-2 Workers 인프라 |
| DNA 바코딩 종 동정 UI + API 연동 | 2일 | Workers 완료 후 |
| 서열 기본 통계 | 1일 | — |
| 다종 유사도 행렬 + 클러스터링 | 1일 | — |
| 계통수 시각화 | 2일 | — |
| Haplotype 빈도 분석 | 1일 | — |
| Fst + AMOVA | 3일 | — |
| **합계** | **~12일 (2.5주)** | |

> 기존 ROADMAP의 2주 → 2.5주로 조정 (DNA 바코딩 신규 추가)

---

## 크로스링크 (다른 모듈과 연결)

| 연결 | 방향 | 내용 |
|------|------|------|
| Module A (종 정보 허브) | E → A | 바코딩 결과 종명으로 WoRMS/FishBase 자동 조회 |
| Bio-Tools #11 (Mantel test) | E → B | 유전 거리 행렬 → Mantel test로 지리 거리와 비교 |
| Bio-Tools #12 (Hardy-Weinberg) | E → B | Haplotype 데이터 → HWE 검정으로 연결 |
| Smart Flow (통계 엔진) | E → 통계 | 유사도 행렬 → 기존 클러스터 분석으로 전달 |

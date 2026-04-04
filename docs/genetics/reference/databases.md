# 종 판별 데이터베이스 & API 기술 가이드

**작성일**: 2026-03-21
**목적**: BioHub 유전적 종 판별 기능의 DB/API 통합 설계 레퍼런스
**원칙**: 서열 입력 → DB 자동 검색 → 결과 보고서 생성 파이프라인

**관련 문서**:
- [markers.md](markers.md) — DNA 바코딩 마커 총정리
- [taxa-guide.md](taxa-guide.md) — 분류군별 마커 선택 가이드
- [barcoding-service.md](barcoding-service.md) — E-0 바코딩 서비스 시장 분석 + 아키텍처

---

## 1. BOLD Systems (Barcode of Life Data Systems)

**URL**: https://www.boldsystems.org/ | 데이터 포털: https://portal.boldsystems.org/
**현황 (2025)**: 1,700만 표본, 1,400만 바코드, 2,180만 공개 레코드, 100만+ 종
**관리**: Centre for Biodiversity Genomics (캐나다)
**비용**: 무료
**인증**: 불필요 (공개 데이터)

### API 엔드포인트

#### A) Portal API (v4/v5, 현재 주력)

| 엔드포인트 | 용도 | 비고 |
|-----------|------|------|
| `POST /api/query/preprocessor` | 검색어 검증 | 범위:필드:용어 형식 |
| `POST /api/query` | 쿼리 실행 → query_id 반환 | 토큰 24시간 유효 |
| `GET /api/summary` | 바코드 메타데이터 집계 | BIN, 좌표, 마커, 표본 등 |
| `GET /api/documents/{query_id}/download` | 레코드 다운로드 | 1,000건/배치, 최대 1M건 |

- **기본 URL**: `https://portal.boldsystems.org/api/`
- **API 문서**: `https://portal.boldsystems.org/api/docs` (Swagger UI)
- **출력 형식**: JSON (BCDM), TSV (BCDM), TSV (Darwin Core)
- **쿼리 범위**: 분류 (계~아종), BIN, 지리, 기관, 프로젝트 코드, ID

#### B) ID Engine (종 동정)

| 버전 | URL | 상태 |
|------|-----|------|
| v3/v4 | `http://v4.boldsystems.org/index.php/Ids_xml?db=COX1_SPECIES_PUBLIC&sequence=...` | **2025.08 폐지** |
| v5 | `https://id.boldsystems.org/` | 현재 (웹 인터페이스, REST API 문서화 진행 중) |

**ID Engine DB**:
- `COX1` — 전체 COI ≥500bp (미검증 포함)
- `COX1_SPECIES` — 종 수준 ≥500bp
- `COX1_SPECIES_PUBLIC` — BOLD/GenBank 공개 ≥500bp
- `COX1_L640bp` — ≥640bp

**v5 지원 마커**: COI-5P, matK, rbcL, ITS, 18S, 12S
**검색 모드**: Rapid (94% 유사도), Genus+Species (90%), Exhaustive (75%)
**입력**: Raw 뉴클레오티드 서열 (대소문자 무관)
**출력**: 최대 100개 매칭 (ProcessID, 동정명, 유사도 0-1, 표본 URL, 국가, GPS)

#### C) Legacy v3 API (참고용)

```
# 표본 데이터
http://v3.boldsystems.org/index.php/API_Public/specimen?taxon=Gadus&format=tsv

# 서열 (FASTA)
http://v3.boldsystems.org/index.php/API_Public/sequence?taxon=Gadus

# 통합 (표본+서열)
http://v3.boldsystems.org/index.php/API_Public/combined?taxon=Gadus&format=tsv
```

파라미터: `taxon`, `ids`, `bin`, `container`, `institutions`, `researchers`, `geo`, `marker`, `format`
복수 값: 파이프(`|`) 구분

### Rate Limit & CORS
- **Rate limit**: 공식 문서화 안 됨. Portal API 쿼리당 최대 1M건
- **CORS**: 미지원 → **서버 프록시 또는 데스크탑 앱 필수**

---

## 2. NCBI GenBank / BLAST

**URL**: https://www.ncbi.nlm.nih.gov/genbank/
**현황 (2025.03, Release 265.0)**: 55.6억 레코드, 41.96조 염기, 581,000 종
**비용**: 무료
**인증**: API 키 (무료, NCBI 계정에서 발급)

### A) E-utilities API

**기본 URL**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

| 유틸리티 | 엔드포인트 | 용도 |
|---------|-----------|------|
| ESearch | `esearch.fcgi` | DB 검색 → UID 반환 |
| EFetch | `efetch.fcgi` | 전체 레코드 다운로드 (FASTA, XML, text) |
| ESummary | `esummary.fcgi` | 문서 요약 |
| EPost | `epost.fcgi` | UID 일괄 업로드 |
| ELink | `elink.fcgi` | DB 간 관련 레코드 연결 |

**사용 예시**:
```
# 특정 종의 COI 바코드 검색
esearch.fcgi?db=nuccore&term=Gadus+morhua[ORGN]+AND+COI[GENE]&api_key=YOUR_KEY

# FASTA 형식 다운로드
efetch.fcgi?db=nuccore&id=34577062&rettype=fasta&retmode=text&api_key=YOUR_KEY
```

**출력 형식**: XML, FASTA, GenPept, text, JSON

### B) BLAST API (Common URL API)

**기본 URL**: `https://blast.ncbi.nlm.nih.gov/Blast.cgi`

3단계 워크플로우: **제출 → 폴링 → 수신**

```
# 1. 제출 (CMD=Put)
Blast.cgi?CMD=Put&PROGRAM=blastn&DATABASE=core_nt&QUERY=ATCG...&HITLIST_SIZE=100
→ 반환: RID (Request ID) + RTOE (예상 시간)

# 2. 상태 확인 (CMD=Get)
Blast.cgi?CMD=Get&RID=YOUR_RID&FORMAT_TYPE=JSON2
→ Status: WAITING / READY / UNKNOWN

# 3. 결과 수신
Blast.cgi?CMD=Get&RID=YOUR_RID&FORMAT_TYPE=JSON2
```

**파라미터**: `PROGRAM` (blastn/blastp/blastx), `DATABASE` (core_nt, nt, nr), `QUERY`, `EXPECT`, `HITLIST_SIZE`, `MEGABLAST` (on/off)
**출력 형식**: JSON2, XML2, Text, HTML, CSV

### Rate Limits

| 조건 | 제한 |
|------|------|
| E-utilities (키 없음) | **3 req/sec** |
| E-utilities (키 있음) | **10 req/sec** |
| BLAST 제출 | **10초당 1건** |
| BLAST RID 폴링 | **분당 1회** |
| BLAST 일일 | >100건/24시간 → 제한 |
| 대규모 검색 | standalone BLAST+ 또는 Elastic BLAST 사용 |

### CORS
- **미지원** → **서버 프록시 또는 데스크탑 앱 필수**

---

## 3. DDBJ (DNA Data Bank of Japan)

**URL**: https://www.ddbj.nig.ac.jp/
**GenBank 대비**: INSDC 3대 멤버 (GenBank, ENA, DDBJ). **매일 동기화 — 서열 데이터 동일**. 접속 번호 접두사로 원본 제출처 구분.

### WABI BLAST API

| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| POST | `/blast` | BLAST 검색 제출 |
| GET | `/blast/{RID}?info=status` | 작업 상태 |
| GET | `/blast/{RID}?info=result` | 결과 수신 |

**DB**: ddbjall, ddbjnew, 16S_rRNA, RefSeq 등
**출력**: text, JSON, XML
**결과 보관**: 7일
**CORS**: 미지원
**상태**: 활성 (인프라 전환 중일 수 있음 — 통합 전 확인 필요)

---

## 4. ENA (European Nucleotide Archive)

**URL**: https://www.ebi.ac.uk/ena/browser/home
**GenBank 대비**: INSDC 3대 멤버. 서열 동일. 추가 가치: 원시 리드, 향상된 메타데이터, FAIR 준수.

### API

| API | 기본 URL | 용도 |
|-----|---------|------|
| Portal | `https://www.ebi.ac.uk/ena/portal/api/` | 고급 검색 |
| Browser | `https://www.ebi.ac.uk/ena/browser/api/` | 레코드 조회 (XML, FASTA) |
| EBI BLAST | `https://www.ebi.ac.uk/Tools/services/rest/ncbiblast/run` | 서열 유사도 검색 |

**Rate limit**: 50 req/sec (초과 시 HTTP 429)
**EBI BLAST**: 최대 30 동시 작업, email 필수
**CORS**: 제한적
**출력**: XML, JSON, FASTA, FASTQ

---

## 5. MitoFish (어류 미토게놈 DB)

**URL**: https://mitofish.aori.u-tokyo.ac.jp/
**현황 (2025.06)**: 905,179 서열, 42,996 종, 모든 86개 어류 목 커버
**비용**: 무료

### 도구
- **MitoFish**: DB 검색 및 다운로드
- **MitoAnnotator**: 미토게놈 자동 주석 파이프라인
- **MiFish Pipeline**: eDNA 메타바코딩 분석

### 접근 방법
- **BLAST**: `https://mitofish.aori.u-tokyo.ac.jp/blast/simple`
- **대량 다운로드**: `https://mitofish.aori.u-tokyo.ac.jp/download/fullseq/latest/mitofishdb.fa.gz`
- **참조 세트 (2025.03)**: 전체 883,519건, COI 323,337건, 12S 61,379건
- **mitohelper (Python)**: `https://github.com/aomlomics/mitohelper` (프로그래밍 접근)

**REST API**: 없음 (웹 UI 전용). 통합 시 대량 파일 다운로드 후 로컬 검색.
**CORS**: 해당 없음

---

## 6. 종 동정 도구 비교

| 도구 | 유형 | 입력 | 용도 | 상태 |
|------|------|------|------|------|
| **BOLD ID Engine** | 웹 API | 서열 | COI 종 동정 (1차) | 활성 (v5) |
| **NCBI BLAST** | 웹 API | FASTA/서열 | 범용 서열 유사도 | 활성 |
| **DNABarcoder** | 로컬 (Python) | FASTA | 유사도 임계값 예측 (진균 중심) | 2022 |
| **SpeciesIdentifier** | 로컬 (Java) | FASTA | 유전 거리, 바코드 갭 분석 | 레거시 |
| **iTaxoTools TaxI2** | 로컬 (데스크탑) | FASTA | 거리 기반 바코드 탐색 | 2024 |
| **ONTbarcoder 2.0** | 로컬 | Nanopore 데이터 | 실시간 종 발견 | 2024 |
| **CodonCode Aligner** | 로컬 (상업용) | 크로마토그램 | 서열 조립/정렬/바코드 | 활성 |

---

## 7. DB 연쇄 검색 전략

### 권장 순서

```
1. BOLD ID Engine (1차)
   ├── 목적: 바코딩 전용 큐레이션 DB, 빠른 결과
   ├── COI ≥97% 매칭 → 종 수준 동정 완료
   └── 매칭 없음 또는 <97% → 2단계로

2. NCBI BLAST (2차)
   ├── 목적: GenBank 전체 검색 (BOLD 미등록 종 포함)
   ├── core_nt DB 사용 (중복 제거, 2024~)
   └── 매칭 확인 → 3단계로

3. 전문 DB (3차, 분류군별)
   ├── 어류 → MitoFish (미토게놈)
   ├── 어류 eDNA → MiFish Pipeline
   └── 기타 → ENA, DDBJ (지역별 보완)
```

### 프로그래밍 라이브러리

| 언어 | 라이브러리 | 대상 DB |
|------|-----------|---------|
| R | `bold` (rOpenSci) | BOLD + GenBank 통합 |
| Python | `Biopython` | NCBI E-utilities + BLAST |
| Python | `requests` | BOLD REST API |
| Python | `mitohelper` | MitoFish |

---

## 8. 표준 분석 파이프라인

```
[1] 서열 입력 (FASTA/AB1)
    │
[2] 품질 검사 (QC)
    ├── 저품질 말단 트리밍 (Phred 점수)
    ├── 오염/키메라 확인
    └── 앰플리콘 길이 확인 (COI: ~658bp)
    │
[3] DB 검색
    ├── BOLD ID Engine (COI → 종 매칭)
    ├── NCBI BLAST (core_nt, blastn)
    └── 선택: EBI BLAST, DDBJ WABI
    │
[4] 정렬
    ├── 다중 서열 정렬 (MUSCLE, MAFFT)
    └── 참조 바코드 대비 정렬
    │
[5] 거리 분석
    ├── 쌍별 유전 거리 (K2P 모델)
    ├── 종내 vs 종간 거리 비교
    └── 바코드 갭 분석
    │
[6] 계통수
    ├── NJ 트리 (K2P, 부트스트랩 1000+)
    └── 선택: ML, Bayesian
    │
[7] 종 할당
    ├── 최고 매칭 (최대 유사도)
    ├── 임계값 내 전종 매칭
    ├── 계통수 기반 단계통 기준
    └── BIN 할당 (BOLD)
    │
[8] 보고서 생성 ← BioHub 자동화 대상
```

---

## 9. 종 판별 보고서 표준 구성

논문/보고서에 바로 삽입 가능한 형식:

### 필수 항목

| 섹션 | 내용 |
|------|------|
| **시료 정보** | 채집지, 날짜, 채집자, 서식지, GPS, 증거표본 ID, 사진 |
| **DNA 추출 & 증폭** | 방법, 프라이머 (예: LCO1490/HCO2198), PCR 조건 |
| **서열 품질** | 길이, Phred 점수, 모호 염기, BARCODE 규격 준수 |
| **DB 검색 결과** | BOLD: 최상위 매칭 종, 유사도%, ProcessID, BIN URI |
| | BLAST: 최상위 히트, E-value, 최대 점수, 일치도%, 커버리지 |
| **유전 거리 분석** | K2P 거리 행렬, 종내/종간 거리, 바코드 갭 유무 |
| **계통수** | NJ 트리 + 부트스트랩 값, 참조 서열 대비 위치 |
| **종 할당** | 최종 동정 + 신뢰 수준 (확인/잠정/OTU) |
| **메타데이터** | GenBank 접속번호, BOLD ProcessID, BIN |

### 동정 임계값 관례
- ≥97% 유사도 → 종 수준 할당 (COI, 일반)
- 90-97% → 속 수준
- <90% → 과/목 수준
- **분류군별 조정 필수** (양서류: ~90%, 곤충: 목별 상이)

### 실패 시 보고서 추가 항목

| 섹션 | 내용 |
|------|------|
| **실패 원인** | 예: "COI 유사도 최고 94.2%, 종 수준 임계값 미달" |
| **권장 대안** | 예: "16S rRNA 추가 분석 권장 — 양서류 표준 마커" |
| **근거** | 예: "Vences et al. (2005): 양서류에서 16S가 COI보다 종 해상도 우수" |
| **다음 단계** | 구체적 프라이머, DB, 예상 결과 포함 |

---

## 10. BioHub 아키텍처 결정 사항

### CORS 문제 — 핵심 제약

| DB | REST API | CORS | 브라우저 직접 호출 |
|----|----------|------|--------------------|
| BOLD Portal | O | **X** | 불가 |
| BOLD ID Engine | O (v5 문서화 중) | **X** | 불가 |
| NCBI E-utilities | O | **X** | 불가 |
| NCBI BLAST | O | **X** | 불가 |
| DDBJ WABI | O | **X** | 불가 |
| ENA | O | **X** | 불가 |
| MitoFish | X (웹 UI만) | 해당 없음 | 불가 |

**결론**: 모든 생물정보학 API가 CORS 미지원.

### 구현 전략

```
웹 버전 (Cloudflare Pages + Workers)
├── Workers 프록시로 BOLD/NCBI API 중계
├── Rate limit: Workers 단일 IP → 제한적
└── 기본 기능에 적합 (단일 서열 조회)

데스크탑 버전 (Tauri) ← 권장
├── Rust 백엔드에서 직접 HTTP 호출 (CORS 없음)
├── 사용자별 IP → rate limit 자연 분산
├── NCBI API 키: 사용자 각자 발급 → 10 req/sec
├── MitoFish 로컬 DB 탑재 가능
└── 대량 분석, 오프라인 작업 가능
```

### 통합 우선순위

```
1순위: BOLD ID Engine API (1차 종 동정)
2순위: NCBI BLAST API (광범위 검색 대체)
3순위: NCBI E-utilities (서열 메타데이터 조회)
4순위: BOLD Portal API (대량 바코드 데이터)
5순위: MitoFish 대량 다운로드 (어류 특화 로컬 DB)
```

---

## 참고 자료

- [BOLD API Documentation](https://boldsystems.org/data/api/)
- [BOLD v5 ID Engine](https://id.boldsystems.org/)
- [NCBI BLAST URL API](https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html)
- [NCBI E-utilities Quick Start](https://www.ncbi.nlm.nih.gov/books/NBK25500/)
- [GenBank Release 265.0 (2025.03)](https://ncbiinsights.ncbi.nlm.nih.gov/2025/03/11/genbank-release-265/)
- [DDBJ WABI BLAST](https://www.ddbj.nig.ac.jp/services/wabi-blast-e.html)
- [ENA Programmatic Access](https://ena-docs.readthedocs.io/en/latest/retrieval/programmatic-access.html)
- [MitoFish 10-Year Update (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9989731/)
- [mitohelper (Python)](https://github.com/aomlomics/mitohelper)
- [rOpenSci bold R package](https://docs.ropensci.org/bold/)
- [DNABarcoder](https://pmc.ncbi.nlm.nih.gov/articles/PMC9542245/)

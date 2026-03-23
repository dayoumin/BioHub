# UniProt (Universal Protein Resource)

**URL**: https://www.uniprot.org/
**API 기본 URL**: `https://rest.uniprot.org/`
**관리**: EBI (유럽) + SIB (스위스) + PIR (미국) 공동 운영
**비용**: 무료
**인증**: 불필요
**논문**: [UniProt website API (NAR, 2025.07)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12230682/)

---

## 1. 데이터베이스 구성

| DB | 설명 |
|----|------|
| **UniProtKB/Swiss-Prot** | 수동 큐레이션 (57만+), 높은 신뢰도 |
| **UniProtKB/TrEMBL** | 자동 주석 (2.5억+), 넓은 커버리지 |
| **UniRef** | 클러스터링 (100/90/50% 동일성) — 중복 제거 |
| **UniParc** | 서열 아카이브 — 모든 단백질 서열 저장 (중복 없음) |
| **Proteomes** | 종별 단백체 |

---

## 2. API 엔드포인트

### 3가지 패턴 (모든 DB 공통)

| 패턴 | 경로 | 용도 |
|------|------|------|
| **Entry** | `/{db}/{id}` | 단건 조회 |
| **Search** | `/{db}/search` | 페이징 검색 (최대 500건/페이지) |
| **Stream** | `/{db}/stream` | 전체 결과 (최대 1천만건, 페이징 없음) |

### DB별 엔드포인트

| DB | Entry | Search | Stream |
|----|-------|--------|--------|
| UniProtKB | `/uniprotkb/{accession}` | `/uniprotkb/search` | `/uniprotkb/stream` |
| UniRef | `/uniref/{id}` | `/uniref/search` | `/uniref/stream` |
| UniParc | `/uniparc/{id}` | `/uniparc/search` | `/uniparc/stream` |
| Proteomes | `/proteomes/{id}` | `/proteomes/search` | `/proteomes/stream` |

### 추가 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/proteomes` + GeneCentric | 유전자 중심 단백체 |
| `/support-data` | 문헌, 키워드, 질병, 위치, 교차참조, 분류 |
| ARBA, UniRule | 자동 주석 규칙 |

---

## 3. ID Mapping API

DB 간 식별자 변환 — **BioHub 연동에서 가장 실용적**.

### 워크플로우 (비동기 3단계)

```typescript
// 1. 작업 제출
const job = await fetch('https://rest.uniprot.org/idmapping/run', {
  method: 'POST',
  body: new URLSearchParams({
    from: 'EMBL-GenBank-DDBJ',  // 소스 DB
    to: 'UniProtKB',             // 대상 DB
    ids: 'M10051,U49845'         // 최대 100,000개
  })
});
const { jobId } = await job.json();

// 2. 상태 확인 (폴링)
const status = await fetch(`https://rest.uniprot.org/idmapping/status/${jobId}`);
// → { "jobStatus": "RUNNING" } 또는 리다이렉트 (완료 시)

// 3. 결과 조회
// 페이징:
const results = await fetch(`https://rest.uniprot.org/idmapping/results/${jobId}`);
// 전체:
const stream = await fetch(`https://rest.uniprot.org/idmapping/stream/${jobId}`);
```

### 제한

- 단일 작업당 **최대 100,000개** ID
- 결과 **7일간** 서버 보관
- UniProtKB/UniRef/UniParc 대상 매핑 시 UniProt 데이터 포함
- 타사 DB 대상 매핑 시 ID만 반환

### 주요 매핑 경로

| from | to | 용도 |
|------|----|------|
| `EMBL-GenBank-DDBJ` | `UniProtKB` | **GenBank accession → 단백질** |
| `UniProtKB_AC-ID` | `PDB` | 단백질 → 3D 구조 |
| `UniProtKB_AC-ID` | `GeneID` | 단백질 → NCBI 유전자 |
| `RefSeq_Protein` | `UniProtKB` | RefSeq → UniProt |

---

## 4. 검색 쿼리 문법

Solr 기반. 논리 연산자 + 필드 검색 지원.

### 기본 문법

```
# 자유 텍스트
query=insulin

# 필드 검색
query=gene:BRCA1
query=organism_id:9606
query=protein_name:rubisco

# 논리 연산자 + 괄호
query=(gene:BRCA1) AND (organism_id:9606)
query=(gene:TP53) OR (gene:P53)
query=(organism_id:9606) NOT (reviewed:false)
```

### 사용 예시

```typescript
// 인간 BRCA1 단백질 검색 — 필요한 필드만 선택 + 정렬
const url = 'https://rest.uniprot.org/uniprotkb/search?' +
  new URLSearchParams({
    query: '(gene:BRCA1) AND (organism_id:9606)',
    fields: 'accession,gene_names,organism_name,protein_name,length',
    sort: 'length desc',
    size: '10',
    format: 'json'
  });

const res = await fetch(url);
const data = await res.json();
// data.results[0].primaryAccession → "P38398"
```

### 주요 쿼리 파라미터

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `query` | 검색 쿼리 | `(gene:APP) AND (reviewed:true)` |
| `fields` | 반환 필드 선택 (쉼표 구분) | `accession,gene_names,organism_name` |
| `sort` | 정렬 | `organism_name asc`, `length desc` |
| `size` | 페이지 크기 (최대 500) | `50` |
| `format` | 응답 형식 | `json`, `tsv`, `fasta`, `xml` |

---

## 5. 응답 형식

| 형식 | Content-Type | 용도 |
|------|-------------|------|
| **JSON** | `application/json` | 프로그래밍 통합 (권장) |
| **TSV** | `text/plain` | 스프레드시트, 대량 분석 |
| **FASTA** | `text/plain` | 서열 분석 도구 |
| **XML** | `application/xml` | 구조화된 전체 데이터 |
| **RDF** | `application/rdf+xml` | 시맨틱 웹 |
| **Excel** | `application/vnd.ms-excel` | 직접 다운로드 |

- 필드 선택(`fields`) 시 요청 순서대로 반환
- **Brotli 압축** 적용 (크기 14% 감소, 지연 20% 단축)

---

## 6. 응답 헤더

| 헤더 | 설명 |
|------|------|
| `X-Total-Results` | 총 결과 수 |
| `Link` | 다음 페이지 URL (페이징) |
| `X-UniProt-Release` | 데이터 릴리스 버전 |
| `X-UniProt-Release-Date` | 릴리스 날짜 |

---

## 7. Rate Limit

- **공식 명시 없음** (월 평균 3억건 처리 규모)
- NCBI처럼 API key 제도 없음
- 예의 있는 사용 권장: 병렬 요청 제한, User-Agent 설정, 대량은 stream 사용
- 과도한 요청 시 IP 차단 가능

---

## 8. CORS

- **지원** (`Access-Control-Allow-Origin: *`) — 브라우저에서 직접 호출 가능
- Workers 프록시 불필요 (NCBI/BOLD와 다름)

---

## 9. NCBI 대비 비교

| 항목 | NCBI E-utilities | UniProt REST |
|------|-----------------|--------------|
| 인증 | API key (선택) | 불필요 |
| Rate limit | 3~10 req/s (명시) | 명시 없음 |
| 응답 기본 형식 | XML | **JSON** |
| 호출 복잡도 | 3단계 (esearch→efetch) | **1 call** |
| 비동기 작업 | 없음 (BLAST만) | ID mapping (job 방식) |
| 서열 검색 (BLAST) | 지원 | **없음** |
| 단백질 기능 주석 | 제한적 | **핵심 강점** |
| 필드 선택 | rettype 수준 | **세밀한 fields 파라미터** |

---

## 10. BioHub 연동 계획

### 활용 시나리오

```
NCBI BLAST 결과 (accession)
  → UniProt ID Mapping (GenBank → UniProtKB)
    → 단백질 기능 주석, GO term, 경로 정보 조회
      → 종 동정 보고서에 기능 정보 추가
```

### 구현 우선순위

| 순위 | 기능 | 설명 |
|------|------|------|
| 1 | ID Mapping | BLAST accession → UniProt 변환 |
| 2 | 단백질 기능 조회 | 주석, GO term, 키워드 |
| 3 | 검색 통합 | 유전자/종 기반 단백질 검색 |

### 현재 상태

미구현 — NCBI BLAST 파이프라인 안정화 후 착수 예정

---

## 참고

- [UniProt REST API 문서](https://www.uniprot.org/help/api)
- [UniProt API Documentation (Swagger)](https://www.uniprot.org/api-documentation/)
- [UniProt website API (NAR 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12230682/)
- [ID Mapping 지원 DB 목록](https://www.uniprot.org/help/id_mapping)

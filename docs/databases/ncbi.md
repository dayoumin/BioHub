# NCBI (National Center for Biotechnology Information)

**URL**: https://www.ncbi.nlm.nih.gov/
**관리**: NIH (미국 국립보건원)
**비용**: 무료
**인증**: API key (무료, NCBI 계정에서 발급) — 없어도 사용 가능, 있으면 rate limit 완화

> 종 동정 워크플로우 관점: [genetics/reference/databases.md](../genetics/reference/databases.md)
> BLAST Worker 구현 상세: [genetics/reference/blast-api.md](../genetics/reference/blast-api.md)

---

## 1. 주요 DB 규모

| DB | 현황 (2025.03, Release 265.0) |
|----|-------------------------------|
| GenBank | 55.6억 레코드, 41.96조 염기, 581,000 종 |
| PubMed | 3,700만+ 문헌 |
| RefSeq | 참조 서열 (큐레이션됨) |
| SRA | 시퀀싱 원시 데이터 |

---

## 2. E-utilities API

**기본 URL**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

### 엔드포인트

| 유틸리티 | 엔드포인트 | 용도 |
|---------|-----------|------|
| ESearch | `esearch.fcgi` | DB 검색 → UID 목록 반환 |
| EFetch | `efetch.fcgi` | 전체 레코드 다운로드 (FASTA, XML, text) |
| ESummary | `esummary.fcgi` | 문서 요약 (경량) |
| EPost | `epost.fcgi` | UID 일괄 업로드 (History Server) |
| ELink | `elink.fcgi` | DB 간 관련 레코드 연결 |
| EInfo | `einfo.fcgi` | DB 메타데이터 (필드 목록 등) |
| ESpell | `espell.fcgi` | 검색어 오타 교정 |
| EGQuery | `egquery.fcgi` | 전체 Entrez DB에서 검색 건수 |

### 기본 워크플로우

```
1. ESearch → UID 목록 (WebEnv + QueryKey로 서버 저장)
2. EFetch/ESummary → UID로 레코드 조회
```

### 사용 예시

```typescript
// 특정 종의 COI 바코드 검색
const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?' +
  new URLSearchParams({
    db: 'nuccore',
    term: 'Gadus morhua[ORGN] AND COI[GENE]',
    retmode: 'json',
    retmax: '20',
    api_key: 'YOUR_KEY'
  });

// FASTA 다운로드
const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?' +
  new URLSearchParams({
    db: 'nuccore',
    id: '34577062',
    rettype: 'fasta',
    retmode: 'text',
    api_key: 'YOUR_KEY'
  });
```

### 출력 형식

XML (기본), JSON (`retmode=json`, ESearch/ESummary만), FASTA, GenPept, text

### 주요 파라미터

| 파라미터 | 설명 |
|---------|------|
| `db` | 대상 DB (nuccore, protein, pubmed, gene, taxonomy 등) |
| `term` | 검색 쿼리 (Entrez 문법) |
| `id` | UID 또는 accession (쉼표 구분 복수) |
| `rettype` | 반환 타입 (fasta, gb, docsum 등) |
| `retmode` | 반환 형식 (xml, json, text) |
| `retmax` | 최대 반환 수 (기본 20, 최대 10,000) |
| `retstart` | 오프셋 (페이징) |
| `usehistory` | y → WebEnv/QueryKey 반환 (대량 조회용) |
| `api_key` | API 키 |

---

## 3. BLAST API (Common URL API)

**기본 URL**: `https://blast.ncbi.nlm.nih.gov/Blast.cgi`

### 3단계 워크플로우: 제출 → 폴링 → 수신

```
# 1. 제출 (CMD=Put)
Blast.cgi?CMD=Put&PROGRAM=blastn&DATABASE=core_nt&QUERY=ATCG...&HITLIST_SIZE=100
→ 반환: RID (Request ID) + RTOE (예상 대기 시간, 초)

# 2. 상태 확인 (CMD=Get, FORMAT_OBJECT=SearchInfo)
Blast.cgi?CMD=Get&RID=YOUR_RID&FORMAT_OBJECT=SearchInfo
→ Status: WAITING | READY | UNKNOWN

# 3. 결과 수신 (CMD=Get)
Blast.cgi?CMD=Get&RID=YOUR_RID&FORMAT_TYPE=Text&ALIGNMENT_VIEW=Tabular
```

### 주요 파라미터

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `PROGRAM` | blastn, blastp, blastx, tblastn, tblastx | 검색 프로그램 |
| `DATABASE` | core_nt, nt, nr, refseq_rna 등 | 대상 DB |
| `QUERY` | 서열 문자열 또는 FASTA | 검색 서열 |
| `EXPECT` | 10 (기본) | E-value 임계값 |
| `HITLIST_SIZE` | 100 (기본) | 최대 히트 수 |
| `MEGABLAST` | on/off | Megablast 사용 여부 |
| `FORMAT_TYPE` | Text, XML2, JSON2, HTML | 출력 형식 |
| `ALIGNMENT_VIEW` | Tabular, Pairwise 등 | Text 세부 형식 |

### FORMAT_TYPE 비교

| 형식 | 특징 | BioHub 사용 |
|------|------|-------------|
| Text + Tabular | 경량, 탭 split 파싱 | **현재 Worker 사용** |
| JSON2 | 구조화 | 항상 ZIP 반환 → Workers에서 파싱 불가 |
| XML2 | 구조화 | 응답 크기 큼 |

### Tabular 출력 필드 (탭 구분)

```
query, subject acc.ver, % identity, alignment length, mismatches, gap opens,
q.start, q.end, s.start, s.end, evalue, bit score
```

---

## 4. Datasets API (비교적 새로운)

**기본 URL**: `https://api.ncbi.nlm.nih.gov/datasets/v2/`

E-utilities보다 현대적인 REST API. 게놈, 유전자, 바이러스 데이터 접근.

| 엔드포인트 | 용도 |
|-----------|------|
| `/genome/accession/{accession}` | 게놈 메타데이터 |
| `/gene/id/{gene_id}` | 유전자 정보 |
| `/taxonomy/taxon/{taxon}` | 분류 정보 |
| `/virus/genome/accession/{accession}` | 바이러스 게놈 |

- **응답**: JSON 기본
- **CLI**: `datasets` + `dataformat` 커맨드라인 도구도 제공
- **문서**: https://www.ncbi.nlm.nih.gov/datasets/docs/v2/

---

## 5. Rate Limits

| 조건 | 제한 |
|------|------|
| E-utilities (키 없음) | **3 req/sec** |
| E-utilities (키 있음) | **10 req/sec** |
| BLAST 제출 | **10초당 1건** |
| BLAST RID 폴링 | **분당 1회** (RTOE 경과 후) |
| BLAST 일일 | >100건/24시간 → 제한 가능 |
| Datasets API | 명시적 제한 없음 (과도 사용 시 차단) |

**대규모 검색**: standalone BLAST+ 또는 Elastic BLAST 사용 권장

---

## 6. CORS

**미지원** — 브라우저에서 직접 호출 불가

### BioHub 구현

- **웹**: Cloudflare Workers 프록시 (`src/worker.ts`)
- **데스크탑 (예정)**: Tauri Rust 백엔드에서 직접 호출
- 사용자별 NCBI API key 발급 → rate limit 분산

---

## 7. BioHub 현재 구현 상태

| 기능 | 상태 | 위치 |
|------|------|------|
| BLAST 프록시 | 구현 완료 | `src/worker.ts` |
| BLAST 결과 파싱 (Tabular) | 구현 완료 | `stats/lib/genetics/` |
| E-utilities (accession→종명) | 미구현 | Phase E-1 계획 |
| Datasets API | 미구현 | 향후 검토 |

### 알려진 한계

| 한계 | 원인 | 해결 계획 |
|------|------|-----------|
| BLAST 결과에 종명 없음 | Tabular에 종명 필드 없음 | E-utilities로 accession→종명 변환 |
| description 없음 | 동일 | E-utilities 연동 시 title 추출 |

---

## 참고

- [NCBI E-utilities Quick Start](https://www.ncbi.nlm.nih.gov/books/NBK25500/)
- [BLAST URL API](https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html)
- [NCBI Datasets](https://www.ncbi.nlm.nih.gov/datasets/docs/v2/)
- [GenBank Release 265.0 (2025.03)](https://ncbiinsights.ncbi.nlm.nih.gov/2025/03/11/genbank-release-265/)

# PDB

**운영**: RCSB Protein Data Bank  
**용도**: 단백질 3D 구조 엔트리 메타데이터, 실험법, 해상도 조회  
**BioHub 상태**: 2026-04-10 기준 `/genetics/protein`에서 UniProt PDB cross-reference 기반 구조 메타데이터 조회 구현

---

## 1. 핵심 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/rest/v1/core/entry/{pdbId}` | 구조 엔트리 메타데이터 |
| `https://www.rcsb.org/structure/{pdbId}` | 구조 상세 페이지 |

---

## 2. BioHub 구현 범위

현재 구현:

1. UniProt 요약에서 PDB ID 목록 추출
2. 사용자가 RCSB 조회 실행
3. RCSB Data API `core/entry` 호출
4. `/genetics/protein` 화면에서 아래 정보를 요약 표시
   - PDB ID
   - 구조 제목
   - 실험법
   - 해상도
   - assembly 수
   - protein entity 수
   - release date
   - citation DOI

관련 코드:
- `stats/lib/genetics/pdb.ts`
- `stats/app/genetics/protein/ProteinContent.tsx`

---

## 3. 호출 예시

```bash
curl "https://data.rcsb.org/rest/v1/core/entry/4HHB"
curl "https://data.rcsb.org/rest/v1/core/entry/1A3N"
```

---

## 4. 응답에서 실제로 쓰는 필드

- `rcsb_id`
- `struct.title`
- `struct_keywords.pdbx_keywords`
- `struct_keywords.text`
- `exptl[].method`
- `refine[].ls_d_res_high`
- `rcsb_entry_info.experimental_method`
- `rcsb_entry_info.resolution_combined`
- `rcsb_entry_info.assembly_count`
- `rcsb_entry_info.polymer_entity_count_protein`
- `rcsb_entry_info.deposited_model_count`
- `rcsb_accession_info.initial_release_date`
- `rcsb_accession_info.revision_date`
- `rcsb_primary_citation.title`
- `rcsb_primary_citation.pdbx_database_id_DOI`
- `rcsb_primary_citation.year`

---

## 5. CORS / 인증 / 제약

- **CORS**: 브라우저 직접 호출 가능
- **인증**: 불필요
- **프록시**: 불필요
- **오프라인**: 불가

---

## 6. 후속 확장

- polymer entity / chain 단위 요약
- ligand/chemical component 카드
- Mol* 기반 3D viewer 연결
- AlphaFold fallback과 구조 카드 통합

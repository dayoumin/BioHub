# Reactome

**운영**: Reactome  
**용도**: pathway/event 매핑, 생물학적 경로 요약  
**BioHub 상태**: 2026-04-10 기준 `/genetics/protein`에서 UniProt accession 기반 pathway 요약 조회 구현

---

## 1. 핵심 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/ContentService/data/mapping/UniProt/{accession}/pathways` | UniProt accession에 연결된 pathway 목록 |
| `/ContentService/search/query?query={term}` | Reactome 엔티티 검색 |
| `/AnalysisService/identifiers/projection` | gene/UniProt 목록 기반 pathway enrichment |
| `/content/detail/{stId}` | 상세 pathway 페이지 |

---

## 2. BioHub 구현 범위

현재 구현:

1. UniProt 요약에서 `primary accession` 확보
2. 사용자가 Reactome 조회 실행
3. Reactome pathway mapping 호출
4. `/genetics/protein` 화면에서 아래 정보를 요약 표시
   - pathway stable ID
   - pathway 이름
   - species
   - diagram 보유 여부
   - disease / inferred 여부
   - release date
   - detail 페이지 링크
5. STRING 파트너를 함께 불러온 경우 Reactome enrichment 실행
6. direct pathway와 enrichment pathway 겹침 여부 표시

관련 코드:
- `stats/lib/genetics/reactome.ts`
- `stats/app/genetics/protein/ProteinContent.tsx`

---

## 3. 호출 예시

```bash
curl "https://reactome.org/ContentService/data/mapping/UniProt/P68871/pathways"
curl "https://reactome.org/ContentService/search/query?query=P68871&types=ReferenceGeneProduct"
curl -X POST -H "Content-Type: text/plain" --data-binary $'HBB\nHBA1\nHBA2' "https://reactome.org/AnalysisService/identifiers/projection?pageSize=5&page=1"
```

---

## 4. 응답에서 실제로 쓰는 필드

### direct mapping

- `dbId`
- `displayName`
- `stId`
- `stIdVersion`
- `speciesName`
- `isInDisease`
- `isInferred`
- `maxDepth`
- `releaseDate`
- `doi`
- `hasDiagram`
- `hasEHLD`

### enrichment

- `summary.token`
- `identifiersNotFound`
- `pathwaysFound`
- `warnings[]`
- `pathways[].stId`
- `pathways[].dbId`
- `pathways[].name`
- `pathways[].species.name`
- `pathways[].entities.found`
- `pathways[].entities.total`
- `pathways[].entities.pValue`
- `pathways[].entities.fdr`
- `pathways[].reactions.found`
- `pathways[].reactions.total`
- `pathways[].inDisease`
- `pathways[].llp`

---

## 5. CORS / 인증 / 제약

- **CORS**: 브라우저 직접 호출 가능
- **인증**: 불필요
- **프록시**: 불필요
- **오프라인**: 불가

---

## 6. 후속 확장

- pathway detail drill-down
- Reactome event hierarchy 탐색
- STRING 결과와 pathway 교차 강조
- PDB / AlphaFold 구조 카드와 연결

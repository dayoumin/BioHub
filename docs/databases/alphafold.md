# AlphaFold

**운영**: AlphaFold Protein Structure Database (EMBL-EBI / Google DeepMind)  
**용도**: 예측 단백질 구조 모델 메타데이터, confidence 요약, 모델 파일 링크  
**BioHub 상태**: 2026-04-10 기준 `/genetics/protein`에서 `PDB 없음 -> AlphaFold fallback` 카드 구현

---

## 1. 핵심 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/api/prediction/{accession}` | UniProt accession 기반 모델 메타데이터 |
| `/entry/{entryId}` | AlphaFold 엔트리 페이지 |

---

## 2. BioHub 구현 범위

현재 구현:

1. UniProt 요약에서 `primary accession` 확보
2. PDB cross-reference가 없을 때 사용자가 AlphaFold 조회 실행
3. AlphaFold prediction API 호출
4. `/genetics/protein` 화면에서 아래 정보를 요약 표시
   - entry ID
   - protein / gene / organism
   - mean pLDDT
   - confidence 구간 비율
   - model version / created date
   - PDB / CIF / PAE JSON 링크

관련 코드:
- `stats/lib/genetics/alphafold.ts`
- `stats/app/genetics/protein/ProteinContent.tsx`

---

## 3. 호출 예시

```bash
curl "https://alphafold.ebi.ac.uk/api/prediction/P68871"
```

---

## 4. 응답에서 실제로 쓰는 필드

- `toolUsed`
- `providerId`
- `modelEntityId`
- `modelCreatedDate`
- `globalMetricValue`
- `fractionPlddtVeryLow`
- `fractionPlddtLow`
- `fractionPlddtConfident`
- `fractionPlddtVeryHigh`
- `latestVersion`
- `gene`
- `uniprotAccession`
- `uniprotDescription`
- `organismScientificName`
- `taxId`
- `pdbUrl`
- `cifUrl`
- `bcifUrl`
- `paeImageUrl`
- `plddtDocUrl`
- `paeDocUrl`
- `entryId`
- `isComplex`
- `isReviewed`

---

## 5. CORS / 인증 / 제약

- **CORS**: 브라우저 직접 호출 가능
- **인증**: 불필요
- **프록시**: 불필요
- **오프라인**: 불가
- **주의**: 현재 BioHub는 monomer-like fallback 요약만 사용하고, 3D viewer는 아직 미연동

---

## 6. 후속 확장

- Mol* 기반 AlphaFold model viewer
- PAE heatmap inline 표시
- PDB와 AlphaFold 우선순위/비교 카드 통합
- complex entry 대응

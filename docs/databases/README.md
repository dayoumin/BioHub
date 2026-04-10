# 생물학 데이터베이스 API 레퍼런스

**목적**: BioHub에서 연동하거나 참조하는 주요 생물학 DB의 API 사양 정리
**원칙**: DB별 1파일, API 호출에 필요한 실용 정보 중심

> 종 동정 파이프라인 관점의 DB 가이드는 [genetics/reference/databases.md](../genetics/reference/databases.md) 참조

---

## 핵심 DB

| DB | 파일 | 운영 | 주요 용도 | BioHub 연동 |
|----|------|------|-----------|-------------|
| **NCBI** (GenBank + BLAST) | [ncbi.md](ncbi.md) | NIH (미국) | 염기서열, 서열 유사도 검색, 문헌 | Worker 프록시 구현 완료 |
| **UniProt** | [uniprot.md](uniprot.md) | EBI/SIB/PIR | 단백질 서열 + 기능 주석, ID 변환 | `/genetics/protein` 1차 연동 완료 |
| **QuickGO** | [quickgo.md](quickgo.md) | EMBL-EBI | GO term 정의, ontology 확장 | `/genetics/protein` 연동 완료 |
| **STRING** | [string.md](string.md) | STRING Consortium | 단백질-단백질 상호작용 | `/genetics/protein` 연동 완료 |
| **Reactome** | [reactome.md](reactome.md) | Reactome | pathway/event 매핑, 생물학적 경로 요약 | `/genetics/protein` 연동 완료 |
| **PDB** | [pdb.md](pdb.md) | RCSB PDB | 단백질 구조 메타데이터 | `/genetics/protein` 연동 완료 |
| **AlphaFold** | [alphafold.md](alphafold.md) | EMBL-EBI / Google DeepMind | 예측 구조 모델 메타데이터 | `/genetics/protein` fallback 연동 완료 |

## 라이선스

**[licenses.md](licenses.md)** — 전체 DB 라이선스 비교표 (상업적 사용 가능 여부, 비용)

핵심 요약:
- **자유**: NCBI (Public Domain), PDB (CC0)
- **출처 표기**: UniProt, Ensembl, GO, STRING, WoRMS (CC BY 4.0)
- **비상업만**: FishBase (CC BY-NC), BOLD (명시 없음, 상업 시 협의) — 상용 시 주의
- **유료**: KEGG — 학술 웹 열람만 무료, FTP/상업 별도

## 향후 추가 예정

| DB | 용도 | 우선순위 | 라이선스 |
|----|------|----------|---------|
| **BOLD** | DNA 바코딩 종 동정 | 높음 (기존 03-databases.md에 상세) | 명시 없음 (학술 무료) |
| **GO** | 유전자 기능 주석 표준 | `/genetics/protein` 연동 완료 | CC BY 4.0 |
| **KEGG** | 대사경로 + 유전자 기능 | 중간 (라이선스 주의) | 유료 |
| **GBIF** | 생물 분포/출현 기록 | 중간 | CC0/BY/BY-NC 혼재 |
| **Ensembl** | 게놈 브라우저 + 유전자 주석 | 중간 | CC BY 4.0 |
| **PDB** | 단백질 3D 구조 | `/genetics/protein` 메타데이터 연동 완료 | CC0 |
| **STRING** | 단백질-단백질 상호작용 | `/genetics/protein` 연동 완료 | CC BY 4.0 |
| **Reactome** | 경로/이벤트 해석 | `/genetics/protein` 연동 완료 | CC BY 4.0 |
| **FishBase** | 어류 생물학 정보 | 낮음 (CC BY-NC 주의) | CC BY-NC 4.0 |
| **AlphaFold** | 예측 구조 모델 | `/genetics/protein` fallback 연동 완료 | CC BY 4.0 |
| **WoRMS** | 해양생물 분류 | 별도 프로젝트 존재 | CC BY 4.0 |

---

## 공통 제약

- **CORS**: DB마다 다름 — 각 파일에 명시
  - **미지원** (프록시 필수): NCBI, BOLD
  - **지원** (브라우저 직접 호출 가능): UniProt, GO, STRING, GBIF, Ensembl, PDB
- **Rate limit**: DB마다 다름 — 각 파일에 명시
- **인증**: NCBI만 API key 권장, 나머지 대부분 불필요

# 생물학 데이터베이스 라이선스 비교

**최종 조사일**: 2026-03-23
**목적**: BioHub 연동/상용화 시 라이선스 리스크 사전 파악

---

## 요약표

| DB | 라이선스 | 상업적 사용 | API 무료 | 비고 |
|----|---------|------------|---------|------|
| **NCBI** (GenBank, BLAST, PubMed) | Public Domain | **가능** | 무료 (API key 권장) | 미국 정부 자금 → 제한 없음 |
| **UniProt** | **CC BY 4.0** | **가능** (출처 표기) | 무료 (인증 불필요) | EBI/SIB/PIR 공동 |
| **BOLD** | 명시적 데이터 라이선스 없음 (학술 무료 관행), 이미지는 개별 | **불명확** (상업 시 협의 권장) | 무료 | 공개 데이터 학술 자유, 상업용은 사전 확인 필요 |
| **GBIF** | **CC0 / CC BY / CC BY-NC** (데이터셋별 상이) | **데이터셋마다 다름** | 무료 | 다운로드 시 각 데이터셋 라이선스 확인 필수 |
| **Ensembl** | **CC BY 4.0** (데이터), Apache 2.0 (소프트웨어) | **가능** (출처 표기) | 무료 | EBI/WTSI 운영 |
| **GO** (Gene Ontology) | **CC BY 4.0** | **가능** (출처 표기) | 무료 | 도구는 개별 라이선스 |
| **KEGG** | **독자 라이선스** | **유료 라이선스 필수** | 웹 열람만 무료 | 학술 FTP도 유료 ($2,000~) |
| **PDB** (RCSB) | **CC0** (Public Domain) | **가능** (제한 없음) | 무료 | 출처 표기 권장 (의무 아님) |
| **STRING** | **CC BY 4.0** | **가능** (출처 표기) | 무료 | 이전엔 상업 유료였으나 변경됨 |
| **FishBase** | **CC BY-NC 4.0** | **불가** (비상업만) | 무료 | 상업용은 별도 요금 협의 |
| **WoRMS** | **CC BY 4.0** | **가능** (출처 표기) | 무료 | 해양생물 분류 |
| **MitoFish** | 명시 없음 (학술 무료 관행) | 불명확 | REST API 없음 | 파일 다운로드만 |

---

## 상업적 사용 기준 분류

### 제한 없음 (상용 서비스에 자유롭게 통합 가능)

| DB | 라이선스 | 조건 |
|----|---------|------|
| NCBI | Public Domain | 없음 |
| PDB | CC0 | 없음 (출처 표기 권장) |

### 출처 표기 필수 (CC BY 계열)

| DB | 라이선스 | 표기 방법 |
|----|---------|----------|
| UniProt | CC BY 4.0 | "Data from UniProt" + 릴리스 버전 |
| Ensembl | CC BY 4.0 | "Data from Ensembl release XXX" |
| GO | CC BY 4.0 | GO Consortium 인용 + 릴리스 날짜 |
| STRING | CC BY 4.0 | STRING 논문 인용 |
| WoRMS | CC BY 4.0 | WoRMS Editorial Board 인용 |

### 비상업만 허용 (상용 서비스 통합 시 주의)

| DB | 라이선스 | 상업 사용 시 |
|----|---------|-------------|
| BOLD | 명시 없음 (학술 무료) | 별도 협의 필요 |
| FishBase | CC BY-NC 4.0 | 별도 요금 협의 |
| GBIF | 데이터셋별 상이 | CC BY-NC 데이터 필터링 필요 |

### 별도 라이선스 필요

| DB | 조건 | 비용 |
|----|------|------|
| KEGG | 학술 웹 열람만 무료 | 학술 FTP $2,000~/년, 상업 별도 |

---

## BioHub 상용화 시 주의사항

### 안전 (자유롭게 사용)
- NCBI, PDB → 제한 없음
- UniProt, Ensembl, GO, STRING, WoRMS → 출처 표기만 하면 됨

### 주의 (사전 확인 필요)
- **BOLD**: 종 동정 핵심 DB인데 명시적 데이터 라이선스 없음 → 상용 서비스 전 사전 확인 필요
- **FishBase**: 수산 분야 핵심인데 CC BY-NC → 동일
- **GBIF**: 데이터셋별 라이선스 혼재 → 다운로드 시 CC BY-NC 데이터 자동 필터링 로직 필요

### 위험 (비용 발생)
- **KEGG**: 경로 데이터를 서비스에 직접 통합하면 라이선스 필요
  - 대안: Reactome (CC BY 4.0, 무료) 또는 WikiPathways (CC0)

---

## 참고

- [FishBase License](https://fishbaseapi.readme.io/reference/license)
- [KEGG Copyright](https://www.kegg.jp/kegg/legal.html) | [Commercial Licensing](https://www.pathway.jp/en/licensing.html)
- [GO Citation Policy](https://geneontology.org/docs/go-citation-policy/)
- [GBIF Terms of Use](https://www.gbif.org/terms)
- [Ensembl Legal](http://www.ensembl.org/info/about/legal/index.html)
- [PDB Usage Policy](https://www.rcsb.org/pages/usage-policy)
- [STRING Info](https://string-db.org/cgi/info)
- [BOLD Systems](https://www.boldsystems.org/)

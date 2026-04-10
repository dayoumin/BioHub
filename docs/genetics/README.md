# Genetics — 유전적 분석

> **코드**: `stats/app/genetics/`, `stats/components/genetics/`, `stats/lib/genetics/`
> **집단유전학 Bio-Tools**: `stats/docs/bio-tools/PLAN-BIO-GENETICS.md`
> **참조 자료**: [reference/](reference/)
> **개발 로그**: [devlog.md](devlog.md)

---

## 현재 기능 (2026-04-04)

### /genetics/ 페이지 (서열 분석)

| 도구 | 경로 | 상태 |
|------|------|------|
| DNA 바코딩 종 판별 | `/genetics/barcoding` | 완료 |
| BLAST 서열 검색 | `/genetics/blast` | 완료 |
| GenBank 서열 검색 | `/genetics/genbank` | 완료 |
| 서열 기본 통계 | `/genetics/seq-stats` | 완료 |
| 다종 유사도 행렬 | `/genetics/similarity` | 완료 |
| 계통수 시각화 | `/genetics/phylogeny` | 완료 |
| BOLD ID 종 동정 | `/genetics/bold-id` | 완료 |
| Translation 워크벤치 | `/genetics/translation` | 완료 |
| 단백질 특성 분석 | `/genetics/protein` | 완료 |

### /bio-tools/ 집단유전학

| 도구 | 상태 | 계획서 |
|------|------|--------|
| Hardy-Weinberg 평형 검정 | 완료 | `stats/docs/bio-tools/PLAN-BIO-GENETICS.md` |
| Fst 집단 분화 지수 | 완료 | `stats/docs/bio-tools/PLAN-BIO-GENETICS.md` |

### 공통 인프라

- Worker 9 (`worker9-genetics.py`) — 거리 계산, HW, Fst
- 분석 히스토리 + D1 클라우드 동기화
- 도구 간 서열 전달 (GenBank → Barcoding/BLAST)
- NCBI/BOLD Worker 프록시 (`src/handlers/`)

---

## 완료된 계획

| 계획 | 완료일 | 내용 |
|------|--------|------|
| Phase 0: 버그 수정 4건 | 2026-04-04 | Query Coverage, localStorage, 서열 상한, 빈 종명 |
| Phase A: 미구현 3도구 | 2026-04-04 | seq-stats, similarity, phylogeny |
| Phase B: UX 개선 3건 | 2026-04-04 | CSV 내보내기, 서열 전달, 히스토리 검색 |
| Phase C: BOLD ID Engine | 2026-04-04 | BOLD v5 연동, 20 tests |

---

## 로드맵 (미완료)

### 바코딩 고도화

- [ ] 대안 마커 상세 모달 (프라이머 정보, 관련 논문, 실험 팁)
- [ ] 히스토리 엑셀 내보내기 (선택 → xlsx)
- [ ] EBI BLAST 자동 전환 (NCBI 실패 시)
- [ ] 보고서 자동 생성 (서열 품질 + 결과 + 해석 + Methods 문구)
- [ ] 가공 시료 미니바코드 안내
- [ ] 저유사도 시 서열 품질 체크 안내
- [ ] 사용자별 NCBI API 키 입력 (rate limit 분산)
- [ ] "최신 결과로 다시 분석" 버튼 (캐시 우회)

### 집단유전학 확장

- [ ] Haplotype 빈도 분석
- [ ] AMOVA (집단 간 유전적 분화)
- [ ] Haplotype network 시각화
- [ ] Tajima's D, Fu's Fs (중립성 검정)

### 분자생물학 도구 (BioPython 활용)

- [x] `/genetics/translation` — DNA→Protein 워크벤치 (번역 + ORF + 코돈 분석 탭) — [plans/biopython-tools.md](plans/biopython-tools.md)
- [x] `/genetics/protein` — 단백질 특성 분석 (ProtParam: MW, pI, GRAVY, 아미노산 조성)
- [x] UniProt 연동 — 단백질 → 기능 주석 조회 (protein 페이지 확장). 상세: [../../docs/databases/uniprot.md](../../docs/databases/uniprot.md)
- [x] QuickGO 연동 — GO term 정의/ontology 확장. 상세: [../../docs/databases/quickgo.md](../../docs/databases/quickgo.md)
- [x] STRING 연동 — 상호작용 파트너 조회. 상세: [../../docs/databases/string.md](../../docs/databases/string.md)
- [x] Reactome 연동 — direct pathway + STRING network enrichment 요약. 상세: [../../docs/databases/reactome.md](../../docs/databases/reactome.md)
- [x] RCSB PDB 연동 — 구조 메타데이터 조회. 상세: [../../docs/databases/pdb.md](../../docs/databases/pdb.md)
- [x] AlphaFold 연동 — PDB 없을 때 fallback 예측 구조 카드. 상세: [../../docs/databases/alphafold.md](../../docs/databases/alphafold.md)
- [x] Protein 해석 Markdown export — 현재 열린 annotation/network/structure 상태를 리포트용으로 저장
- [x] Protein 해석 snapshot persistence — 프로젝트 보고서가 저장 시점의 live annotation markdown을 재사용
- [ ] genetics 랜딩 페이지 "서열 분석 도구" / "분자생물학 도구" 카드 그룹 분리

### 외부 연동 / 고급 기능

- [ ] BOLD Systems 메타데이터 조회 (BIN, voucher, 분포)
- [ ] OpenAlex 논문 추천 (종명 기반 관련 논문)
- [ ] Primer-BLAST 연동 (종 특이적 프라이머 설계)
- [ ] eDNA 메타바코딩 지원 (다종 혼합 서열 분석)
- [ ] CITES 종 자동 확인 (멸종위기종 DB 연동)

### 플랫폼 통합

- [ ] D1 영구 저장 (localStorage → 서버 마이그레이션)
- [ ] My Pages 연동 (분석 기록 대시보드, 프로젝트별 분류)
- [ ] 결과 비교 (side-by-side 비교 UI)
- [ ] 공유 링크 생성 (분석 결과를 URL로 공유)
- [ ] Tauri 데스크탑: BLAST 직접 호출 (CORS 우회, rate limit 분산)
- [ ] 제네릭 `useApiExecution` 훅 추출 (BLAST/BOLD 폴링 80% 중복 통합)

### 검토 미확정

- 바코드 갭 분석 (종내/종간 변이 분포 시각화)
- 시퀀스 어셈블리 (Sanger forward/reverse 합성)
- GenBank 서열 제출 도우미 (서식 자동 생성)
- 다중 마커 분석 (COI + Cyt b 등 병합 분석)
- 서열 정렬 뷰어 (MUSCLE/ClustalW 정렬 결과 시각화)

---

## 참조 자료

| 파일 | 내용 |
|------|------|
| [reference/markers.md](reference/markers.md) | DNA 바코딩 마커 가이드 (COI, 16S, ITS 등) |
| [reference/taxa-guide.md](reference/taxa-guide.md) | 분류군별 마커 선택 가이드 |
| [reference/databases.md](reference/databases.md) | DB/API 기술 가이드 (BOLD, NCBI, EBI) |
| [reference/evidence-pipeline.md](reference/evidence-pipeline.md) | 마커 추천 엔진 증거 파이프라인 |
| [reference/blast-api.md](reference/blast-api.md) | NCBI BLAST API 기술 참고 |
| [reference/barcoding-service.md](reference/barcoding-service.md) | E-0 바코딩 서비스 시장 분석 + 아키텍처 |

---

## API 테스트 결과 (2026-03-22)

| API | 상태 | 비고 |
|-----|------|------|
| NCBI BLAST | 작동 | RID 제출 → 30초 → 결과 수신 |
| EBI BLAST | 작동 | 백업용 |
| BOLD v5 ID Engine | 작동 | Workers 프록시 경유 |

## 아키텍처 결정

| 항목 | 결정 |
|------|------|
| DB | Cloudflare D1 (Workers 네이티브 바인딩) |
| 파일 | R2 (FASTA, CSV, 보고서) |
| API | Cloudflare Workers (BLAST/BOLD 프록시) |
| 정본 코드 | `stats/` 앱 내 |
| 에러 처리 | BlastError/BoldError 클래스 (코드 기반) |

# Genetics — 유전적 분석 로드맵

> 현재 구현: DNA 바코딩 종 판별 (Phase 1 MVP + UX 고도화 완료)
> TODO (구현 계획): [TODO.md](TODO.md)

### Phase 1 완료 사항 (2026-03-22)

- [x] NCBI BLAST 연동 (Workers 프록시, 폴링, Tabular 파싱, D1 캐시)
- [x] Decision Engine (5단계 판정, 분류군 감지, 대안 마커 추천)
- [x] esummary 종명 조회 (채집국가, 바코드 여부, Bit score)
- [x] 히스토리 (DecisionResult 저장, 클릭 → 결과 복원, 핀, 전체 선택·삭제)
- [x] BOLD 검색 (서열 클립보드 복사 + id.boldsystems.org 링크)
- [x] BlastError 코드 기반 에러 분기 (문자열 includes() 제거)
- [x] shadcn Button 통일, 시료명 입력, 마커 툴팁

---

## Phase 2: 바코딩 고도화

- [ ] 대안 마커 상세 모달 (프라이머 정보, 관련 논문, 실험 팁)
  - 범용 프라이머 목록 포함 (LCO1490/HCO2198, Fish1F/2R 등)
- [ ] 히스토리 엑셀 내보내기 (선택 → xlsx)
- [ ] EBI BLAST 자동 전환 (NCBI 실패 시)
- [ ] 보고서 자동 생성 (서열 품질 + 결과 + 해석 + Methods 문구)
- [ ] 가공 시료 미니바코드 안내
- [ ] 저유사도 시 서열 품질 체크 안내

## Phase 3: 서열 분석 도구

- [ ] 서열 기본 통계 (GC%, 길이 분포, 염기 조성, 품질 시각화)
- [ ] 다종 유사도 행렬 (K2P 거리 + 클러스터링)
- [ ] NJ / UPGMA 계통수 시각화
- [ ] 다중 마커 분석 (COI + Cyt b 등 병합 분석)
- [ ] 서열 정렬 뷰어 (MUSCLE/ClustalW 정렬 결과 시각화)

## Phase 4: 집단 유전학

- [ ] Haplotype 빈도 분석
- [ ] Fst / AMOVA (집단 간 유전적 분화)
- [ ] Haplotype network 시각화
- [ ] Tajima's D, Fu's Fs (중립성 검정)

## Phase 5: 외부 연동 · 고급 기능

- [ ] BOLD Systems 메타데이터 조회 (BIN, voucher, 분포)
- [ ] OpenAlex 논문 추천 (종명 기반 관련 논문)
- [ ] Primer-BLAST 연동 — 종 특이적 프라이머 설계 (고급, 연구자 전용)
  - 대안 마커 추천 후 해당 마커 프라이머 설계 지원
  - 현재는 범용 프라이머 정보 제공으로 충분
- [ ] eDNA 메타바코딩 지원 (다종 혼합 서열 분석)
- [ ] CITES 종 자동 확인 (멸종위기종 DB 연동)

## Phase 6: 플랫폼 통합

- [ ] My Pages 연동 (분석 기록 대시보드, 프로젝트별 분류)
- [ ] 결과 비교 (side-by-side 비교 UI)
- [ ] D1 영구 저장 (localStorage → 서버 마이그레이션)
- [ ] 공유 링크 생성 (분석 결과를 URL로 공유)
- [ ] Tauri 데스크탑: BLAST 직접 호출 (CORS 우회, rate limit 분산)

---

## 검토 필요 (미확정)

- Primer-BLAST 통합 범위 — 범용 프라이머 정보 vs 실제 설계 도구
- 바코드 갭 분석 (종내/종간 변이 분포 시각화)
- 시퀀스 어셈블리 (Sanger forward/reverse 합성)
- GenBank 서열 제출 도우미 (서식 자동 생성)
- 형태 키 연동 (종 판별 결과 + 형태 분류 교차 검증)

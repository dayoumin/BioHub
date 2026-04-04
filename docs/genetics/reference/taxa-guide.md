# 분류군별 마커 선택 가이드

**작성일**: 2026-03-21
**목적**: 분류군별 권장 마커 + 실패 시 대안 경로 (BioHub 종 판별 기능용)
**원칙**: "분석 안 되면 → 왜 안 되는지 + 다음에 뭘 해야 하는지" 자동 안내

**관련 문서**:
- [markers.md](markers.md) — DNA 바코딩 마커 총정리
- [databases.md](databases.md) — 종 판별 DB & API 기술 가이드
- [barcoding-service.md](barcoding-service.md) — E-0 바코딩 서비스 시장 분석 + 아키텍처

---

## 1. 어류 (Teleostei)

### 기본 마커: COI (658 bp, FISH-BOL 표준)

| 지표 | 값 |
|------|-----|
| 종내 변이 | 0.3-2% |
| 종간 변이 (동속) | 3-15% |
| Barcode gap | 대부분 존재; 최근 분화 종에서 부재 |
| 성공률 | 93-95% (잘 분리된 종), ~50% (근연 동속종) |

### 문제 분류군

#### Thunnus (참치류) — 주요 실패 그룹

COI로 8개 Thunnus 종 **신뢰성 있게 구분 불가**.

**원인**:
- 종 분화가 매우 최근 → COI에 충분한 변이 축적 안 됨
- 종간 미토콘드리아 유전자 침투 (T. thynnus ↔ T. orientalis, T. thynnus ↔ T. alalunga)

**해결**:
1. **Control Region (D-loop)** 사용 — COI보다 ~10배 높은 뉴클레오티드 다양성 → 전종 구분 가능
2. **ITS1** (핵 마커)로 교차 검증 — 유전자 침투 확인 (특히 T. alalunga 동정 시)
3. 가공식품: CR 미니바코드 (~236 bp, Mitchell & Hellberg 설계)

#### Salmonidae (연어과)

- S. trutta / S. ohridanus: COI로 BOLD에서 구분 불가
- 교잡 + 불완전 계통 분류로 haplotype 공유 광범위

**해결**: D-loop + 핵 microsatellite 또는 ITS

#### 상어/가오리 (판새류)

- COI 일반적으로 잘 작동 (~94% 종 판별)
- NADH2 보완 마커 (824-1,339 bp)
- 지느러미 무역 단속: 미니바코딩

### 대안 마커 표

| 마커 | 용도 | 비고 |
|------|------|------|
| **12S rRNA** | eDNA, 분해 시료 | 어류 eDNA 최적; 100% 일치 보고 |
| **Cyt b** | 법의학, 계통학 | 일부 그룹에서 COI와 동등 |
| **D-loop/CR** | 참치, 연어, 집단 수준 | mtDNA 중 최고 다형성; COI의 10배 변이 |
| **16S rRNA** | 보완/eDNA | 보존적; 상위 수준 동정 |
| **ITS1** (핵) | 유전자 침투 감지 | 교잡/침투 확인 필수 |

### 의사결정 트리

```
어류 시료 → COI (658 bp) 시도
├── 명확한 종 매칭 (>98%) → 완료
├── 모호 / 복수 종 → 속 확인
│   ├── Thunnus → CR (D-loop) 사용, ITS1로 확인
│   ├── Salmo → D-loop + microsatellite
│   └── 기타 근연쌍 → Cyt b, 그 다음 12S
├── 분해/가공 시료 → 미니바코드 (127-314 bp COI)
│   └── 미니바코드 실패 → 12S rRNA (더 짧은 앰플리콘)
└── eDNA 시료 → 12S rRNA (MiFish 프라이머)
```

### 주요 DB
- **FISH-BOL** (boldsystems.org) — 최대 큐레이션된 어류 바코드 DB
- **GenBank/NCBI** — 더 넓은 범위, 큐레이션 적음
- **MitoFish** — 미토게놈 DB
- **FDA Regulatory Fish Encyclopedia** — 미국 수산물 인증 검증 서열

---

## 2. 포유류 (Mammalia)

### 기본 마커: COI (658 bp) = Cyt b (실무에서 동등)

| 지표 | 값 |
|------|-----|
| 평균 종내 변이 | 0.63% |
| 종 플래그 임계값 | ~6.3% (10배 규칙) |
| Barcode gap | 일반적 존재; 다른 척추동물보다 좁음 |
| 성공률 | 95-97% |

### 핵심 특성
- COI와 Cyt b 성능 동등 — 어느 쪽도 명확히 우수하지 않음
- **품종/변종은 mtDNA로 구분 불가** (모계 유전만)
- 교잡 탐지는 mtDNA 단독으로 불가능

### 품종/변종 판별 (종내)

DNA 바코딩(mtDNA)으로는 **품종 구분 불가**. 대신:

| 방법 | 세부 | 정확도 |
|------|------|--------|
| **Microsatellite** | 15-30 로커스 | 개체 식별, 추적성 |
| **SNP 어레이** | BovineSNP50 (53,218 SNPs), BovineHD (777K) | 95%+ 품종 분류 |
| **ML + 품종특이 SNP** | 머신러닝 분류 | 9+ 품종에서 95%+ |

### 의사결정 트리

```
포유류 시료 → COI (658 bp) AND Cyt b 병렬 시도
├── 종 매칭 → 완료
├── 모호한 근연종 → D-loop 시퀀싱
├── 분해 뼈/법의학 → Cyt b 단편 (300-500 bp)
├── 품종/변종 필요 → SNP 어레이 (BovineSNP50) 또는 microsatellite
├── 교잡 의심 → 핵 마커 필수 (microsatellite/SNP)
└── eDNA → 12S rRNA (범용 척추동물 프라이머)
```

---

## 3. 조류 (Aves)

### 기본 마커: COI (658 bp) — 매우 잘 확립됨

| 지표 | 값 |
|------|-----|
| 종간/종내 비율 | 평균 ~18배 |
| 일반 임계값 | 2% |
| Barcode gap | 강건 |
| 성공률 | 북미 94% (643종), 신열대 93% (1,521종) |

### 문제 분류군
- **Sporophila (capuchino 종자새)**: COI haplotype 공유, 종내 > 종간 거리 → **핵 마커 (UCE, RADseq, FIB5, ODC) 필요**
- **Sylvia, Phylloscopus 솔새류**: 일부 동소적 종쌍 COI로 해결 불가
- **닭목 일부**: 낮은 COI 변이

### 의사결정 트리

```
조류 시료 → COI (658 bp) 시도
├── 명확한 종 매칭 → 완료
├── 최근 방산 (Sporophila 등) → 핵 인트론 (FIB5, ODC)
├── 교잡 의심 → 핵 마커 + mtDNA 비교
├── 프라이머 실패 (동남아 참새목) → 맞춤 COI 또는 ND2
├── eDNA / 깃털 흔적 → 12S rRNA
└── 계통유전체학 필요 → UCE 캡처
```

---

## 4. 파충류 & 양서류

### 양서류: COI + 16S rRNA 병행 (둘 다 1차)

| 지표 | COI | 16S |
|------|-----|------|
| 종내 변이 | 7-14% (극단 18%!) | 평균 0.3% |
| 종간 변이 | 13.5-20.7% | 다양 |
| Barcode gap | **문제** — 종내/종간 중첩 | 더 안정적 |
| 증폭 성공 | 분류군에 따라 50-95% | ~100% |

**핵심**: 양서류 COI 종내 변이가 **다른 척추동물의 3-7배** → 고정 임계값 (2-3%) 적용 불가!
- COI 종 경계 임계값: ~10% (양서류)
- 16S 종 경계 임계값: ~5% (양서류)

### 파충류: COI (분류군 특이적 프라이머)
- COI가 양서류보다 잘 작동
- 뱀: Cyt b 참조 데이터가 더 풍부한 경우 있음

### 의사결정 트리

```
양서류 → COI + 16S rRNA 병렬 시도
├── 둘 다 일치 → 완료
├── COI 프라이머 실패 → 16S 결과 사용
├── 16S 해결 불가 → COI 결과 우선 (가능 시)
├── 둘 다 해결 불가 → Cyt b + 핵 마커 (RAG1, 28S) 추가
└── 은밀종 의심 → 다중 로커스 (COI + 16S + 핵)

파충류 → COI (분류군 특이적 프라이머)
├── 성공 → 완료
├── 프라이머 실패 → Cyt b 또는 ND2
├── 뱀 → Cyt b 참조 데이터가 더 나을 수 있음
└── 은밀종 → 핵 마커 (RAG1, c-mos)
```

---

## 5. 곤충/절지동물 (Arthropoda)

### 기본 마커: COI (658 bp) — 최적, BOLD의 기반

| 목 | 종내 >3% 비율 | 비고 |
|----|--------------|------|
| 강도래목 (Plecoptera) | 42.2% | 최악 |
| 날도래목 (Trichoptera) | 34.6% | |
| 벌목 (Hymenoptera) | 32.5% | |
| 딱정벌레목 (Coleoptera) | 26.1% | |
| 파리목 (Diptera) | 26.1% | |
| 노린재목 (Hemiptera) | 25.9% | |
| 나비목 (Lepidoptera) | 24.3% | 가장 양호 |

**핵심**: 곤충의 ~25%가 3% 초과 종내 변이 → **고정 2-3% 임계값 부적합**. threshOpt/localMinima 알고리즘으로 데이터 기반 임계값 사용.

### 주의사항
- **Wolbachia 감염**: 미토콘드리아 소멸 유발 → 종간 변이 감소
- **NUMTs**: 일부 딱정벌레, 메뚜기 계통에서 흔함
- **DB 오류**: BOLD/GenBank 분류학적 오기재, 오염, 오동정

### 의사결정 트리

```
곤충 → COI (658 bp, Folmer 프라이머)
├── BOLD BIN 명확 매칭 → 완료
├── BIN 내 복수 종 → Wolbachia 확인, 핵 ITS2 시도
├── 깊은 종내 분기 (>3%) → 은밀종 가능 → 핵 마커
├── BOLD 매칭 없음 → GenBank BLAST; 미기재종 가능
├── 프라이머 실패 → 축퇴 프라이머 (dgLCO/dgHCO)
├── eDNA 대량 시료 → COI 메타바코딩 (mlCOIintF/jgHCO2198)
└── 가공 시료 → 미니바코드 (127-314 bp)
```

---

## 6. 연체동물 (Mollusca)

### 기본 마커: COI — 단, 이매패류에서 심각한 주의사항

| 강 | 시퀀싱 성공률 | 비고 |
|----|-------------|------|
| 다판강 (군부류, chitons) | 82.8% | 양호 |
| 복족강 (달팽이) | 42.5% | 보통 |
| 이매패강 (조개) | **33.1%** | 최저! |

### 이매패류 핵심 문제: DUI (Doubly Uniparental Inheritance)

이매패류 100+ 종에서 수컷이 **두 개의 서로 다른 미토콘드리아 게놈** (F-type, M-type) 보유.

**영향**:
- F/M haplotype 간 증폭 편향 → 예측 불가한 결과
- 종 다양성 과대평가
- "높은 신뢰도로 잘못된 종 경계 판정" 가능

**해결**: 이매패류는 **반드시 핵 마커 병행** (ITS2, H3, 28S)

### 의사결정 트리

```
연체동물 → 강 먼저 확인
├── 복족류 → COI (표준 프라이머)
│   ├── 성공 → 완료
│   └── 프라이머 실패 → 16S 또는 재설계 COI
├── 이매패류 → COI + 핵 마커 (ITS2, H3, 28S) 필수
│   ├── COI 깊은 분기 → 성별 확인 (DUI?)
│   │   ├── 수컷 → M-type mtDNA 가능; F-type과 비교
│   │   └── 암컷 → F-type이 표준
│   └── COI 실패 → 16S + 핵 마커
├── 두족류 → COI (일반적으로 잘 작동)
└── eDNA → 연체동물 특이적 COI 또는 18S
```

---

## 7. 갑각류 (Crustacea)

### 기본 마커: COI + 16S 보완

| 그룹 | COI 커버리지 | 비고 |
|------|-------------|------|
| 십각목 (게, 새우) | 75% | 가장 양호 |
| 난바다곤쟁이목 | 89% | |
| 요각류 | 29% | 매우 부족 |
| 패충류 | 극소 | 7,577 기재종 중 0.6% |

### 의사결정 트리

```
갑각류 → COI (658 bp)
├── 십각목 → COI 잘 작동 (75% 커버리지)
│   └── COI 매칭 없음 → 16S 시도
├── 요각류 → COI + 16S 병렬 (둘 다 갭 있음)
│   └── 둘 다 안 됨 → 18S (과/목 수준 배치)
├── 단각/등각류 → COI (표준); 16S 백업
├── 패충류 → 데이터 제한; COI 후 18S
├── eDNA → 짧은 COI 단편 (100-226 bp)
└── 유생/메갈로파 → COI (게 메갈로파 동정 성공 사례)
```

---

## 8. 응용 분야별 가이드

### 8.1 식품 위조 / 수산물 인증

| 제품 유형 | 1차 마커 | 대안 | 비고 |
|-----------|----------|------|------|
| 신선 생선 필렛 | COI (658 bp) | Cyt b | FDA 규제 DB 활용 |
| 통조림/가공 생선 | **미니바코드** (127-314 bp COI) | 12S 단편 | 전체 바코드 80% 실패 |
| 참치 제품 | CR 미니바코드 (~236 bp) | + ITS1 | COI로 Thunnus 구분 불가 |
| 수리미/어묵 | COI 메타바코딩 | - | 복수 종 검출 필요 |
| 육류 제품 | Cyt b (300-500 bp) | COI | 포유류 법의학 최대 DB |
| 상어 지느러미 | COI + 미니바코드 | NADH2 | 분해 시료용 다중 PCR |

**통계**:
- NOAA: 자발 제출 제품의 최대 **40%** 위조
- 태국 2024 연구: **24.44%** 오기재율 (멸종위기종 포함)
- 미니바코딩: 가공 제품에서 **93.2%** 동정 성공 (표준 20.5% 대비)

### 8.2 야생동물 법의학 / CITES 단속

**표준 프로토콜**:
1. COI (1차 종 동정) + Cyt b (검증) 병렬
2. 법의학 증거관리연쇄 절차 준수
3. 뼈/분해 조직: Cyt b 단편 (300-500 bp)
4. 교잡 감지: 핵 마커 필수

### 8.3 eDNA / 환경 모니터링

| 대상 분류군 | 1차 eDNA 마커 | 프라이머 세트 | 앰플리콘 크기 |
|-------------|-------------|-------------|-------------|
| 어류 | 12S rRNA | MiFish-U | ~170 bp |
| 포유류 | 12S rRNA | MiMammal | ~170 bp |
| 조류 | 12S rRNA | MiBird | ~170 bp |
| 양서류 | 12S + 16S | 다수 | 150-250 bp |
| 전체 척추동물 | 12S | VertU | 200-250 bp |
| 무척추동물/곤충 | COI | mlCOIintF/jgHCO | 313 bp |
| 해양 무척추동물 | COI + 18S | 다수 | 다양 |

**핵심**: eDNA 단편은 짧음 (~150-300 bp) → 표준 658 bp 부적합. 짧은 앰플리콘 마커 (12S, 16S)가 지배적.

---

## 9. 요약 매트릭스

| 분류군 | 1차 | 종내/종간 변이 | Barcode Gap | 성공률 | 최선 대안 | 대안 필요 시점 |
|--------|-----|---------------|-------------|--------|-----------|-------------|
| 어류 (일반) | COI | 0.3-2% / 3-15% | 있음 | 93-95% | 12S, Cyt b | 가공, eDNA |
| 참치 (Thunnus) | **CR** | 다양 | COI 없음 | COI ~50% | + ITS1 | **항상** |
| 상어/가오리 | COI | 보통 | 있음 | ~94% | NADH2, 미니 | 지느러미, 분해 |
| 연어과 | COI+D-loop | 동속 낮음 | 약함 | COI ~50% | microsatellite | 교잡 의심 |
| 포유류 | COI=Cyt b | 0.63% / ~6% | 있음 | 95-97% | SNP (품종) | 품종, 법의학 |
| 조류 | COI | 2% 기준; 18배 | 강건 | 93-94% | 핵 인트론 | 최근 방산 |
| 양서류 | COI+16S | 7-14% / 13-21% | 약함/중첩 | 50-100% | 16S, RAG1 | 항상 병행 |
| 파충류 | COI | 보통 | 대부분 | 양호 | Cyt b, ND2 | 프라이머 실패 |
| 곤충 | COI | <3% (75%) / 다양 | 있음 (예외) | 77-93% | ITS2, 핵 | Wolbachia, 은밀종 |
| 연체동물 | COI | 0.49% / 높음 | 있음 (97%) | 33-83% | 핵 (ITS2, H3) | 이매패 (DUI) |
| 갑각류 | COI | 다양 | 다양 | 십각목 양호 | 16S, 18S | DB 부족 |

---

## 10. 참고문헌

- Ardura et al. — DNA barcoding applications to fish landings (PMC3890670)
- Vieira et al. — Validated methodology for Thunnus identification (PMC2764144)
- Hebert et al. — Identification of Birds through DNA Barcodes (PMC518999)
- Vences et al. — Deciphering amphibian diversity through DNA barcoding (PMC1609216)
- Radulovici et al. — Looking back on a decade of barcoding crustaceans (PMC4714055)
- Layton et al. — Patterns of DNA barcode variation in Canadian marine molluscs (PMC3990619)
- Ramirez et al. — Large-scale patterns of COI variation in Insecta (PMC9147995)
- Salis et al. 2024 — Performance of DNA metabarcoding in insect identification
- Mitchell & Hellberg — Tuna CR mini-barcoding
- Shokralla et al. — Mini-barcoding for processed fish products (Nature)
- Chen et al. 2025 — eDNA metabarcoding primers for aquatic invertebrates
- USFWS 2025 — eDNA pilot study report

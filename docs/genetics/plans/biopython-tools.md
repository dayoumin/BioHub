# BioPython 분자생물학 도구 계획

> **작성일**: 2026-04-05
> **상태**: 계획 확정
> **상위**: [../README.md](../README.md) 로드맵 "분자생물학 도구" 섹션

---

## 개요

BioPython 순수 Python 모듈을 활용하여 서열 분석 워크플로우에 분자생물학 도구 2종을 추가한다.
현재 "서열 획득 → 통계 → 비교" 흐름에 "**번역/분석**" 단계가 자연스럽게 추가됨.

## 페이지 구조

| 경로 | 도구 | 핵심 기능 |
|------|------|----------|
| `/genetics/translation` | DNA→Protein 워크벤치 | 번역 + ORF 탐색 + 코돈 분석 (탭) |
| `/genetics/protein` | 단백질 분석 | ProtParam 물리화학적 특성 + 향후 UniProt 연동 |

**통합 근거**: Translation/ORF/Codon은 동일 입력(DNA 서열 + genetic code), 연구자 워크플로우 상 한 화면에서 끝나야 함.

## Pyodide 호환성

- BioPython은 **C 확장 포함** (cpairwise2, codonaligner 등) → PyPI의 `py3-none-any` wheel 없음
- **Pyodide 0.29.3 사전 빌드에 biopython 1.85 포함** → `loadPackage('biopython')` 사용
- 사용 모듈: `Bio.Seq`, `Bio.SeqUtils`, `Bio.SeqUtils.CodonUsage`, `Bio.SeqUtils.ProtParam`
- 우리가 쓰는 모듈은 순수 Python — C 확장 모듈(cpairwise2 등)은 사용하지 않음

### 로드 방식

기존 Worker 패턴과 동일: `WORKER_PACKAGES`에 선언 → Worker 코드 실행 전 자동 로드.

```typescript
// pyodide-worker.enum.ts
[PyodideWorker.MolBio]: ['biopython'] as const
```

Pyodide 런타임은 **싱글턴** — 모든 Worker가 같은 Python 환경 공유.
Worker 10 첫 사용 시 BioPython 1회 로드(~3MB), 이후 세션 내 즉시 실행.
통계 → 유전 전환 시 **언로딩/리로딩 없음** (기존 Worker도 메모리에 유지).

### 호환성 검증 (구현 Step 1)

**Pyodide 0.29.3 번들 biopython 1.85** 기준으로 API 동작 확인 (최신 BioPython 문서가 아닌 번들 버전 기준):

```python
# 1. import 확인
from Bio.Seq import Seq
from Bio.Data import CodonTable
from Bio.SeqUtils.ProtParam import ProteinAnalysis

# 2. 번역 동작 확인 (standard + mitochondrial)
seq = Seq("ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG")
protein = seq.translate(table=1)   # Standard
mito = seq.translate(table=2)      # Vertebrate Mitochondrial
assert len(str(protein)) > 0

# 3. CodonTable start/stop codons 확인
table = CodonTable.unambiguous_dna_by_id[2]  # Vertebrate Mito
assert 'ATA' in table.start_codons  # Mito에서 ATA도 start
assert 'AGA' in table.stop_codons   # Mito에서 AGA는 stop

# 4. ProtParam 동작 확인
pa = ProteinAnalysis("MAIVMGRKGAR")
mw = pa.molecular_weight()
pi = pa.isoelectric_point()
assert mw > 0 and pi > 0

# 5. RSCU 계산 확인
from Bio.SeqUtils.CodonUsage import SynonymousCodons
assert len(SynonymousCodons) > 0
```

**실패 시 대안**: BioPython 없이 순수 Python 구현.
- codon table: NCBI genetic code table을 정적 dict로 하드코딩
- 번역/ORF: 문자열 처리 (triplet → amino acid 매핑)
- ProtParam: ExPASy 공식 기반 직접 구현 (MW/pI/GRAVY 공식 공개됨)

---

## 도구 1: Translation 워크벤치 (`/genetics/translation`)

3개 탭으로 구성된 통합 도구.

### 공통 입력

- DNA 서열 (FASTA 텍스트 또는 파일 업로드, MultiSequenceInput 재사용)
- Genetic code table 선택 (Standard, Vertebrate Mitochondrial 등)
  - `Bio.Data.CodonTable.unambiguous_dna_by_id` 기반 옵션 목록

### 탭 A: Translation (번역)

**기능:**
- DNA → Protein 번역 (선택한 genetic code)
- 6-frame translation (3 forward + 3 reverse complement)
- start/stop codon 하이라이트 (**선택한 genetic code의 start_codons/stop_codons 사용**)

**출력:**
- 번역된 단백질 서열 (복사 + "단백질 분석으로 전달" 버튼)
- 6-frame 결과 테이블

**BioPython:**
```python
from Bio.Seq import Seq
from Bio.Data import CodonTable

seq = Seq(dna_sequence)
protein = seq.translate(table=genetic_code)
# 6-frame: seq[0:], seq[1:], seq[2:], rc[0:], rc[1:], rc[2:]
```

### 탭 B: ORF Finder

**기능:**
- 6-frame에서 Open Reading Frame 탐색
- **선택한 genetic code의 start/stop codon 사용** (하드코딩 금지)
- 최소 길이 필터 (기본 100 codons)
- 가장 긴 ORF 하이라이트

**start/stop codon 결정:**
```python
from Bio.Data import CodonTable

table = CodonTable.unambiguous_dna_by_id[genetic_code]
starts = set(table.start_codons)   # Standard: {'TTG', 'CTG', 'ATG'}
stops = set(table.stop_codons)     # Standard: {'TAA', 'TAG', 'TGA'}
# Vertebrate Mito: starts={'ATT','ATC','ATA','ATG','GTG'}, stops={'TAA','TAG','AGA','AGG'}
```

**출력:**
- ORF 목록 테이블 (frame, start, end, length, strand)
- 서열 위치 시각화 (6-frame 다이어그램, ECharts custom series)
- 선택한 ORF → 번역 결과 표시 + "단백질 분석으로 전달" 버튼

**BioPython:**
```python
from Bio.Seq import Seq
from Bio.Data import CodonTable

def find_orfs(seq_str, table_id, min_length):
    table = CodonTable.unambiguous_dna_by_id[table_id]
    starts = set(table.start_codons)
    stops = set(table.stop_codons)
    seq = Seq(seq_str)

    for frame in range(3):
        for strand, nuc in [(+1, seq), (-1, seq.reverse_complement())]:
            # starts/stops 기반으로 ORF 탐색
            ...
```

### 탭 C: Codon Usage

**기능:**
- Codon Usage Table — 64 codons 빈도 분석
- RSCU (Relative Synonymous Codon Usage) 계산

**CAI (Codon Adaptation Index) 미구현**: BioPython의 `CodonAdaptationIndex`는 종별 reference coding sequence 집합으로 적응도 테이블을 사전 구축해야 함. BioHub에서 reference CDS를 확보/관리할 경로가 없으므로 현 단계에서 제외.

**출력:**
- Codon usage 히트맵 (64 codons, ECharts heatmap)
- RSCU 바차트 (아미노산별 그룹)

---

## 도구 2: Protein Properties (`/genetics/protein`)

### 기능

- Molecular Weight (Da)
- Isoelectric Point (pI)
- Amino Acid Composition (20 AA 빈도)
- GRAVY (Grand Average of Hydropathicity)
- Aromaticity
- Instability Index
- Extinction Coefficient (reduced/oxidized)

### 입력

- **단백질 서열만 허용** (직접 입력 또는 Translation 도구에서 전달)
- DNA 입력 미지원 — Translation 페이지에서 번역 후 전달하는 흐름만 제공
  - **이유**: Protein 페이지에 genetic code 선택 UI가 없으므로, DNA를 자동 번역하면 Translation 페이지와 다른 결과를 낼 수 있음. 단일 진실 경로(translation → protein) 유지.

### 출력

| 항목 | 예시 값 | 해석 |
|------|---------|------|
| Molecular Weight | 53,274.5 Da | |
| pI | 6.82 | 등전점 |
| GRAVY | -0.234 | 음수=친수성, 양수=소수성 |
| Aromaticity | 0.089 | Phe+Trp+Tyr 비율 |
| Instability Index | 32.4 | <40=안정, ≥40=불안정 |
| Ext. Coefficient | 45,380 M⁻¹cm⁻¹ | 280nm 흡광 |

- 아미노산 조성 바차트 (ECharts)
- 소수성 프로파일 (sliding window, Kyte-Doolittle)

### BioPython

```python
from Bio.SeqUtils.ProtParam import ProteinAnalysis

analysis = ProteinAnalysis(str(protein_seq))
mw = analysis.molecular_weight()
pi = analysis.isoelectric_point()
gravy = analysis.gravy()
aromaticity = analysis.aromaticity()
instability = analysis.instability_index()
ext_coeff = analysis.molar_extinction_coefficient()  # (reduced, oxidized)
```

### 향후 확장: UniProt 연동

**전제 조건**: accession이 있는 서열에서만 UniProt 조회 가능.

```
경로 1: GenBank → 서열 획득 (accession 포함) → translation → protein
  → "UniProt에서 기능 조회" 버튼 활성화
  → GenBank accession → UniProt ID Mapping (submit→poll→fetch)
    → 단백질 기능 주석, GO term, 키워드 표시

경로 2: 직접 입력/파일 업로드 (accession 없음)
  → UniProt 버튼 비활성화 (accession 없이는 매핑 불가)
  → 대안: UniProt 텍스트 검색 (protein_name 또는 organism 기반) — 향후 고려
```

**accession 전달**: `sequence-transfer.ts`의 `TransferPayload`에 `accession?: string` 추가.
GenBank에서 서열 가져올 때 accession이 함께 전달되고, translation → protein으로 이어질 때 유지됨.

- CORS 지원 → Workers 프록시 불필요 (브라우저 직접 호출)
- 폴링 패턴 → `useApiExecution` 제네릭 훅 활용
- 상세: [../../docs/databases/uniprot.md](../../docs/databases/uniprot.md)

---

## 구현 방안

### Worker

Worker 10 신설 (`PyodideWorker.MolBio = 10`).

```
Worker 10 (MolBio)
├── packages: ['biopython'] (WORKER_PACKAGES 선언, 첫 호출 시 자동 로드 ~3MB)
├── translate(sequence, geneticCode)          → 6-frame 번역
├── find_orfs(sequence, minLength, table)      → ORF 목록
├── codon_usage(sequence, geneticCode)         → 빈도 + RSCU
└── protein_properties(proteinSeq)             → ProtParam 결과
```

Pyodide 싱글턴 런타임 — Worker 10 첫 호출 시 BioPython 1회 로드(~3MB).
이후 세션 내 즉시 실행. 기존 Worker 9(distance/HW/Fst)에 영향 없음.

**Worker 10 추가 시 수정 필요 파일:**

| 파일 | 변경 |
|------|------|
| `pyodide-worker.enum.ts` | `MolBio = 10` 추가 + `WORKER_PACKAGES`, `WORKER_FILE_PATHS` |
| `methods-registry.types.ts` | `WorkerNumber` 유니온에 `10` 추가 |
| `pyodide-worker.ts` | Worker 10 초기화/호출 매핑 |
| `pyodide-core.service.ts` | `ensureWorker10Loaded()` 편의 메서드 (선택) |
| `methods-registry.test.ts` | Worker 번호 범위 검증 테스트 갱신 |
| `worker10-molbio.py` | 신규 Python 워커 코드 |

### 도구 간 연결

```
GenBank → 서열 획득 (accession 포함)
  → seq-stats (통계)
  → translation (번역 + ORF + 코돈) → protein (단백질 특성 → UniProt)
  → similarity / phylogeny (비교 분석)
```

기존 `sequence-transfer.ts` 확장:
- `TransferPayload`에 `sequenceType: 'DNA' | 'protein'` 필드 추가
- `TransferPayload`에 `accession?: string` 필드 추가 (UniProt 연동용)
- Translation/ORF → Protein 전달 시 단백질 서열 + `sequenceType: 'protein'` 저장
- Protein 페이지 mount 시 전달된 서열 확인 + 타입에 따라 입력 모드 자동 전환

### 히스토리

`GeneticsToolType` union에 `'translation'`, `'protein'` 추가.

**수정 필요 위치 (analysis-history.ts):**

| 위치 | 변경 |
|------|------|
| `GeneticsToolType` (line ~21) | 유니온에 `'translation' \| 'protein'` 추가 |
| `GeneticsHistoryEntry` (line ~142) | `TranslationHistoryEntry \| ProteinHistoryEntry` 추가 |
| `MAX_PER_TYPE` (line ~161) | `'translation': 15, 'protein': 15` 추가 |
| `entityKindForType` (line ~177) | `'translation' → 'translation-result'`, `'protein' → 'protein-result'` 명시 추가 (default `'blast-result'` 폴백 방지) |
| `normalizeEntry` (line ~200) | 새 타입별 case 추가 |
| `SaveGeneticsHistoryInput` (line ~474) | 새 Entry 타입의 `Omit<..., 'id' \| 'createdAt'>` 추가 |
| `history-adapters.ts` | `toTranslationItem()`, `toProteinItem()` 어댑터 + switch case |

**추가 — Project Entity:**
- `packages/types/src/project.ts`: `ProjectEntityKind`에 `'translation-result'`, `'protein-result'` 추가
- `lib/research/entity-resolver.ts`: `_GENERIC_ONLY_KINDS`에 등록

### 랜딩 페이지

genetics 랜딩(`/genetics/page.tsx`) TOOLS 배열을 2그룹으로 분리:

| 그룹 | 도구 |
|------|------|
| 서열 분석 도구 | Barcoding, BLAST, GenBank, seq-stats, Similarity, Phylogeny, BOLD |
| 분자생물학 도구 | Translation 워크벤치, Protein Properties |

---

## 구현 순서

| Step | 내용 | 선행 조건 |
|------|------|----------|
| 1 | BioPython Pyodide 호환성 검증 (biopython 1.85 기준) | 없음 |
| 2 | Worker 10 인프라 (enum, types, registry, Python 파일) | Step 1 |
| 3 | Translation 워크벤치 — 번역 탭 | Step 2 |
| 4 | Translation — ORF 탭 (CodonTable 기반 start/stop) + Codon 탭 | Step 3 |
| 5 | Protein Properties 페이지 (단백질 서열만, DNA 미지원) | Step 2 |
| 6 | 서열 전달 확장 (sequenceType + accession) + 히스토리 | Step 4, 5 |
| 7 | 랜딩 페이지 서브그룹 + SubNav 확장 | Step 5 |
| 8 | `useApiExecution` 훅 통합 (BLAST/BOLD 리팩토링) | 독립 |
| 9 | UniProt 연동 (accession 있는 경우만, useApiExecution 활용) | Step 5, 8 |

---

## 의존성

| 항목 | 변경 |
|------|------|
| 신규 Python 패키지 | `biopython 1.85` (Pyodide 0.29.3 사전 빌드, ~3MB) |
| 신규 JS 라이브러리 | 없음 |
| Worker | Worker 10 신설 — 6개 파일 수정 (상세: 구현 방안 > Worker) |
| 히스토리 | 7개 위치 수정 (상세: 구현 방안 > 히스토리) |
| 서열 전달 | `sequenceType` + `accession` 필드 추가 |
| Project Entity | 2개 kind 추가 (`translation-result`, `protein-result`) |

---

## 비구현 (의도적 제외)

| 기능 | 이유 |
|------|------|
| Codon Adaptation Index (CAI) | 종별 reference CDS 집합 필요 — BioHub에서 확보/관리 경로 없음 |
| Protein 페이지 DNA 입력 | genetic code 선택 UI 없음 → Translation과 결과 불일치 위험 |
| UniProt 직접 입력 서열 매핑 | accession 없이는 ID mapping 불가 — 텍스트 검색은 향후 고려 |
| Bio.Align (pairwise alignment) | C 확장 없으면 100배 느림, 현재 distance 기반으로 충분 |
| Bio.PopGen | 이미 HW/Fst 직접 구현됨 |
| Bio.PDB | 구조생물학은 BioHub 범위 밖 |
| Bio.Restriction | 분자 클로닝 특화, BioHub 주 타겟(생태학/집단유전학)과 거리 |
| Bio.motifs | 전사인자 연구 특화, 범용성 낮음 |

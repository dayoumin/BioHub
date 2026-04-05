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

- BioPython은 `py3-none-any` wheel → `micropip.install('biopython')`으로 설치 가능
- 사용 모듈: `Bio.Seq`, `Bio.SeqUtils`, `Bio.SeqUtils.CodonUsage`, `Bio.SeqUtils.ProtParam`
- 모두 순수 Python (C 확장 없음)
- **첫 로드 시 다운로드** 필요 → lazy load 패턴 적용

### 호환성 검증 (구현 Step 1)

구현 착수 시 Pyodide에서 아래 코드가 동작하는지 먼저 확인:

```python
import micropip
await micropip.install('biopython')
from Bio.Seq import Seq
from Bio.SeqUtils.ProtParam import ProteinAnalysis
from Bio.SeqUtils.CodonUsage import CodonAdaptationIndex
```

**실패 시 대안**: BioPython 없이 순수 Python 구현. codon table은 정적 dict, 번역/ORF는 단순 문자열 처리, ProtParam 공식은 공개되어 있음 (ExPASy 참조).

---

## 도구 1: Translation 워크벤치 (`/genetics/translation`)

3개 탭으로 구성된 통합 도구.

### 공통 입력

- DNA 서열 (FASTA 텍스트 또는 파일 업로드, MultiSequenceInput 재사용)
- Genetic code table 선택 (Standard, Vertebrate Mitochondrial 등)

### 탭 A: Translation (번역)

**기능:**
- DNA → Protein 번역 (선택한 genetic code)
- 6-frame translation (3 forward + 3 reverse complement)
- start/stop codon 하이라이트

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
- start codon (ATG) → stop codon (TAA/TAG/TGA) 구간 식별
- 최소 길이 필터 (기본 100 codons)
- 가장 긴 ORF 하이라이트

**출력:**
- ORF 목록 테이블 (frame, start, end, length, strand)
- 서열 위치 시각화 (6-frame 다이어그램, ECharts custom series)
- 선택한 ORF → 번역 결과 표시 + "단백질 분석으로 전달" 버튼

**BioPython:**
```python
from Bio.Seq import Seq

def find_orfs(seq, table, min_length):
    for frame in range(3):
        for strand, nuc in [(+1, seq), (-1, seq.reverse_complement())]:
            trans = nuc[frame:].translate(table=table)
            # ATG 위치 → 다음 stop codon 사이 구간 추출
```

### 탭 C: Codon Usage

**기능:**
- Codon Usage Table — 64 codons 빈도 분석
- RSCU (Relative Synonymous Codon Usage) 계산
- Codon Adaptation Index (CAI) — 선택적

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

- 단백질 서열 (직접 입력 또는 Translation 도구에서 전달)
- 또는 DNA → 자동 번역 후 분석

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

번역된 단백질 → UniProt ID Mapping → 기능 주석 조회.

```
ProtParam 결과 화면 → "UniProt에서 기능 조회" 버튼
  → GenBank accession → UniProt ID Mapping (submit→poll→fetch)
    → 단백질 기능 주석, GO term, 키워드 표시
```

- CORS 지원 → Workers 프록시 불필요 (브라우저 직접 호출)
- 폴링 패턴 → `useApiExecution` 제네릭 훅 활용
- 상세: [../../docs/databases/uniprot.md](../../docs/databases/uniprot.md)

---

## 구현 방안

### Worker

Worker 10 신설 (`PyodideWorker.MolBio = 10`).

```
Worker 10 (MolBio)
├── packages: [] (런타임에 micropip lazy load)
├── translate(sequence, geneticCode)          → 6-frame 번역
├── find_orfs(sequence, minLength, table)      → ORF 목록
├── codon_usage(sequence, geneticCode)         → 빈도 + RSCU
└── protein_properties(proteinSeq)             → ProtParam 결과
```

**lazy load**: BioPython wheel ~5MB, Worker 10 첫 호출 시 1회만 다운로드.
기존 Worker 9(distance/HW/Fst)에 영향 없음.

### 도구 간 연결

```
GenBank → 서열 획득
  → seq-stats (통계)
  → translation (번역 + ORF + 코돈) → protein (단백질 특성 → UniProt)
  → similarity / phylogeny (비교 분석)
```

기존 `sequence-transfer.ts` 확장 — 단백질 서열 전달 지원 추가.

### 히스토리

`GeneticsToolType` union에 `'translation'`, `'protein'` 추가.
`analysis-history.ts` discriminated union 패턴 동일.

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
| 1 | BioPython Pyodide 호환성 검증 | 없음 |
| 2 | Worker 10 + Translation 워크벤치 (번역 탭) | Step 1 |
| 3 | Translation ORF 탭 + Codon 탭 | Step 2 |
| 4 | Protein Properties 페이지 | Step 2 |
| 5 | 서열 전달 (translation → protein) + 히스토리 | Step 3, 4 |
| 6 | 랜딩 페이지 서브그룹 + SubNav 확장 | Step 4 |
| 7 | `useApiExecution` 훅 통합 (BLAST/BOLD 리팩토링) | 독립 |
| 8 | UniProt 연동 (useApiExecution 활용) | Step 4, 7 |

---

## 의존성

| 항목 | 변경 |
|------|------|
| 신규 Python 패키지 | `biopython` (micropip, ~5MB, lazy load) |
| 신규 JS 라이브러리 | 없음 |
| Worker | Worker 10 신설 (`PyodideWorker.MolBio = 10`) |
| 히스토리 | `GeneticsToolType`에 `'translation'`, `'protein'` 추가 |
| 서열 전달 | `sequence-transfer.ts` — 단백질 서열 지원 확장 |

---

## 비구현 (의도적 제외)

| 기능 | 이유 |
|------|------|
| Bio.Align (pairwise alignment) | C 확장 없으면 100배 느림, 현재 distance 기반으로 충분 |
| Bio.PopGen | 이미 HW/Fst 직접 구현됨 |
| Bio.PDB | 구조생물학은 BioHub 범위 밖 |
| Bio.Restriction | 분자 클로닝 특화, BioHub 주 타겟(생태학/집단유전학)과 거리 |
| Bio.motifs | 전사인자 연구 특화, 범용성 낮음 |

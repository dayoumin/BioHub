# BioPython 분자생물학 도구 계획

> **작성일**: 2026-04-04
> **상태**: 계획 수립
> **상위**: [../README.md](../README.md) 로드맵 "분자생물학 도구" 섹션

---

## 개요

BioPython 순수 Python 모듈을 활용하여 서열 분석 워크플로우에 분자생물학 기본 도구 3종을 추가한다.
현재 "서열 획득 → 통계 → 비교" 흐름에 "**번역/분석**" 단계가 자연스럽게 추가됨.

## Pyodide 호환성

- BioPython은 `py3-none-any` wheel → `micropip.install('biopython')`으로 설치 가능
- 사용 모듈: `Bio.Seq`, `Bio.SeqUtils`, `Bio.SeqUtils.CodonUsage`, `Bio.SeqUtils.ProtParam`
- 모두 순수 Python (C 확장 없음)
- **첫 로드 시 다운로드** 필요 → lazy load 패턴 적용

---

## 도구 1: Codon Usage Analysis + Translation

### 기능

- DNA → Protein 번역 (standard + mitochondrial genetic code 선택)
- 6-frame translation (3 forward + 3 reverse complement)
- Codon Usage Table — 종별 codon bias 분석
- RSCU (Relative Synonymous Codon Usage) 계산
- Codon Adaptation Index (CAI) — 선택적

### 입력

- DNA 서열 (FASTA 텍스트 또는 파일 업로드)
- Genetic code table 선택 (Standard, Vertebrate Mitochondrial 등)

### 출력

- 번역된 단백질 서열
- 6-frame 번역 결과 (start/stop codon 하이라이트)
- Codon usage 히트맵 (64 codons × 빈도)
- RSCU 바차트

### BioPython 사용

```python
from Bio.Seq import Seq
from Bio.SeqUtils.CodonUsage import CodonAdaptationIndex
from Bio.Data import CodonTable

seq = Seq(dna_sequence)
protein = seq.translate(table=genetic_code)
# 6-frame: seq[0:], seq[1:], seq[2:], rc[0:], rc[1:], rc[2:]
```

---

## 도구 2: ORF Finder

### 기능

- 6-frame에서 Open Reading Frame 탐색
- start codon (ATG) → stop codon (TAA/TAG/TGA) 구간 식별
- 최소 길이 필터 (기본 100 codons)
- 가장 긴 ORF 하이라이트 + 번역 결과

### 입력

- DNA 서열 (단일 또는 multi-FASTA)
- 최소 ORF 길이 (codons)
- Genetic code table
- Start codon 옵션 (ATG only vs ATG+alternative)

### 출력

- ORF 목록 (frame, start, end, length, strand)
- 서열 위치 시각화 (6-frame 다이어그램)
- 선택한 ORF의 단백질 번역

### BioPython 사용

```python
from Bio.Seq import Seq

def find_orfs(seq, table, min_length):
    for frame in range(3):
        for strand, nuc in [(+1, seq), (-1, seq.reverse_complement())]:
            trans = nuc[frame:].translate(table=table)
            # ATG 위치 → 다음 stop codon 사이 구간 추출
```

---

## 도구 3: Protein Properties (ProtParam)

### 기능

- Molecular Weight (Da)
- Isoelectric Point (pI)
- Amino Acid Composition (20 AA 빈도)
- GRAVY (Grand Average of Hydropathicity)
- Aromaticity
- Instability Index
- Extinction Coefficient (reduced/oxidized)

### 입력

- 단백질 서열 (직접 입력 또는 Codon/ORF 도구에서 전달)
- 또는 DNA → 자동 번역 후 분석

### 출력

| 항목 | 예시 값 |
|------|---------|
| Molecular Weight | 53,274.5 Da |
| pI | 6.82 |
| GRAVY | -0.234 |
| Aromaticity | 0.089 |
| Instability Index | 32.4 (stable) |
| Ext. Coefficient | 45,380 M⁻¹cm⁻¹ |

- 아미노산 조성 바차트
- 소수성 프로파일 (sliding window)

### BioPython 사용

```python
from Bio.SeqUtils.ProtParam import ProteinAnalysis

analysis = ProteinAnalysis(str(protein_seq))
mw = analysis.molecular_weight()
pi = analysis.isoelectric_point()
gravy = analysis.gravy()
aromaticity = analysis.aromaticity()
instability = analysis.instability_index()
```

---

## 구현 방안

### Worker 확장

Worker 9(genetics)에 BioPython 로드 추가 또는 Worker 10 신설.

```
Worker 9 or 10
├── micropip.install('biopython')    ← lazy load (첫 호출 시)
├── codon_analysis(sequence, geneticCode)
├── find_orfs(sequence, minLength, table)
└── protein_properties(proteinSeq)
```

**lazy load 이유**: BioPython wheel ~5MB, 기존 genetics 도구(distance/HW/Fst)는 BioPython 불필요.
Worker 10 신설이 기존 Worker 9 성능에 영향 없으므로 권장.

### 페이지 구조

| 경로 | 도구 |
|------|------|
| `/genetics/codon` | Codon Usage + Translation |
| `/genetics/orf` | ORF Finder |
| `/genetics/protein` | Protein Properties |

### 도구 간 연결

```
GenBank → 서열 획득
  → seq-stats (통계)
  → codon (번역/코돈 분석) → protein (단백질 특성)
  → orf (ORF 탐색) → protein (단백질 특성)
  → similarity/phylogeny (비교 분석)
```

### 의존성

| 항목 | 변경 |
|------|------|
| 신규 Python 패키지 | `biopython` (micropip, ~5MB) |
| 신규 JS 라이브러리 | 없음 |
| Worker | Worker 10 신설 권장 |
| Pyodide enum | `PyodideWorker.MolBio = 10` 추가 |

---

## 비구현 (의도적 제외)

| 기능 | 이유 |
|------|------|
| Bio.Align (pairwise alignment) | C 확장 없으면 100배 느림, 현재 distance 기반으로 충분 |
| Bio.PopGen | 이미 HW/Fst 직접 구현됨 |
| Bio.PDB | 구조생물학은 BioHub 범위 밖 |
| Bio.Restriction | 분자 클로닝 특화, BioHub 주 타겟(생태학/집단유전학)과 거리 |
| Bio.motifs | 전사인자 연구 특화, 범용성 낮음 |

# Worker 10: Molecular Biology Python Module
# Notes:
# - Dependencies: BioPython 1.85 (Pyodide 0.29.3 pre-built)
# - Tools: DNA→Protein translation, ORF finder, Codon usage, Protein properties
# - Estimated memory: ~3MB (BioPython)

from typing import List, Dict

from Bio.Seq import Seq
from Bio.Data import CodonTable
from Bio.SeqUtils.ProtParam import ProteinAnalysis

# Kyte-Doolittle 소수성 스케일 (모듈 상수)
KD_SCALE = {
    'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
    'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
    'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
    'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
}


# ─── 내부 함수 ────────────────────────────────────────────


def _clean_sequence(seq_str: str, seq_type: str = 'dna') -> str:
    """서열 문자열 정리 — 공백/숫자/FASTA 헤더 제거."""
    lines = seq_str.strip().split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if line.startswith('>'):
            continue
        # 숫자, 공백, 탭 제거
        line = ''.join(c for c in line if c.isalpha())
        cleaned.append(line)
    result = ''.join(cleaned).upper()
    if seq_type == 'dna':
        # DNA: A, T, G, C, N 등 IUPAC 허용
        result = ''.join(c for c in result if c in 'ATGCNRYSWKMBDHV')
    elif seq_type == 'protein':
        # 단백질: 20 표준 아미노산 + stop codon 기호 제거
        result = result.replace('*', '')
        result = ''.join(c for c in result if c.isalpha())
    return result


def _translate_frame(seq_str: str, frame: int, table_id: int) -> Dict:
    """단일 reading frame 번역."""
    seq = Seq(seq_str[frame:])
    # 3의 배수로 자르기
    remainder = len(seq) % 3
    if remainder:
        seq = seq[:-remainder]
    if len(seq) == 0:
        return {'frame': frame + 1, 'protein': '', 'startPos': frame, 'codons': 0}

    protein = str(seq.translate(table=table_id))
    return {
        'frame': frame + 1,
        'protein': protein,
        'startPos': frame,
        'codons': len(seq) // 3
    }


_AVAILABLE_TABLES_CACHE: List[Dict] = []


def _get_available_tables() -> List[Dict]:
    """사용 가능한 genetic code table 목록 (모듈 내 1회 계산 후 캐시)."""
    global _AVAILABLE_TABLES_CACHE
    if _AVAILABLE_TABLES_CACHE:
        return _AVAILABLE_TABLES_CACHE
    tables = []
    for table_id in sorted(CodonTable.unambiguous_dna_by_id.keys()):
        table = CodonTable.unambiguous_dna_by_id[table_id]
        tables.append({
            'id': table_id,
            'name': table.names[0] if table.names else f'Table {table_id}',
            'startCodons': sorted(table.start_codons),
            'stopCodons': sorted(table.stop_codons)
        })
    _AVAILABLE_TABLES_CACHE = tables
    return tables


# ─── 공개 메서드 (Exported to TypeScript) ────────────────


def translate(sequence: str, geneticCode: int = 1) -> Dict:
    """
    DNA → Protein 6-frame 번역.

    Parameters
    ----------
    sequence : str
        DNA 서열 (FASTA 또는 raw)
    geneticCode : int
        NCBI genetic code table ID (기본: 1 = Standard)

    Returns
    -------
    Dict with keys: frames, reverseComplement
    """
    seq_str = _clean_sequence(sequence, 'dna')
    if len(seq_str) < 3:
        raise ValueError(f"서열이 너무 짧습니다 (최소 3bp 필요, 현재 {len(seq_str)}bp)")

    # genetic code 유효성 검증
    if geneticCode not in CodonTable.unambiguous_dna_by_id:
        raise ValueError(f"지원하지 않는 genetic code: {geneticCode}")

    table = CodonTable.unambiguous_dna_by_id[geneticCode]
    rc_str = str(Seq(seq_str).reverse_complement())

    frames = []
    # Forward 3 frames
    for f in range(3):
        result = _translate_frame(seq_str, f, geneticCode)
        result['strand'] = '+'
        frames.append(result)

    # Reverse complement 3 frames
    for f in range(3):
        result = _translate_frame(rc_str, f, geneticCode)
        result['strand'] = '-'
        result['frame'] = -(f + 1)
        frames.append(result)

    return {
        'frames': frames,
        'reverseComplement': rc_str,
        'sequenceLength': len(seq_str),
        'geneticCodeName': table.names[0] if table.names else f'Table {geneticCode}',
        'startCodons': sorted(table.start_codons),
        'stopCodons': sorted(table.stop_codons),
        'availableTables': _get_available_tables()
    }


def find_orfs(sequence: str, geneticCode: int = 1, minLength: int = 100) -> Dict:
    """
    6-frame에서 Open Reading Frame 탐색.

    Parameters
    ----------
    sequence : str
        DNA 서열
    geneticCode : int
        NCBI genetic code table ID
    minLength : int
        최소 ORF 길이 (codons, 기본 100)

    Returns
    -------
    Dict with keys: orfs, sequenceLength
    """
    seq_str = _clean_sequence(sequence, 'dna')
    if len(seq_str) < 3:
        raise ValueError(f"서열이 너무 짧습니다 (최소 3bp 필요, 현재 {len(seq_str)}bp)")

    if geneticCode not in CodonTable.unambiguous_dna_by_id:
        raise ValueError(f"지원하지 않는 genetic code: {geneticCode}")

    table = CodonTable.unambiguous_dna_by_id[geneticCode]
    starts = set(table.start_codons)
    stops = set(table.stop_codons)

    rc_str = str(Seq(seq_str).reverse_complement())
    orfs = []

    for strand, nuc_str in [('+', seq_str), ('-', rc_str)]:
        for frame in range(3):
            # 프레임 내 모든 start codon 위치를 추적하여 nested ORF 탐지
            start_positions = []
            i = frame

            while i + 2 < len(nuc_str):
                codon = nuc_str[i:i+3]

                if codon in starts:
                    start_positions.append(i)

                if codon in stops and start_positions:
                    orf_end = i + 3  # stop codon 포함
                    # 각 start 위치에서 시작하는 ORF를 모두 보고
                    for orf_start in start_positions:
                        orf_len_codons = (orf_end - orf_start) // 3
                        if orf_len_codons >= minLength:
                            orf_seq = nuc_str[orf_start:orf_end]
                            protein = str(Seq(orf_seq).translate(table=geneticCode))

                            if strand == '+':
                                genomic_start = orf_start
                                genomic_end = orf_end
                            else:
                                genomic_start = len(seq_str) - orf_end
                                genomic_end = len(seq_str) - orf_start

                            orfs.append({
                                'strand': strand,
                                'frame': frame + 1 if strand == '+' else -(frame + 1),
                                'start': genomic_start,
                                'end': genomic_end,
                                'lengthBp': orf_end - orf_start,
                                'lengthCodons': orf_len_codons,
                                'startCodon': nuc_str[orf_start:orf_start+3],
                                'stopCodon': codon,
                                'protein': protein.rstrip('*')
                            })
                    start_positions = []
                elif codon in stops:
                    start_positions = []
                i += 3

    # 길이순 내림차순 정렬
    orfs.sort(key=lambda x: x['lengthCodons'], reverse=True)

    return {
        'orfs': orfs,
        'sequenceLength': len(seq_str),
        'geneticCodeName': table.names[0] if table.names else f'Table {geneticCode}',
        'startCodons': sorted(table.start_codons),
        'stopCodons': sorted(table.stop_codons),
        'minLength': minLength,
        'totalFound': len(orfs)
    }


def codon_usage(sequence: str, geneticCode: int = 1) -> Dict:
    """
    코돈 사용 빈도 + RSCU 계산.

    Parameters
    ----------
    sequence : str
        DNA 서열
    geneticCode : int
        NCBI genetic code table ID

    Returns
    -------
    Dict with keys: codonCounts, rscu, totalCodons, aminoAcidFrequency
    """
    seq_str = _clean_sequence(sequence, 'dna')
    if len(seq_str) < 3:
        raise ValueError(f"서열이 너무 짧습니다 (최소 3bp 필요, 현재 {len(seq_str)}bp)")

    if geneticCode not in CodonTable.unambiguous_dna_by_id:
        raise ValueError(f"지원하지 않는 genetic code: {geneticCode}")

    table = CodonTable.unambiguous_dna_by_id[geneticCode]

    # forward_table: codon → amino acid
    forward = dict(table.forward_table)
    for stop in table.stop_codons:
        forward[stop] = '*'

    # 코돈 빈도 세기 (frame 0만)
    codon_counts = {}
    total_codons = 0
    for i in range(0, len(seq_str) - 2, 3):
        codon = seq_str[i:i+3]
        if len(codon) == 3 and all(c in 'ATGC' for c in codon):
            codon_counts[codon] = codon_counts.get(codon, 0) + 1
            total_codons += 1

    # 아미노산별 동의 코돈 그룹 구성
    aa_to_codons = {}
    for codon, aa in forward.items():
        if aa == '*':
            continue
        if aa not in aa_to_codons:
            aa_to_codons[aa] = []
        aa_to_codons[aa].append(codon)

    # RSCU 계산: RSCU_ij = (X_ij * n_i) / sum(X_ij)
    # X_ij = 코돈 j의 관찰 빈도, n_i = 동의 코돈 수
    rscu = {}
    for aa, codons in aa_to_codons.items():
        total_for_aa = sum(codon_counts.get(c, 0) for c in codons)
        n_synonymous = len(codons)
        for c in codons:
            observed = codon_counts.get(c, 0)
            if total_for_aa > 0:
                rscu[c] = (observed * n_synonymous) / total_for_aa
            else:
                rscu[c] = 0.0

    # 아미노산 빈도
    aa_freq = {}
    for codon, count in codon_counts.items():
        aa = forward.get(codon, '?')
        if aa != '*' and aa != '?':
            aa_freq[aa] = aa_freq.get(aa, 0) + count

    # 코돈별 상세 정보
    codon_details = []
    for codon in sorted(forward.keys()):
        aa = forward[codon]
        codon_details.append({
            'codon': codon,
            'aminoAcid': aa,
            'count': codon_counts.get(codon, 0),
            'frequency': codon_counts.get(codon, 0) / total_codons if total_codons > 0 else 0,
            'rscu': round(rscu.get(codon, 0.0), 3)
        })

    return {
        'codonCounts': codon_details,
        'rscu': {k: round(v, 3) for k, v in rscu.items()},
        'totalCodons': total_codons,
        'aminoAcidFrequency': aa_freq,
        'sequenceLength': len(seq_str),
        'geneticCodeName': table.names[0] if table.names else f'Table {geneticCode}'
    }


def protein_properties(proteinSeq: str) -> Dict:
    """
    단백질 물리화학적 특성 분석 (ProtParam).

    Parameters
    ----------
    proteinSeq : str
        단백질 서열 (1-letter amino acid code)

    Returns
    -------
    Dict with ProtParam 결과
    """
    seq_str = _clean_sequence(proteinSeq, 'protein')

    valid_aa = set('ACDEFGHIKLMNPQRSTVWY')
    invalid = [c for c in seq_str if c not in valid_aa]
    if invalid:
        unique_invalid = sorted(set(invalid))
        raise ValueError(f"유효하지 않은 아미노산: {', '.join(unique_invalid)}")

    if len(seq_str) < 2:
        raise ValueError(f"서열이 너무 짧습니다 (최소 2 아미노산 필요, 현재 {len(seq_str)})")

    analysis = ProteinAnalysis(seq_str)

    mw = analysis.molecular_weight()
    pi = analysis.isoelectric_point()
    gravy = analysis.gravy()
    aromaticity = analysis.aromaticity()
    instability = analysis.instability_index()
    ext_coeff = analysis.molar_extinction_coefficient()  # (reduced, oxidized)
    aa_count = analysis.count_amino_acids()
    aa_percent = {k: v / 100 for k, v in analysis.amino_acids_percent.items()}
    sec_struct = analysis.secondary_structure_fraction()  # (helix, turn, sheet)

    # Kyte-Doolittle 소수성 프로파일 (window=7)
    window = min(7, len(seq_str))

    hydropathy = []
    half_w = window // 2
    for i in range(half_w, len(seq_str) - half_w):
        window_seq = seq_str[i - half_w:i + half_w + 1]
        score = sum(KD_SCALE.get(aa, 0) for aa in window_seq) / len(window_seq)
        hydropathy.append({
            'position': i + 1,
            'score': round(score, 3)
        })

    return {
        'molecularWeight': round(mw, 2),
        'isoelectricPoint': round(pi, 2),
        'gravy': round(gravy, 3),
        'aromaticity': round(aromaticity, 4),
        'instabilityIndex': round(instability, 2),
        'isStable': instability < 40,
        'extinctionCoeffReduced': ext_coeff[0],
        'extinctionCoeffOxidized': ext_coeff[1],
        'aminoAcidComposition': dict(aa_count),
        'aminoAcidPercent': {k: round(v, 4) for k, v in aa_percent.items()},
        'secondaryStructureFraction': {
            'helix': round(sec_struct[0], 4),
            'turn': round(sec_struct[1], 4),
            'sheet': round(sec_struct[2], 4)
        },
        'hydropathyProfile': hydropathy,
        'sequenceLength': len(seq_str),
        'sequence': seq_str
    }

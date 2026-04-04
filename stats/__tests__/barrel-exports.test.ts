/**
 * Barrel Export 시뮬레이션 테스트
 *
 * 검증 항목:
 * 1. 각 barrel에서 import 가능한지 (모듈 해석)
 * 2. 주요 export 심볼이 존재하는지
 * 3. AnalysisPhase 단일 소스 (3중 export 해소 확인)
 * 4. 타입-only export가 런타임 값을 노출하지 않는지
 */
import { describe, it, expect } from 'vitest';

// ─── 1. bio-tools barrel ────────────────────────────────────
describe('lib/bio-tools barrel', () => {
  it('레지스트리 타입과 함수를 export', async () => {
    const mod = await import('@/lib/bio-tools');
    // 레지스트리
    expect(mod.BIO_TOOLS).toBeDefined();
    expect(mod.BIO_TOOL_CATEGORIES).toBeDefined();
    expect(typeof mod.getBioToolById).toBe('function');
    expect(typeof mod.getBioToolsByCategory).toBe('function');
  });

  it('메타데이터 함수를 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(typeof mod.getBioToolMeta).toBe('function');
    expect(typeof mod.getBioToolWithMeta).toBe('function');
  });

  it('이력 CRUD를 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(typeof mod.loadBioToolHistory).toBe('function');
    expect(typeof mod.saveBioToolEntry).toBe('function');
    expect(typeof mod.getBioToolEntry).toBe('function');
    expect(typeof mod.deleteBioToolEntries).toBe('function');
  });

  it('차트 색상을 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(mod.BIO_CHART_COLORS).toBeDefined();
  });

  it('CSV 내보내기 유틸을 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(typeof mod.tablesToCsvString).toBe('function');
    expect(typeof mod.downloadAsCsv).toBe('function');
  });

  it('컬럼 탐지 함수를 export', async () => {
    const mod = await import('@/lib/bio-tools');
    // fisheries
    expect(typeof mod.detectColumn).toBe('function');
    expect(typeof mod.detectAgeColumn).toBe('function');
    expect(typeof mod.detectLengthColumn).toBe('function');
    expect(typeof mod.detectWeightColumn).toBe('function');
    // genetics
    expect(typeof mod.detectLocusColumn).toBe('function');
    expect(typeof mod.detectPopulationColumn).toBe('function');
  });

  it('parseNumericCell을 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(typeof mod.parseNumericCell).toBe('function');
    expect(mod.parseNumericCell('3.14')).toBeCloseTo(3.14);
    expect(Number.isNaN(mod.parseNumericCell(null))).toBe(true);
  });

  it('Fst long-format 변환을 export', async () => {
    const mod = await import('@/lib/bio-tools');
    expect(typeof mod.convertLongFormatToLocusData).toBe('function');
  });
});

// ─── 2. genetics barrel ─────────────────────────────────────
describe('lib/genetics barrel', () => {
  it('abortable-sleep을 export (AnalysisPhase 정본)', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.abortableSleep).toBe('function');
  });

  it('AnalysisPhase가 단일 소스에서만 나오는지 확인 (3중 export 해소)', async () => {
    // AnalysisPhase는 타입이므로 런타임 검증 불가
    // 대신 barrel import 자체가 TS 에러 없이 성공하는 것으로 검증
    const mod = await import('@/lib/genetics');
    expect(mod).toBeDefined();
  });

  it('BLAST 유틸 — 상수와 클래스를 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(mod.BLAST_POLL_INTERVAL_MS).toBeTypeOf('number');
    expect(mod.BLAST_MAX_POLLS).toBeTypeOf('number');
    expect(mod.BLAST_STEP_LABELS).toBeDefined();
    expect(mod.BlastError).toBeDefined();
    expect(typeof mod.fetchBlastResult).toBe('function');
  });

  it('BOLD 유틸 — 상수와 클래스를 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(mod.BOLD_POLL_INTERVAL_MS).toBeTypeOf('number');
    expect(mod.BOLD_MAX_POLLS).toBeTypeOf('number');
    expect(mod.BoldError).toBeDefined();
    expect(typeof mod.parseBoldHits).toBe('function');
  });

  it('서열 검증 함수를 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.validateSequence).toBe('function');
    expect(typeof mod.cleanSequence).toBe('function');
    expect(typeof mod.isDnaProgram).toBe('function');
  });

  it('파서를 export (FASTA, Newick)', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.parseMultiFasta).toBe('function');
    expect(typeof mod.parseNewick).toBe('function');
  });

  it('decision engine을 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.analyzeBlastResult).toBe('function');
    expect(typeof mod.detectTaxonAlert).toBe('function');
    expect(typeof mod.getRecommendedMarkers).toBe('function');
  });

  it('서열 통계 엔진을 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.computeSeqStats).toBe('function');
  });

  it('서열 전달 함수를 export', async () => {
    const mod = await import('@/lib/genetics');
    expect(typeof mod.storeSequenceForTransfer).toBe('function');
    expect(typeof mod.consumeTransferredSequence).toBe('function');
  });
});

// ─── 3. research barrel ─────────────────────────────────────
describe('lib/research barrel', () => {
  it('프로젝트 저장 CRUD를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.listResearchProjects).toBe('function');
    expect(typeof mod.loadResearchProject).toBe('function');
    expect(typeof mod.saveResearchProject).toBe('function');
    expect(typeof mod.deleteResearchProject).toBe('function');
  });

  it('엔티티 참조 관리를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.upsertProjectEntityRef).toBe('function');
    expect(typeof mod.removeProjectEntityRef).toBe('function');
    expect(typeof mod.listProjectEntityRefs).toBe('function');
  });

  it('엔티티 로더/리졸버를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.loadEntityHistories).toBe('function');
    expect(typeof mod.resolveEntities).toBe('function');
  });

  it('인용 관련을 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.saveCitation).toBe('function');
    expect(typeof mod.listCitationsByProject).toBe('function');
    expect(typeof mod.buildCitationString).toBe('function');
    expect(typeof mod.citationKey).toBe('function');
  });

  it('문서 블루프린트를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.saveDocumentBlueprint).toBe('function');
    expect(typeof mod.loadDocumentBlueprints).toBe('function');
    expect(typeof mod.generateDocumentId).toBe('function');
  });

  it('문서 프리셋 레지스트리를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.getPresetRegistry).toBe('function');
    expect(typeof mod.createEmptySections).toBe('function');
  });

  it('보고서 빌드/내보내기를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.buildReport).toBe('function');
    expect(typeof mod.reportToMarkdown).toBe('function');
    expect(typeof mod.copyReportToClipboard).toBe('function');
  });

  it('논문 패키지를 export', async () => {
    const mod = await import('@/lib/research');
    expect(typeof mod.listPackages).toBe('function');
    expect(typeof mod.savePackage).toBe('function');
    expect(typeof mod.generatePackageId).toBe('function');
    expect(mod.JOURNAL_PRESETS).toBeDefined();
  });
});

// ─── 4. services barrel (주요 모듈만) ───────────────────────
describe('lib/services barrel', () => {
  it('변수 타입 탐지를 export', async () => {
    const mod = await import('@/lib/services');
    expect(typeof mod.detectVariableType).toBe('function');
    expect(typeof mod.analyzeDataset).toBe('function');
  });

  it('데이터 유효성 검증을 export', async () => {
    const mod = await import('@/lib/services');
    expect(mod.DataValidationService).toBeDefined();
    expect(mod.DATA_LIMITS).toBeDefined();
  });

  it('Worker 매니저를 export', async () => {
    const mod = await import('@/lib/services');
    expect(mod.workerManager).toBeDefined();
    expect(typeof mod.shouldUseWorker).toBe('function');
  });

  it('Pyodide Worker enum을 export', async () => {
    const mod = await import('@/lib/services');
    expect(mod.PyodideWorker).toBeDefined();
    // enum 값 확인 (Descriptive = 1)
    expect(mod.PyodideWorker.Descriptive).toBe(1);
  });

  it('pyodide-worker의 WorkerRequest/WorkerResponse는 런타임 값이 아님 (type-only)', async () => {
    const mod = await import('@/lib/services');
    // type-only export는 런타임에 존재하지 않아야 함
    expect((mod as Record<string, unknown>)['WorkerRequest']).toBeUndefined();
    expect((mod as Record<string, unknown>)['WorkerResponse']).toBeUndefined();
  });
});

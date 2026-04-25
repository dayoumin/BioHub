// ── 프로젝트 & 엔티티 ──────────────────────────────────────
/** 연구 프로젝트 CRUD + 엔티티 참조 관리 */
export * from './project-storage';

/** 엔티티 이력 일괄 로딩 (도메인별 어댑터) */
export { loadEntityHistories } from './entity-loader';

/** 엔티티 해석 — 참조 → 표시용 요약 변환 */
export * from './entity-resolver';

/** 엔티티 탭 레지스트리 (아이콘, 라벨, 가시성) */
export * from './entity-tab-registry';

// ── 인용 ────────────────────────────────────────────────────
/** 인용 레코드 타입 + 키 생성 */
export * from './citation-types';

/** 인용 localStorage CRUD */
export * from './citation-storage';

/** APA 포맷 인용 문자열 빌더 */
export * from './citation-apa-formatter';

/** CSL/citeproc 기반 인용 렌더러 */
export * from './citation-csl';

/** 섹션별 narrative support 자산 타입 */
export * from './document-support-asset-types';

// ── 문서 블루프린트 ─────────────────────────────────────────
/** 문서 블루프린트 타입 (섹션, 테이블, 메타데이터) */
export * from './document-blueprint-types';

/** 문서 블루프린트 localStorage CRUD */
export * from './document-blueprint-storage';

/** 문서 프리셋 레지스트리 (논문/보고서 템플릿) */
export * from './document-preset-registry';

/** 자료 작성 source/session 타입 */
export * from './document-writing-source-types';

/** 자료 작성 source adapter + writer registry */
export * from './document-writing-source-registry';

/** 섹션별 작성 context builder */
export * from './document-section-writing-context';

/** provider-agnostic document writer engine contract */
export * from './document-writer-engine';

/** document writer provider registry + settings resolution */
export * from './document-writer-engine-registry';

/** OpenRouter/Ollama document writer engines */
export * from './document-llm-writer-engine';

/** 문서 품질 점검 report/finding 타입 + sidecar 저장 */
export * from './document-quality-types';
export * from './document-quality-storage';
export * from './document-quality-suggestion-apply';
export * from './document-llm-review-sanitizer';

/** 문서 조립 엔진 (블루프린트 → 완성 문서) */
export * from './document-assembler';

/** 근거(evidence) 레코드 팩토리 */
export * from './evidence-factory';
export * from './submission-readiness-terminology';

// ── 논문 패키지 ─────────────────────────────────────────────
/** 논문 패키지 타입 (아이템, 참조, 저널 프리셋) */
export * from './paper-package-types';

/** 논문 패키지 localStorage CRUD */
export * from './paper-package-storage';

/** 논문 패키지 조립 엔진 */
export * from './paper-package-assembler';

// ── 보고서 ──────────────────────────────────────────────────
/** 보고서 타입 (섹션, 테이블, 렌더링 콘텐츠) */
export * from './report-types';

/** APA 형식 분석/BLAST 보고서 콘텐츠 생성 */
export * from './report-apa-format';

/** 보고서 빌드 + 내보내기 (Markdown, HTML, 클립보드) */
export * from './report-export';

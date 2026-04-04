// ── 하위 모듈 ───────────────────────────────────────────────
/** 통계 실행기 (BaseExecutor, 8개 전문 실행기) */
export * from './executors';

/** 논문 초안 생성 (드래프트, 테이블, 템플릿) */
export * from './paper-draft';

/** AI 서비스 (프롬프트, 해석 파싱, 채팅 압축) */
export * from './ai';

/** 내보내기 (DOCX, HWPX, Excel, HTML, 코드) */
export * from './export';

/** Pyodide 런타임 (Worker 관리, 통계 계산) */
export * from './pyodide';

/** 통계 방법 추천기 (의사결정 트리, LLM, Smart) */
export * from './recommenders';

/** IndexedDB 영속 저장소 */
export * from './storage';

// ── 핵심 서비스 ─────────────────────────────────────────────
/** 의도 라우터 — 자연어 → 통계 방법 매핑 */
export * from './intent-router';

/** 통계 상담 서비스 (방법 추천 + 키워드 매칭) */
export * from './consultant-service';

/** 허브 AI 채팅 서비스 */
export * from './hub-chat-service';

/** 결과 해석 서비스 (AI 스트리밍 해석) */
export * from './result-interpreter';

/** localStorage 기반 저장 서비스 */
export * from './storage-service';

// ── 데이터 처리 ─────────────────────────────────────────────
/** 데이터 유효성 검증 (행/열 제한, 결측치 검사) */
export * from './data-validation-service';

/** 변수 타입 자동 탐지 (연속/범주/순서) */
export * from './variable-type-detector';

/** 탐지된 변수 추출 서비스 */
export * from './variable-detection-service';

/** 새 분석 시작 (데이터 초기화) */
export * from './data-management';

/** 정규성 사전 검정 보강 */
export * from './normality-enrichment-service';

/** 선제적 가정 검정 서비스 */
export * from './preemptive-assumption-service';

/** 가정 검정 캐시 */
export * from './assumption-cache';

/** 가정 검정 실행 서비스 */
export * from './assumption-testing-service';

// ── 파일 처리 ───────────────────────────────────────────────
/** Excel 파일 파서 (SheetInfo, 멀티시트) */
export * from './excel-processor';

/** 대용량 파일 프로세서 (청크 분할 처리) */
export * from './large-file-processor';

/** Worker 매니저 (Web Worker 풀 관리) */
export * from './worker-manager';

/** Matplotlib 그래프 내보내기 서비스 */
export * from './matplotlib-export.service';

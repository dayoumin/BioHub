/** 의사결정 트리 기반 통계 방법 추천 */
export * from './decision-tree-recommender';

/** 키워드 매칭 기반 통계 방법 추천 */
export * from './keyword-based-recommender';

/** Smart 추천기 (의사결정 트리 + 키워드 복합) */
export * from './smart-recommender';

/** LLM 기반 통계 방법 추천 */
export * from './llm-recommender';

/** OpenRouter API 기반 추천 */
export * from './openrouter-recommender';

/** Ollama 로컬 LLM 기반 추천 (Tauri 데스크탑용) */
export * from './ollama-recommender';

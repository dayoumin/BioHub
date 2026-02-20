/**
 * React Markdown 설정 중앙화
 *
 * RAGAssistant, RAGChatInterface 등에서 동일한 마크다운 렌더링을 위해
 * 플러그인 설정을 한 곳에서 관리
 */

import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { remarkCitations } from '../utils/remark-citations'

export const MARKDOWN_CONFIG = {
  remarkPlugins: [remarkGfm, remarkBreaks, remarkMath, remarkCitations], // ← Perplexity 스타일 인라인 인용
  rehypePlugins: [rehypeKatex],
} as const

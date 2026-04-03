/**
 * BioHub Cloudflare Worker — API 라우터 + Static Assets
 *
 * 각 API 도메인은 handlers/ 디렉토리에서 독립 처리.
 * 이 파일은 URL 매칭과 핸들러 dispatch만 담당.
 */

import type { WorkerEnv } from './lib/worker-utils'
import { handleAiProxy } from './handlers/ai'
import { handleBlastProxy } from './handlers/blast'
import { handleNcbiProxy } from './handlers/ncbi'
import { handleProjectsApi } from './handlers/projects'
import { handleEntitiesApi } from './handlers/entities'
import { handleGeneticsHistoryApi } from './handlers/genetics-history'
import { handleLiteratureApi } from './handlers/literature'

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url)

    // /api/ai/* → OpenRouter 프록시
    if (url.pathname.startsWith('/api/ai/') || url.pathname === '/api/ai') {
      return handleAiProxy(request, env, url)
    }

    // /api/blast/* → NCBI BLAST 프록시
    if (url.pathname.startsWith('/api/blast/')) {
      return handleBlastProxy(request, env, url)
    }

    // /api/ncbi/* → NCBI E-utilities 프록시
    if (url.pathname.startsWith('/api/ncbi/')) {
      return handleNcbiProxy(request, env, url)
    }

    // /api/projects/* → 프로젝트 CRUD
    if (url.pathname.startsWith('/api/projects')) {
      return handleProjectsApi(request, env, url)
    }

    // /api/history/genetics* → genetics history sync
    if (url.pathname.startsWith('/api/history/genetics')) {
      return handleGeneticsHistoryApi(request, env, url)
    }

    // /api/entities/* → 엔티티 연결
    if (url.pathname.startsWith('/api/entities')) {
      return handleEntitiesApi(request, env, url)
    }

    // /api/literature/* → 문헌 통합검색 프록시
    if (url.pathname.startsWith('/api/literature')) {
      return handleLiteratureApi(request, env, url)
    }

    // RSC payload(.txt)에 브라우저가 직접 접근하면 HTML 페이지로 리다이렉트
    if (url.pathname.endsWith('/index.txt') && !request.headers.get('RSC')) {
      const htmlPath = url.pathname.replace(/\/index\.txt$/, '/')
      return Response.redirect(new URL(htmlPath, url.origin).toString(), 302)
    }

    // 그 외 → Static Assets
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<WorkerEnv>

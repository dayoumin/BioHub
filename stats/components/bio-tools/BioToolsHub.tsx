'use client'

import { memo, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Clock, ChevronDown, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  categoryCardBase,
  staggerContainer,
  staggerItem,
} from '@/components/common/card-styles'
import {
  BIO_TOOL_CATEGORIES,
  getBioToolsByCategory,
  getBioToolById,
  type BioToolCategory,
} from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import { BioToolCard } from './BioToolCard'
import { BIO_ICON_BG, BIO_ICON_COLOR } from './bio-styles'

interface BioToolsHubProps {
  onSelectTool?: (toolId: string) => void
}

export const BioToolsHub = memo(function BioToolsHub({ onSelectTool }: BioToolsHubProps): React.ReactElement {
  const pinnedIds = usePinnedToolsStore((s) => s.pinnedIds)
  const pinnedTools = useMemo(
    () => pinnedIds
      .map((id) => getBioToolById(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined),
    [pinnedIds],
  )

  // 최근 사용 도구 (히스토리에서 고유 toolId 추출, 핀 제외, 최대 3개)
  const recentTools = useMemo(() => {
    const history = loadBioToolHistory()
    const seen = new Set<string>()
    const result: NonNullable<ReturnType<typeof getBioToolById>>[] = []
    for (const entry of history) {
      if (!seen.has(entry.toolId) && !pinnedIds.includes(entry.toolId)) {
        seen.add(entry.toolId)
        const tool = getBioToolById(entry.toolId)
        if (tool) result.push(tool)
        if (result.length >= 3) break
      }
    }
    return result
  }, [pinnedIds])

  const hasPinned = pinnedTools.length > 0
  const hasRecent = recentTools.length > 0

  // 카테고리 접기/펼치기 (한 번에 하나만)
  const [expandedCategory, setExpandedCategory] = useState<BioToolCategory | null>(null)
  const expandedTools = useMemo(
    () => expandedCategory ? getBioToolsByCategory(expandedCategory) : [],
    [expandedCategory],
  )

  return (
    <div className="space-y-8">
      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bio-Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          생물학 전문 분석 도구 — 자주 쓰는 도구를 고정하여 빠르게 접근
        </p>
      </div>

      {/* 내 도구 (핀) */}
      {hasPinned && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <h2 className="text-sm font-semibold text-muted-foreground">내 도구</h2>
          </div>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {pinnedTools.map((tool) => (
              <motion.div key={tool.id} variants={staggerItem}>
                <BioToolCard tool={tool} onSelect={onSelectTool} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* 최근 사용 */}
      {hasRecent && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold text-muted-foreground">최근 사용</h2>
          </div>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {recentTools.map((tool) => (
              <motion.div key={tool.id} variants={staggerItem}>
                <BioToolCard tool={tool} onSelect={onSelectTool} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* 빈 상태 온보딩 (핀도 최근도 없을 때) */}
      {!hasPinned && !hasRecent && (
        <div className="rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center">
          <Leaf className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            자주 쓰는 도구를{' '}
            <Star className="inline w-3.5 h-3.5 text-yellow-400 fill-yellow-400 -mt-0.5" />{' '}
            고정하면 여기에서 바로 실행할 수 있습니다
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            아래에서 분야를 선택하여 도구를 찾아보세요
          </p>
        </div>
      )}

      {/* 도구 찾아보기 — 카테고리 선택 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          {hasPinned || hasRecent ? '도구 더 찾아보기' : '분야를 선택하세요'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BIO_TOOL_CATEGORIES.map((cat) => {
            const tools = getBioToolsByCategory(cat.id)
            const isExpanded = expandedCategory === cat.id
            const FirstIcon = tools[0]?.icon
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setExpandedCategory(prev => prev === cat.id ? null : cat.id)}
                className={cn(
                  categoryCardBase,
                  isExpanded && 'border-primary/40 bg-primary/5 shadow-sm',
                )}
                aria-expanded={expandedCategory === cat.id}
              >
                <div className="p-2 rounded-lg" style={BIO_ICON_BG}>
                  {FirstIcon && <FirstIcon className="w-4 h-4" style={BIO_ICON_COLOR} />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block">{cat.label}</span>
                  <span className="text-xs text-muted-foreground">{tools.length}개 도구</span>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground/40 transition-transform shrink-0',
                  isExpanded && 'rotate-180',
                )} />
              </button>
            )
          })}
        </div>

        {/* 선택된 카테고리 도구 카드 */}
        <AnimatePresence mode="wait">
          {expandedCategory && expandedTools.length > 0 && (
            <motion.div
              key={expandedCategory}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {expandedTools.map((tool) => (
                  <motion.div key={tool.id} variants={staggerItem}>
                    <BioToolCard tool={tool} onSelect={onSelectTool} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
})

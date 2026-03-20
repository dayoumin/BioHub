'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/components/common/card-styles'
import {
  BIO_TOOL_CATEGORIES,
  getBioToolsByCategory,
  getBioToolById,
} from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { BioToolCard } from './BioToolCard'

export function BioToolsHub(): React.ReactElement {
  const pinnedIds = usePinnedToolsStore((s) => s.pinnedIds)
  const pinnedTools = useMemo(
    () => pinnedIds
      .map((id) => getBioToolById(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined),
    [pinnedIds],
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bio-Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          생물학 전문 분석 도구 — 도구를 선택하여 바로 실행
        </p>
      </div>

      {/* 내 도구 (핀) */}
      {pinnedTools.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">내 도구</h2>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {pinnedTools.map((tool) => (
              <motion.div key={tool.id} variants={staggerItem}>
                <BioToolCard tool={tool} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* 카테고리별 도구 */}
      {BIO_TOOL_CATEGORIES.map((cat) => {
        const tools = getBioToolsByCategory(cat.id)
        if (tools.length === 0) return null

        return (
          <section key={cat.id}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">{cat.label}</h2>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {tools.map((tool) => (
                <motion.div key={tool.id} variants={staggerItem}>
                  <BioToolCard tool={tool} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )
      })}
    </div>
  )
}

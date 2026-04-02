/**
 * Papers Plate 에디터 플러그인 설정
 *
 * 논문 편집에 필요한 최소 플러그인만 포함.
 * 설계서: stats/docs/papers/PLAN-PLATE-EDITOR.md §2.5
 */

import { BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin } from '@platejs/basic-nodes/react'
import { HeadingPlugin } from '@platejs/basic-nodes/react'
import { BlockquotePlugin } from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import { IndentPlugin } from '@platejs/indent/react'
import { TablePlugin } from '@platejs/table/react'
import { EquationPlugin, InlineEquationPlugin } from '@platejs/math/react'
import { MarkdownPlugin } from '@platejs/markdown'

/** Papers 에디터 플러그인 배열 */
export const paperPlugins = [
  // 기본 마크 (인라인 서식)
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,

  // 블록 요소
  HeadingPlugin,
  BlockquotePlugin,

  // 리스트
  IndentPlugin,
  ListPlugin,

  // 표
  TablePlugin,

  // 수식
  EquationPlugin,
  InlineEquationPlugin,

  // 마크다운 직렬화/역직렬화
  MarkdownPlugin,
]

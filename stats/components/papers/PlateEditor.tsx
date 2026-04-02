'use client'

/**
 * Papers Plate WYSIWYG 에디터 (controlled)
 *
 * editor 인스턴스는 부모(DocumentEditor)가 usePlateEditor()로 소유.
 * 이 컴포넌트는 Plate 래핑 + 툴바 + 렌더링만 담당.
 */

import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Table, Sigma,
} from 'lucide-react'
import type { PlateEditor as PlateEditorType } from 'platejs/react'
import { Plate } from 'platejs/react'
import { BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin } from '@platejs/basic-nodes/react'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { FixedToolbar } from '@/components/ui/fixed-toolbar'
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button'
import { ToolbarButton, ToolbarSeparator } from '@/components/ui/toolbar'

interface PlateEditorProps {
  editor: PlateEditorType
  onChange?: () => void
}

export default function PlateEditor({ editor, onChange }: PlateEditorProps): React.ReactElement {
  return (
    <Plate editor={editor} onChange={onChange}>
      <FixedToolbar className="rounded-t-lg">
        {/* 인라인 마크 */}
        <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="굵게 (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={ItalicPlugin.key} tooltip="기울임 (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={UnderlinePlugin.key} tooltip="밑줄 (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={StrikethroughPlugin.key} tooltip="취소선">
          <Strikethrough className="w-4 h-4" />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={CodePlugin.key} tooltip="코드">
          <Code className="w-4 h-4" />
        </MarkToolbarButton>

        <ToolbarSeparator />

        {/* 블록 타입 — Plate의 턴키 방식은 별도 플러그인 UI이므로 우선 아이콘만 표시 */}
        <ToolbarButton
          tooltip="제목 1"
          onClick={() => editor.tf.toggleBlock({ type: 'h1' })}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="제목 2"
          onClick={() => editor.tf.toggleBlock({ type: 'h2' })}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="제목 3"
          onClick={() => editor.tf.toggleBlock({ type: 'h3' })}
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          tooltip="글머리 기호"
          onClick={() => editor.tf.toggleBlock({ type: 'ul' })}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="번호 매기기"
          onClick={() => editor.tf.toggleBlock({ type: 'ol' })}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="인용"
          onClick={() => editor.tf.toggleBlock({ type: 'blockquote' })}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          tooltip="표 삽입"
          onClick={() => editor.tf.insert.table({})}
        >
          <Table className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="인라인 수식 ($...$)"
          onClick={() => editor.tf.insert.inlineEquation()}
        >
          <Sigma className="w-4 h-4" />
        </ToolbarButton>
      </FixedToolbar>

      <EditorContainer className="min-h-[400px] rounded-b-lg border border-t-0">
        <Editor variant="fullWidth" placeholder="내용을 입력하세요..." />
      </EditorContainer>
    </Plate>
  )
}

'use client'

/**
 * Papers Plate WYSIWYG 에디터 (controlled)
 *
 * editor 인스턴스는 부모(DocumentEditor)가 usePlateEditor()로 소유.
 * 이 컴포넌트는 Plate 래핑 + 렌더링만 담당.
 */

import type { PlateEditor as PlateEditorType } from 'platejs/react'
import { Plate } from 'platejs/react'
import { Editor, EditorContainer } from '@/components/ui/editor'

interface PlateEditorProps {
  editor: PlateEditorType
  onChange?: () => void
}

export default function PlateEditor({ editor, onChange }: PlateEditorProps): React.ReactElement {
  return (
    <Plate editor={editor} onChange={onChange}>
      <EditorContainer className="min-h-[400px] rounded-lg border">
        <Editor variant="fullWidth" placeholder="내용을 입력하세요..." />
      </EditorContainer>
    </Plate>
  )
}

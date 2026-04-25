interface MarkdownApiLike {
  deserialize?: (markdown: string) => unknown
}

interface EditorTransformsLike {
  insertText?: ((text: string) => void) | undefined
  insertNodes?: ((nodes: unknown[] | unknown) => void) | undefined
}

function isInlineChildContainer(node: unknown): node is { children: unknown[] } {
  return typeof node === 'object'
    && node !== null
    && 'children' in node
    && Array.isArray((node as { children?: unknown[] }).children)
}

function getInlineInsertionNodes(deserialized: unknown): unknown[] | null {
  if (!Array.isArray(deserialized) || deserialized.length === 0) {
    return null
  }

  if (deserialized.length === 1 && isInlineChildContainer(deserialized[0])) {
    return deserialized[0].children.length > 0 ? deserialized[0].children : null
  }

  return deserialized
}

export type InlineCitationInsertStrategy =
  | 'insert-text'
  | 'insert-inline-nodes'
  | 'insert-block-nodes'
  | 'insert-text-node'
  | 'noop'

export function insertInlineCitationAtCursor(
  editor: unknown,
  citationMarkdown: string,
): InlineCitationInsertStrategy {
  const tf = (
    typeof editor === 'object'
    && editor !== null
    && 'tf' in editor
    && typeof editor.tf === 'object'
    && editor.tf !== null
  ) ? (editor.tf as EditorTransformsLike) : undefined

  const markdown = (
    typeof editor === 'object'
    && editor !== null
    && 'api' in editor
    && typeof editor.api === 'object'
    && editor.api !== null
    && 'markdown' in editor.api
    && typeof editor.api.markdown === 'object'
    && editor.api.markdown !== null
  ) ? (editor.api.markdown as MarkdownApiLike) : undefined

  if (typeof tf?.insertNodes === 'function') {
    try {
      const deserialized = markdown?.deserialize?.(citationMarkdown)
      const inlineNodes = getInlineInsertionNodes(deserialized)
      if (inlineNodes && inlineNodes.length > 0) {
        tf.insertNodes(inlineNodes)
        return Array.isArray(deserialized) && deserialized.length === 1
          ? 'insert-inline-nodes'
          : 'insert-block-nodes'
      }
    } catch {
      // Fall through to raw text-node insertion.
    }

    if (typeof tf.insertText === 'function') {
      tf.insertText(citationMarkdown)
      return 'insert-text'
    }

    tf.insertNodes([{ text: citationMarkdown }])
    return 'insert-text-node'
  }

  if (typeof tf?.insertText === 'function') {
    tf.insertText(citationMarkdown)
    return 'insert-text'
  }

  return 'noop'
}

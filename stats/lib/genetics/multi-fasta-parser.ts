export interface ParsedSequence {
  label: string
  description: string
  sequence: string
}

/**
 * Parse multi-FASTA text into individual sequences.
 * Handles: headers (>label description), multi-line sequences,
 * headerless raw sequence, whitespace/digit stripping.
 */
export function parseMultiFasta(raw: string): ParsedSequence[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const results: ParsedSequence[] = []
  const lines = trimmed.split(/\r?\n/)

  let currentLabel = ''
  let currentDesc = ''
  let currentSeq = ''
  let hasHeader = false

  for (const line of lines) {
    if (line.startsWith('>')) {
      // Flush previous sequence
      if (hasHeader && currentSeq) {
        results.push({ label: currentLabel, description: currentDesc, sequence: currentSeq })
      }
      hasHeader = true
      const headerContent = line.slice(1).trim()
      const spaceIdx = headerContent.indexOf(' ')
      if (spaceIdx === -1) {
        currentLabel = headerContent
        currentDesc = ''
      } else {
        currentLabel = headerContent.slice(0, spaceIdx)
        currentDesc = headerContent.slice(spaceIdx + 1).trim()
      }
      currentSeq = ''
    } else {
      currentSeq += line.replace(/[\s\d]/g, '').toUpperCase()
    }
  }

  // Flush last sequence
  if (hasHeader && currentSeq) {
    results.push({ label: currentLabel, description: currentDesc, sequence: currentSeq })
  } else if (!hasHeader && currentSeq) {
    // Raw sequence without header
    results.push({ label: 'Seq 1', description: '', sequence: currentSeq })
  }

  return results
}

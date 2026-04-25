export function buildPapersCitationAttachUrl(
  documentId: string,
  sectionId: string,
  attachCitationKey: string,
): string {
  const params = new URLSearchParams({
    doc: documentId,
    section: sectionId,
    attachCitation: attachCitationKey,
  })
  return `/papers?${params.toString()}`
}

export function handoffCitationToPapers(
  historyLike: Pick<History, 'replaceState'>,
  dispatchEventLike: Pick<Window, 'dispatchEvent'>,
  documentId: string,
  sectionId: string,
  attachCitationKey: string,
): void {
  historyLike.replaceState({}, '', buildPapersCitationAttachUrl(documentId, sectionId, attachCitationKey))
  dispatchEventLike.dispatchEvent(new PopStateEvent('popstate'))
}

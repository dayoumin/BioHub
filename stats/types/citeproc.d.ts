declare module 'citeproc' {
  interface CiteprocEngine {
    updateItems(ids: string[]): void
    makeBibliography(): [unknown, string[]]
    appendCitationCluster(citation: {
      citationItems: Array<{ id: string }>
      properties: Record<string, unknown>
    }): Array<[number, string, string]>
  }

  interface CiteprocModule {
    Engine: new (
      sys: {
        retrieveLocale: (locale: string) => string
        retrieveItem: (id: string) => unknown
      },
      style: string,
      locale: string,
    ) => CiteprocEngine
  }

  const Citeproc: CiteprocModule
  export default Citeproc
}

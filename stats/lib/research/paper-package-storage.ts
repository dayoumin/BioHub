/**
 * PaperPackage localStorage 저장소
 * 패턴: lib/graph-studio/project-storage.ts 와 동일
 */

import type { PaperPackage } from './paper-package-types'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

const STORAGE_KEY = 'paper_packages'
const { readJson, writeJson } = createLocalStorageIO('[paper-package-storage]')

export function listPackages(projectId?: string): PaperPackage[] {
  const all = readJson<PaperPackage[]>(STORAGE_KEY, [])
  if (!projectId) return all
  return all.filter(p => p.projectId === projectId)
}

export function loadPackage(packageId: string): PaperPackage | null {
  return listPackages().find(p => p.id === packageId) ?? null
}

export function savePackage(pkg: PaperPackage): void {
  const list = listPackages()
  const idx = list.findIndex(p => p.id === pkg.id)
  if (idx >= 0) {
    list[idx] = pkg
  } else {
    list.push(pkg)
  }
  writeJson(STORAGE_KEY, list)
}

export function deletePackage(packageId: string): void {
  const list = listPackages().filter(p => p.id !== packageId)
  writeJson(STORAGE_KEY, list)
}

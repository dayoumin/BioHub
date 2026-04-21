/**
 * PaperPackage localStorage 저장소
 * 패턴: lib/graph-studio/project-storage.ts 와 동일
 */

import type { PaperPackage } from './paper-package-types'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events'

import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const STORAGE_KEY = STORAGE_KEYS.research.paperPackages
const { readJson, writeJson } = createLocalStorageIO('[paper-package-storage]')
export const PAPER_PACKAGES_CHANGED_EVENT = 'paper-packages-changed'
const PAPER_PACKAGES_CHANGED_CHANNEL = 'paper-packages'

export interface PaperPackagesChangedDetail {
  packageIds: string[]
  projectIds: string[]
}

export interface SavePackageOptions {
  expectedUpdatedAt?: string
}

export class PaperPackageConflictError extends Error {
  latestPackage: PaperPackage

  constructor(latestPackage: PaperPackage) {
    super('패키지가 다른 탭에서 먼저 변경되었습니다.')
    this.name = 'PaperPackageConflictError'
    this.latestPackage = latestPackage
  }
}

function notifyPaperPackagesChanged(detail: PaperPackagesChangedDetail): void {
  emitCrossTabCustomEvent<PaperPackagesChangedDetail>(
    PAPER_PACKAGES_CHANGED_CHANNEL,
    PAPER_PACKAGES_CHANGED_EVENT,
    {
      packageIds: [...new Set(detail.packageIds)],
      projectIds: [...new Set(detail.projectIds)],
    },
  )
}

registerCrossTabCustomEventBridge<PaperPackagesChangedDetail>(
  PAPER_PACKAGES_CHANGED_CHANNEL,
  PAPER_PACKAGES_CHANGED_EVENT,
)

export function listPackages(projectId?: string): PaperPackage[] {
  const all = readJson<PaperPackage[]>(STORAGE_KEY, [])
  if (!projectId) return all
  return all.filter(p => p.projectId === projectId)
}

export function loadPackage(packageId: string): PaperPackage | null {
  return listPackages().find(p => p.id === packageId) ?? null
}

export function savePackage(pkg: PaperPackage, options?: SavePackageOptions): PaperPackage {
  const list = listPackages()
  const idx = list.findIndex(p => p.id === pkg.id)
  const existing = idx >= 0 ? list[idx] : null

  if (
    existing &&
    options?.expectedUpdatedAt &&
    existing.updatedAt !== options.expectedUpdatedAt
  ) {
    throw new PaperPackageConflictError(existing)
  }

  if (idx >= 0) {
    list[idx] = pkg
  } else {
    list.push(pkg)
  }
  writeJson(STORAGE_KEY, list)
  notifyPaperPackagesChanged({ packageIds: [pkg.id], projectIds: [pkg.projectId] })
  return pkg
}

export function deletePackage(packageId: string): void {
  const deleted = loadPackage(packageId)
  const list = listPackages().filter(p => p.id !== packageId)
  writeJson(STORAGE_KEY, list)
  if (deleted) {
    notifyPaperPackagesChanged({ packageIds: [packageId], projectIds: [deleted.projectId] })
  }
}

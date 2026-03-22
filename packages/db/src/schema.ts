/**
 * BioHub D1 DB 스키마 (Drizzle ORM)
 *
 * PLAN-PROJECT-SYSTEM.md 섹션 3 기반.
 * 모든 앱(stats, genetics, graph-studio)이 공유.
 */

import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

// ─── 3-1. 사용자 ───

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                    // 'user_' prefix
  email: text('email').unique(),                  // NULL 허용 (MVP: UUID, 이후 OAuth)
  name: text('name'),
  authProvider: text('auth_provider'),            // NULL | 'kakao' | 'naver' | 'google'
  createdAt: integer('created_at').notNull(),     // unix ms
  updatedAt: integer('updated_at').notNull(),
})

// ─── 3-2. 프로젝트 ───

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),                    // 'proj_' prefix
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),   // 'active' | 'archived'
  primaryDomain: text('primary_domain'),
  tags: text('tags'),                             // JSON array
  paperConfig: text('paper_config'),              // JSON
  presentation: text('presentation'),             // JSON (emoji, color)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_projects_user').on(table.userId),
  index('idx_projects_status').on(table.status),
])

// ─── 3-3. 프로젝트 엔티티 참조 ───

export const projectEntityRefs = sqliteTable('project_entity_refs', {
  id: text('id').primaryKey(),                    // 'pref_' prefix
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  entityKind: text('entity_kind').notNull(),
  entityId: text('entity_id').notNull(),
  label: text('label'),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at'),
}, (table) => [
  uniqueIndex('idx_pref_unique').on(table.projectId, table.entityKind, table.entityId),
  index('idx_pref_project').on(table.projectId),
])

// ─── 3-4. 통계 분석 결과 ───

export const analysisResults = sqliteTable('analysis_results', {
  id: text('id').primaryKey(),                    // 'ar_' prefix
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  methodId: text('method_id').notNull(),
  methodName: text('method_name'),
  resultJson: text('result_json').notNull(),
  summary: text('summary'),
  aiInterpretation: text('ai_interpretation'),
  apaFormat: text('apa_format'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_ar_user').on(table.userId),
  index('idx_ar_project').on(table.projectId),
])

// ─── 3-5. BLAST 결과 (유전 분석) ───

export const blastResults = sqliteTable('blast_results', {
  id: text('id').primaryKey(),                    // 'br_' prefix
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  sequenceHash: text('sequence_hash').notNull(),  // md5(sequence)
  sequence: text('sequence'),                     // 원본 서열
  marker: text('marker').notNull(),               // 'COI' | 'CytB' | '16S' | ...
  sequenceLength: integer('sequence_length'),
  gcContent: real('gc_content'),
  ambiguousCount: integer('ambiguous_count'),
  apiSource: text('api_source').notNull(),         // 'ncbi' | 'ebi'
  status: text('status').notNull(),                // 'high' | 'ambiguous' | 'low' | 'failed' | 'no_hit'
  topHits: text('top_hits').notNull(),             // JSON array
  decisionReason: text('decision_reason'),
  recommendedMarkers: text('recommended_markers'), // JSON array
  taxonAlert: text('taxon_alert'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_br_user').on(table.userId),
  index('idx_br_project').on(table.projectId),
  index('idx_br_cache').on(table.sequenceHash, table.marker),
])

// ─── 3-6. 그래프/차트 ───

export const graphProjects = sqliteTable('graph_projects', {
  id: text('id').primaryKey(),                    // 'gp_' prefix
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  analysisId: text('analysis_id'),                // ar_ 또는 br_
  name: text('name').notNull(),
  chartSpec: text('chart_spec').notNull(),         // JSON
  editHistory: text('edit_history'),               // JSON array
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_gp_user').on(table.userId),
  index('idx_gp_project').on(table.projectId),
])

// ─── 3-7. BLAST 캐시 (전역) ───

export const blastCache = sqliteTable('blast_cache', {
  sequenceHash: text('sequence_hash').notNull(),
  marker: text('marker').notNull(),
  apiSource: text('api_source').notNull(),
  resultJson: text('result_json').notNull(),
  cachedAt: integer('cached_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, (table) => [
  uniqueIndex('idx_bc_pk').on(table.sequenceHash, table.marker, table.apiSource),
  index('idx_bc_expires').on(table.expiresAt),
])

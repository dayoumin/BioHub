-- BioHub D1 초기 스키마
-- packages/db/src/schema.ts 기반

-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  auth_provider TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 프로젝트
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  primary_domain TEXT,
  tags TEXT,
  paper_config TEXT,
  presentation TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 프로젝트 엔티티 참조
CREATE TABLE IF NOT EXISTS project_entity_refs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_unique ON project_entity_refs(project_id, entity_kind, entity_id);
CREATE INDEX IF NOT EXISTS idx_pref_project ON project_entity_refs(project_id);

-- 통계 분석 결과
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  method_id TEXT NOT NULL,
  method_name TEXT,
  result_json TEXT NOT NULL,
  summary TEXT,
  ai_interpretation TEXT,
  apa_format TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_user ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_project ON analysis_results(project_id);

-- BLAST 결과 (유전 분석)
CREATE TABLE IF NOT EXISTS blast_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  sequence_hash TEXT NOT NULL,
  sequence TEXT,
  marker TEXT NOT NULL,
  sequence_length INTEGER,
  gc_content REAL,
  ambiguous_count INTEGER,
  api_source TEXT NOT NULL,
  status TEXT NOT NULL,
  top_hits TEXT NOT NULL,
  decision_reason TEXT,
  recommended_markers TEXT,
  taxon_alert TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_br_user ON blast_results(user_id);
CREATE INDEX IF NOT EXISTS idx_br_project ON blast_results(project_id);
CREATE INDEX IF NOT EXISTS idx_br_cache ON blast_results(sequence_hash, marker);

-- 그래프/차트
CREATE TABLE IF NOT EXISTS graph_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  analysis_id TEXT,
  name TEXT NOT NULL,
  chart_spec TEXT NOT NULL,
  edit_history TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_user ON graph_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_gp_project ON graph_projects(project_id);

-- BLAST 캐시 (전역)
CREATE TABLE IF NOT EXISTS blast_cache (
  sequence_hash TEXT NOT NULL,
  marker TEXT NOT NULL,
  api_source TEXT NOT NULL,
  result_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bc_pk ON blast_cache(sequence_hash, marker, api_source);
CREATE INDEX IF NOT EXISTS idx_bc_expires ON blast_cache(expires_at);

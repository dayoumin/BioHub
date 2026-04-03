-- Genetics history sync table
-- localStorage genetics history를 D1에 동기화하기 위한 경량 저장소

CREATE TABLE IF NOT EXISTS genetics_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_type TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gh_user_created ON genetics_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gh_user_type_created ON genetics_history(user_id, entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gh_project ON genetics_history(project_id);

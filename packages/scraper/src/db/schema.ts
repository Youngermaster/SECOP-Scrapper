export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT,
  department_code TEXT,
  department TEXT,
  city TEXT,
  entity_name TEXT NOT NULL,
  entity_nit TEXT,
  modality TEXT NOT NULL,
  status TEXT NOT NULL,
  value REAL,
  published_at TEXT,
  last_published_at TEXT,
  closes_at TEXT,
  awarded INTEGER NOT NULL DEFAULT 0,
  url_status TEXT NOT NULL,
  unspsc_segment TEXT,
  unspsc_family TEXT,
  data TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_processes_closes_at ON processes (closes_at);
CREATE INDEX IF NOT EXISTS idx_processes_last_published ON processes (last_published_at);
CREATE INDEX IF NOT EXISTS idx_processes_department ON processes (department_code);
CREATE INDEX IF NOT EXISTS idx_processes_modality ON processes (modality);
CREATE INDEX IF NOT EXISTS idx_processes_portfolio ON processes (portfolio_id);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT,
  entity_name TEXT NOT NULL,
  entity_nit TEXT,
  department_code TEXT,
  signed_at TEXT,
  unspsc_segment TEXT,
  unspsc_family TEXT,
  modality TEXT NOT NULL,
  value REAL,
  data TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contracts_signed_at ON contracts (signed_at);
CREATE INDEX IF NOT EXISTS idx_contracts_entity ON contracts (entity_nit);
CREATE INDEX IF NOT EXISTS idx_contracts_portfolio ON contracts (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_contracts_family ON contracts (unspsc_family);

CREATE TABLE IF NOT EXISTS departments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL,
  lon REAL
);

CREATE TABLE IF NOT EXISTS municipalities (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  department_code TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_municipalities_dept_key ON municipalities (department_code, key);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  dataset TEXT NOT NULL,
  args TEXT NOT NULL,
  fetched INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  dropped INTEGER NOT NULL DEFAULT 0,
  repaired INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
`;

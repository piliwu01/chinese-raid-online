CREATE TABLE IF NOT EXISTS trades (id TEXT PRIMARY KEY, class_name TEXT NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, give_id INTEGER NOT NULL, want_id INTEGER NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, decided_at INTEGER);
CREATE INDEX IF NOT EXISTS trades_from ON trades(from_id,status);
CREATE INDEX IF NOT EXISTS trades_to ON trades(to_id,status);
CREATE INDEX IF NOT EXISTS trades_class ON trades(class_name,created_at);

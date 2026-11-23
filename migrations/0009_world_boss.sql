CREATE TABLE IF NOT EXISTS world_bosses (week TEXT NOT NULL, class_name TEXT NOT NULL, max_hp INTEGER NOT NULL, boss TEXT NOT NULL, weak TEXT, created_at INTEGER NOT NULL, PRIMARY KEY(week,class_name));
CREATE TABLE IF NOT EXISTS world_hits (week TEXT NOT NULL, class_name TEXT NOT NULL, user_id TEXT NOT NULL, damage INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, answered INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, PRIMARY KEY(week,user_id));
CREATE INDEX IF NOT EXISTS world_hits_class ON world_hits(week,class_name);
CREATE TABLE IF NOT EXISTS world_settled (week TEXT NOT NULL, class_name TEXT NOT NULL, won INTEGER NOT NULL, total INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(week,class_name));
CREATE TABLE IF NOT EXISTS world_awards (week TEXT NOT NULL, class_name TEXT NOT NULL, user_id TEXT NOT NULL, won INTEGER NOT NULL, top INTEGER NOT NULL, damage INTEGER NOT NULL, correct INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, PRIMARY KEY(week,user_id));
CREATE INDEX IF NOT EXISTS world_awards_user ON world_awards(user_id,claimed);

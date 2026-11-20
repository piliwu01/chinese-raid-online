CREATE TABLE IF NOT EXISTS hero_awards (week TEXT NOT NULL, class_name TEXT NOT NULL, board TEXT NOT NULL, rank INTEGER NOT NULL, user_id TEXT NOT NULL, value REAL NOT NULL, jade INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, PRIMARY KEY(week,class_name,board,user_id));
CREATE INDEX IF NOT EXISTS hero_awards_user ON hero_awards(user_id,claimed);
CREATE TABLE IF NOT EXISTS hero_settled (week TEXT NOT NULL, class_name TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(week,class_name));

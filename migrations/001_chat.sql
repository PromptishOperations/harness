-- Persists chat turns so conversation history survives server restarts and page refreshes.
CREATE TABLE IF NOT EXISTS chat_turns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT    NOT NULL,
  role            TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
  content         TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_turns_conv ON chat_turns(conversation_id, id);

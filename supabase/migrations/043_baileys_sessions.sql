-- ============================================================
-- 043_baileys_sessions.sql — Baileys QR Code WhatsApp Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS baileys_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL DEFAULT 'default',
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connecting', 'qr_ready', 'connected', 'disconnected')),
  creds JSONB,
  keys JSONB,
  phone_number TEXT,
  user_name TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baileys_sessions_user ON baileys_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_baileys_sessions_account ON baileys_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_baileys_sessions_status ON baileys_sessions(status);

ALTER TABLE baileys_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage baileys sessions" ON baileys_sessions;
CREATE POLICY "Users can manage baileys sessions" ON baileys_sessions FOR ALL
  USING (true) WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON baileys_sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON baileys_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

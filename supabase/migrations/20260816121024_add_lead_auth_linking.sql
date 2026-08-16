-- Up migration: link leads to an authenticated Supabase Auth identity (ADR-0008)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS session_id TEXT UNIQUE;

-- leads already has RLS enabled (20260702_create_chatbot_leads_messages.sql).
-- Scope reads to the row's owner; the service role (used only by n8n) bypasses RLS.
CREATE POLICY leads_owner_select ON leads FOR SELECT USING (auth.uid() = user_id);

-- Down migration:
-- DROP POLICY IF EXISTS leads_owner_select ON leads;
-- ALTER TABLE leads DROP COLUMN IF EXISTS session_id;
-- ALTER TABLE leads DROP COLUMN IF EXISTS user_id;

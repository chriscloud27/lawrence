-- Add updated_at to leads and set_updated_at trigger for automatic timestamps
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create trigger function to auto-update updated_at on any row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on leads table (BEFORE UPDATE, so the timestamp is fresh during the update)
DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add RLS SELECT policy to messages table so authenticated users can read their own messages.
-- RLS is already enabled on messages from 20260702_create_chatbot_leads_messages.sql
-- (note: we only add the SELECT policy here since messages are only ever written by n8n via service-role key)
CREATE POLICY messages_owner_select ON messages
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE user_id = auth.uid()
    )
  );

-- Down migration:
-- DROP POLICY IF EXISTS messages_owner_select ON messages;
-- DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- ALTER TABLE leads DROP COLUMN IF EXISTS updated_at;

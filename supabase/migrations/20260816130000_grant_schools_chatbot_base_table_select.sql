-- ============================================================
-- Fix: schools_chatbot view (20260702120000_create_schools_chatbot_view.sql)
-- has security_invoker = on, so anon/authenticated need SELECT on the
-- underlying base tables in addition to the view grant and RLS policies
-- already added there. Without this, PostgREST returns
-- "permission denied for table schools" even though the RLS policy passes.
-- ============================================================

GRANT SELECT ON schools TO anon, authenticated;
GRANT SELECT ON school_fees TO anon, authenticated;

-- ============================================================
-- Down migration:
-- REVOKE SELECT ON school_fees FROM anon, authenticated;
-- REVOKE SELECT ON schools FROM anon, authenticated;
-- ============================================================

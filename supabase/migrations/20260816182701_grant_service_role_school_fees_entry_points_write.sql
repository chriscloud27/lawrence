-- ============================================================
-- Fix: service_role has only INSERT/SELECT/REFERENCES on school_fees and
-- school_entry_points (missing DELETE/UPDATE), so any pipeline write that
-- needs to replace fee/entry-point rows for a school (e.g. a re-scrape)
-- fails with "permission denied for table school_fees" even though
-- service_role bypasses RLS. schools already has full privileges for
-- service_role; these two child tables were missing the same grants.
-- ============================================================

GRANT DELETE, UPDATE ON school_fees TO service_role;
GRANT DELETE, UPDATE ON school_entry_points TO service_role;

-- ============================================================
-- Down migration:
-- REVOKE DELETE, UPDATE ON school_entry_points FROM service_role;
-- REVOKE DELETE, UPDATE ON school_fees FROM service_role;
-- ============================================================

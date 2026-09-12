-- Phase 6E application-case tables are reconciled in phase_7c_evidence_registry migration
-- using application_case_* table names to avoid conflicts with Phase 6A cases/submissions.
-- Intentional no-op to preserve migration ordering on fresh databases.

SELECT 1;

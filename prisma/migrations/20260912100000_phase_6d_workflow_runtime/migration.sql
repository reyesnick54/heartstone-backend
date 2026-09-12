-- Phase 6D runtime workflow tables are reconciled in phase_7c_evidence_registry migration
-- using Runtime* table names to avoid conflicts with Phase 6A workflow_definitions.
-- Intentional no-op to preserve migration ordering on fresh databases.

SELECT 1;

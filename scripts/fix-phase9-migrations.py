#!/usr/bin/env python3
"""Make Phase 9 migrations idempotent against Phase 8G reconciliation."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_9E = ROOT / "prisma/migrations/20260913210000_phase_9e_corrective_action_verified_closure/migration.sql"
MIGRATION_9_INSP = ROOT / "prisma/migrations/20260913220000_phase_9_inspection_compliance/migration.sql"

RECONCILIATION_HEADER = """-- Phase 9E reconciliation: supersede interim Phase 8G lifecycle tables on official_instruments.
DROP TABLE IF EXISTS "decision_review_references" CASCADE;
DROP TABLE IF EXISTS "instrument_surrender_records" CASCADE;
DROP TABLE IF EXISTS "instrument_replacement_records" CASCADE;
DROP TABLE IF EXISTS "instrument_reinstatement_records" CASCADE;
DROP TABLE IF EXISTS "instrument_revocation_records" CASCADE;
DROP TABLE IF EXISTS "instrument_suspension_records" CASCADE;
DROP TABLE IF EXISTS "instrument_renewal_records" CASCADE;
DROP TABLE IF EXISTS "instrument_amendment_records" CASCADE;
DROP TABLE IF EXISTS "instrument_lifecycle_decision_links" CASCADE;
DROP TABLE IF EXISTS "instrument_lifecycle_events" CASCADE;

"""

ENUMS_IDEMPOTENT = {
    "InstrumentJurisdictionScope",
    "InstrumentLifecycleEventType",
    "ReviewStayStatus",
    "ReviewInterimEffect",
    "SurrenderType",
    "PriorVersionTreatment",
    "ComplianceMatterStatus",
    "InspectionFindingStatus",
}


def wrap_enum_idempotent(sql: str) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        body = match.group(2)
        if name not in ENUMS_IDEMPOTENT:
            return match.group(0)
        return (
            f'DO $$ BEGIN CREATE TYPE "{name}" AS ENUM {body}; '
            f'EXCEPTION WHEN duplicate_object THEN NULL; END $$;'
        )

    return re.sub(
        r'CREATE TYPE "(\w+)" AS ENUM (\([^;]+\));',
        repl,
        sql,
        flags=re.MULTILINE,
    )


def remove_model_block(sql: str, table_name: str) -> str:
    pattern = re.compile(
        rf"-- CreateTable\s+CREATE TABLE \"{table_name}\" \{{[\s\S]*?\);\s*",
        re.MULTILINE,
    )
    return pattern.sub("", sql)


def remove_indexes_for_table(sql: str, table_name: str) -> str:
    lines = []
    for line in sql.splitlines():
        if f'"{table_name}"' in line and line.strip().startswith("CREATE"):
            if "INDEX" in line or "UNIQUE INDEX" in line:
                continue
        if f'"{table_name}"' in line and "ADD CONSTRAINT" in line:
            continue
        lines.append(line)
    return "\n".join(lines)


def main() -> None:
    sql = MIGRATION_9E.read_text()
    if not sql.startswith("-- Phase 9E reconciliation"):
        sql = RECONCILIATION_HEADER + sql
    sql = wrap_enum_idempotent(sql)
    for table in ("compliance_matters", "inspection_findings"):
        sql = remove_model_block(sql, table)
        sql = remove_indexes_for_table(sql, table)
    MIGRATION_9E.write_text(sql)

    MIGRATION_9_INSP.write_text(
        "-- Phase 9 umbrella migration reconciled: canonical DDL lives in phase 9a-9g migrations.\n"
        "SELECT 1;\n"
    )
    print("Updated Phase 9 migrations")


if __name__ == "__main__":
    main()

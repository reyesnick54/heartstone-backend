#!/usr/bin/env python3
"""Make Phase 10 migration idempotent against Phase 9 migrations already on main."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "prisma/migrations/20260914100000_phase_10_redress_appeals/migration.sql"

# Phase 9A foundation already applied by earlier migrations.
PHASE_9A_ENUMS = {
    "ComplianceMatterStatus",
    "ContinuingObligationSourceType",
    "ContinuingObligationType",
    "ContinuingObligationStatus",
    "ObligationScheduleStatus",
    "ObligationStatusChangeActor",
}

PHASE_9A_TABLES = {
    "compliance_matters",
    "continuing_obligations",
    "obligation_schedules",
    "obligation_status_history",
}

# Prisma drift repairs that are unsafe/no-op when Phase 9 migrations already ran.
SKIP_LINE_PREFIXES = (
    "-- DropForeignKey",
    "-- AlterTable",
    "-- RenameForeignKey",
    "-- RenameIndex",
)


def wrap_enum_idempotent(sql: str) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        body = match.group(2)
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


def remove_enum_block(sql: str, enum_name: str) -> str:
    pattern = re.compile(
        rf'-- CreateEnum\s+CREATE TYPE "{enum_name}" AS ENUM \([^;]+\);\s*',
        re.MULTILINE,
    )
    return pattern.sub("", sql)


def remove_table_block(sql: str, table_name: str) -> str:
    pattern = re.compile(
        rf"-- CreateTable\s+CREATE TABLE \"{table_name}\" \([\s\S]*?\);\s*",
        re.MULTILINE,
    )
    return pattern.sub("", sql)


def filter_lines(sql: str) -> str:
    lines: list[str] = []
    skip_mode = False

    for line in sql.splitlines():
        stripped = line.strip()

        if any(stripped.startswith(prefix) for prefix in SKIP_LINE_PREFIXES):
            skip_mode = True
            continue

        if skip_mode:
            if stripped == "" or stripped.startswith("--"):
                if stripped.startswith("-- Create"):
                    skip_mode = False
                else:
                    continue
            else:
                continue

        if any(f'"{table}"' in line for table in PHASE_9A_TABLES):
            if (
                "CREATE INDEX" in line
                or "CREATE UNIQUE INDEX" in line
                or "ADD CONSTRAINT" in line
                or "ALTER TABLE" in line
            ):
                continue

        lines.append(line)

    return "\n".join(lines)


def drop_foreign_key_blocks(sql: str) -> str:
    return re.sub(
        r"-- DropForeignKey\s+ALTER TABLE[^;]+;\s*",
        "",
        sql,
        flags=re.MULTILINE,
    )


def alter_table_blocks(sql: str) -> str:
    return re.sub(
        r"-- AlterTable\s+ALTER TABLE[^;]+;\s*",
        "",
        sql,
        flags=re.MULTILINE,
    )


def rename_foreign_key_blocks(sql: str) -> str:
    return re.sub(
        r"-- RenameForeignKey\s+ALTER TABLE[^;]+;\s*",
        "",
        sql,
        flags=re.MULTILINE,
    )


def rename_index_blocks(sql: str) -> str:
    return re.sub(
        r"-- RenameIndex\s+ALTER INDEX[^;]+;\s*",
        "",
        sql,
        flags=re.MULTILINE,
    )


def remove_non_redress_index_creations(sql: str) -> str:
    lines: list[str] = []
    for line in sql.splitlines():
        if not line.strip().startswith("CREATE"):
            lines.append(line)
            continue
        if "INDEX" not in line:
            lines.append(line)
            continue
        if (
            "redress_" in line
            or "complaint_" in line
            or "review_" in line
            or "reviewer_" in line
        ):
            lines.append(line)
            continue
        if any(
            token in line
            for token in (
                "administrative_correction",
                "clarification_",
                "automation_",
                "deadline_extension",
                "external_review",
                "interim_relief",
                "reconsideration_",
                "internal_administrative",
            )
        ):
            lines.append(line)
            continue
        # Skip index creations for pre-existing Phase 7/8/9 tables.
        continue
    return "\n".join(lines)


def remove_preexisting_foreign_keys(sql: str) -> str:
    lines: list[str] = []
    for line in sql.splitlines():
        if "ADD CONSTRAINT" not in line:
            lines.append(line)
            continue
        if any(f'"{table}"' in line for table in PHASE_9A_TABLES):
            continue
        if '"government_decisions"' in line or '"official_instruments"' in line:
            continue
        if '"official_instrument_versions"' in line:
            continue
        if '"_PacketItemAcceptances"' in line:
            continue
        lines.append(line)
    return "\n".join(lines)


def main() -> None:
    sql = MIGRATION.read_text()
    if sql.startswith("-- Phase 10:"):
        print("Migration already repaired.")
        return

    for enum_name in PHASE_9A_ENUMS:
        sql = remove_enum_block(sql, enum_name)

    for table_name in PHASE_9A_TABLES:
        sql = remove_table_block(sql, table_name)

    sql = drop_foreign_key_blocks(sql)
    sql = alter_table_blocks(sql)
    sql = rename_foreign_key_blocks(sql)
    sql = rename_index_blocks(sql)
    sql = filter_lines(sql)
    sql = remove_non_redress_index_creations(sql)
    sql = remove_preexisting_foreign_keys(sql)
    sql = wrap_enum_idempotent(sql)

    header = (
        "-- Phase 10: Redress and appeals (idempotent against Phase 9 migrations on main)\n"
    )
    MIGRATION.write_text(header + sql.strip() + "\n")
    print(f"Repaired {MIGRATION}")


if __name__ == "__main__":
    main()

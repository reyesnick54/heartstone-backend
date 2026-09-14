#!/usr/bin/env python3
"""Rebuild prisma/schema.prisma from canonical pre-merge commit sections."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_OUT = ROOT / "prisma" / "schema.prisma"

MODEL_BLOCK = re.compile(r"^model (\w+) \{", re.MULTILINE)


def git_show(rev: str, path: str = "prisma/schema.prisma") -> str:
    return subprocess.check_output(
        ["git", "show", f"{rev}:{path}"], cwd=ROOT, text=True
    )


def extract_section(source: str, start_marker: str, end_marker: str | None = None) -> str:
    start = source.index(start_marker)
    if end_marker is None:
        return source[start:].rstrip() + "\n"
    end = source.index(end_marker, start + len(start_marker))
    return source[start:end].rstrip() + "\n"


def extract_block(source: str, kind: str, name: str) -> str:
    pattern = re.compile(rf"^{kind} {name} \{{", re.MULTILINE)
    match = pattern.search(source)
    if not match:
        raise KeyError(f"{kind} {name} not found")
    depth = 0
    i = match.start()
    while i < len(source):
        ch = source[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[match.start() : i + 1].rstrip() + "\n"
        i += 1
    raise ValueError(f"Unclosed {kind} {name}")


def strip_duplicate_enums(base: str, addition: str) -> str:
    existing = set(re.findall(r"^enum (\w+)", base, re.MULTILINE))
    lines = addition.splitlines()
    output: list[str] = []
    skip = False
    depth = 0
    for line in lines:
        enum_match = re.match(r"^enum (\w+)", line)
        if enum_match and not skip:
            if enum_match.group(1) in existing:
                skip = True
                depth = 0
                continue
        if skip:
            depth += line.count("{") - line.count("}")
            if depth <= 0 and "}" in line:
                skip = False
            continue
        output.append(line)
    return "\n".join(output).strip() + "\n"


def is_inverse_relation_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or stripped.startswith("//") or stripped.startswith("@@"):
        return False
    if " fields:" in line:
        return False
    if re.match(
        r"^\w+\s+(String|Int|Boolean|DateTime|Json|Float|Decimal|Bytes|BigInt)",
        stripped,
    ):
        return False
    if "@" in stripped and not re.search(r"\w+(\[\]|\?)\s+(@relation|\w+)", stripped):
        return False
    return bool(re.match(r"^\w+\s+\w+(\[\]|\?)?", stripped))


def extract_model_names(schema: str) -> set[str]:
    return set(MODEL_BLOCK.findall(schema))


def extract_model_body(schema: str, model_name: str) -> str:
    return extract_block(schema, "model", model_name)


def relation_field_name(line: str) -> str | None:
    match = re.match(r"^  (\w+)\s+", line)
    return match.group(1) if match else None


def relation_type_names(line: str) -> list[str]:
    match = re.match(r"^\s+\w+\s+(\w+)", line)
    return [match.group(1)] if match else []


def defined_types(schema: str) -> set[str]:
    models = set(re.findall(r"^model (\w+)", schema, re.MULTILINE))
    enums = set(re.findall(r"^enum (\w+)", schema, re.MULTILINE))
    return models | enums


def model_insertion_index(body: str) -> int:
    for idx, line in enumerate(body.splitlines()):
        if line.strip().startswith("@@"):
            return body.index(line)
    return body.rfind("\n}")


DENIED_INVERSE_RELATIONS: dict[str, set[str]] = {
    "ComplianceMatter": {"findings", "inspectionRecord"},
    "InspectionFinding": {
        "inspectionRecord",
        "inspectionEvidenceItem",
        "complianceMatter",
    },
    "OfficialInstrument": {
        "lifecycleEvents",
        "amendmentRecords",
        "renewalRecords",
        "suspensionRecords",
        "revocationRecords",
        "reinstatementRecords",
        "replacementRecords",
        "surrenderRecords",
        "challengedInReviews",
    },
    "OfficialInstrumentVersion": {
        "amendmentAsPriorVersion",
        "amendmentAsNewVersion",
        "renewalAsPriorVersion",
        "renewalAsNewVersion",
        "replacementAsPriorVersion",
        "replacementAsNewVersion",
        "createdByDecision",
    },
    "Officeholder": {"lifecycleInstrumentsAsHolder"},
    "InspectionRecord": {"complianceMatters", "inspectionFindings"},
    "InspectionEvidenceItem": {"complianceFindings"},
    "GovernmentDecision": {
        "supersedes",
        "waivedConditions",
        "findings",
        "reasons",
        "notices",
        "assistanceRecords",
        "reviewReferences",
        "lifecycleDecisionLinks",
        "lifecycleEvents",
        "createdVersions",
        "amendmentRecords",
        "renewalRecords",
        "suspensionRecords",
        "revocationRecords",
        "reinstatementRecords",
        "replacementRecords",
        "surrenderRecords",
    },
}


def merge_inverse_relations(target: str, source: str) -> str:
    known_types = defined_types(target)
    for model_name in extract_model_names(source):
        if model_name not in extract_model_names(target):
            continue
        source_body = extract_model_body(source, model_name)
        target_body = extract_model_body(target, model_name)
        existing_fields = {
            relation_field_name(line)
            for line in target_body.splitlines()
            if relation_field_name(line)
        }
        additions: list[str] = []
        for line in source_body.splitlines():
            if not is_inverse_relation_line(line):
                continue
            field = relation_field_name(line)
            if (
                not field
                or field in existing_fields
                or field in DENIED_INVERSE_RELATIONS.get(model_name, set())
            ):
                continue
            referenced = [
                name
                for name in relation_type_names(line)
                if name not in {"String", "Int", "Boolean", "DateTime", "Json"}
            ]
            if referenced and not all(name in known_types for name in referenced):
                continue
            additions.append(line)
            existing_fields.add(field)
        if not additions:
            continue
        insert_at = model_insertion_index(target_body)
        patched_body = (
            target_body[:insert_at]
            + "\n"
            + "\n".join(additions)
            + "\n"
            + target_body[insert_at:]
        )
        target = target.replace(target_body, patched_body, 1)
    return target


def remove_denied_relations(schema: str) -> str:
    for model_name, denied_fields in DENIED_INVERSE_RELATIONS.items():
        if model_name not in extract_model_names(schema):
            continue
        patterns = [rf"^\s+{field}\b" for field in denied_fields]
        schema = remove_model_lines(schema, model_name, patterns)
    return schema


def remove_undefined_relation_lines(schema: str) -> str:
    known_types = defined_types(schema)
    output: list[str] = []
    for line in schema.splitlines():
        if is_inverse_relation_line(line):
            referenced = [
                name
                for name in relation_type_names(line)
                if name not in {"String", "Int", "Boolean", "DateTime", "Json"}
            ]
            if referenced and not all(name in known_types for name in referenced):
                continue
        output.append(line)
    return "\n".join(output).rstrip() + "\n"


def remove_model_lines(schema: str, model_name: str, patterns: list[str]) -> str:
    body = extract_model_body(schema, model_name)
    lines = body.splitlines()
    filtered: list[str] = []
    for line in lines:
        if any(re.search(pattern, line) for pattern in patterns):
            continue
        filtered.append(line)
    patched = "\n".join(filtered) + "\n"
    return schema.replace(body, patched, 1)


def patch_inspection_finding_for_9e(schema: str) -> str:
    body = extract_model_body(schema, "InspectionFinding")
    additions = [
        "  correctiveActionPlans      CorrectiveActionPlan[]",
        "  closures                   ComplianceFindingClosure[]",
        "  reopenings                 ComplianceFindingReopening[]",
        "  reinspectionRequirements   ReinspectionRequirement[]",
    ]
    existing = {relation_field_name(line) for line in body.splitlines()}
    to_add = [line for line in additions if relation_field_name(line) not in existing]
    if not to_add:
        return schema
    insert_at = model_insertion_index(body)
    patched = (
        body[:insert_at]
        + "\n"
        + "\n".join(to_add)
        + "\n"
        + body[insert_at:]
    )
    return schema.replace(body, patched, 1)


def strip_old_lifecycle_coupling(schema: str) -> str:
    government_patterns = [
        r"lifecycleDecisionType",
        r"lifecycleDecisionLinks",
        r"lifecycleEvents",
        r"reviewReferences",
        r"createdVersions",
        r"amendmentRecords",
        r"renewalRecords",
        r"suspensionRecords",
        r"revocationRecords",
        r"reinstatementRecords",
        r"replacementRecords",
        r"surrenderRecords",
        r"@@index\(\[lifecycleDecisionType\]\)",
    ]
    schema = remove_model_lines(schema, "GovernmentDecision", government_patterns)

    official_instrument_patterns = [
        r"lifecycleEvents",
        r"amendmentRecords",
        r"renewalRecords",
        r"suspensionRecords",
        r"revocationRecords",
        r"reinstatementRecords",
        r"replacementRecords",
        r"surrenderRecords",
        r"challengedInReviews",
    ]
    schema = remove_model_lines(schema, "OfficialInstrument", official_instrument_patterns)

    version_patterns = [
        r"createdByDecision",
        r"createdByDecisionId",
        r"amendmentAsPriorVersion",
        r"amendmentAsNewVersion",
        r"renewalAsPriorVersion",
        r"renewalAsNewVersion",
        r"replacementAsPriorVersion",
        r"replacementAsNewVersion",
    ]
    schema = remove_model_lines(schema, "OfficialInstrumentVersion", version_patterns)

    identity_patterns = [r"lifecycleDecisionsMade", r"suspensionRecordsExecuted"]
    schema = remove_model_lines(schema, "Identity", identity_patterns)
    return schema


def main() -> None:
    ff5ea77 = git_show("ff5ea77")
    c8a8210 = git_show("c8a8210")
    af3de19 = git_show("af3de19")
    phase9d = git_show("1769420")
    phase9f = git_show("66b85fb")

    phase_8g_old_start = "// ─── Phase 8G: Official Instrument Lifecycle"
    phase_9a_start = "// ─── Phase 9A: Continuing Obligations and Compliance Foundation"
    prefix = ff5ea77[: ff5ea77.index(phase_8g_old_start)]
    suffix_from_9a = ff5ea77[ff5ea77.index(phase_9a_start) :]

    phase_8g_new = extract_section(
        c8a8210,
        "// ─── Phase 8G: Instrument Lifecycle (renamed to avoid 8E collision)",
        "// ─── Phase 9: Inspection & Compliance",
    )

    phase_9c = extract_section(
        af3de19,
        "// ─── Phase 9C: Inspection Planning, Assignment, and Scheduling",
    )

    phase_9d = extract_section(
        phase9d,
        "// ─── Phase 9D: Inspection Execution, Findings, and Evidence",
        "// ─── Phase 7E: Evidence Packets and Decision-Support Snapshots",
    )

    phase_9e = extract_section(
        c8a8210,
        "// ─── Phase 9: Inspection & Compliance",
    )
    phase_9e = re.sub(
        r"enum ComplianceMatterStatus \{[\s\S]*?\}\n\n",
        "",
        phase_9e,
        count=1,
    )
    phase_9e = re.sub(r"model ComplianceMatter \{[\s\S]*?\n\}\n\n", "", phase_9e, count=1)
    phase_9e = re.sub(
        r"enum InspectionFindingStatus \{[\s\S]*?\}\n\n",
        "",
        phase_9e,
        count=1,
    )
    phase_9e = re.sub(r"model InspectionFinding \{[\s\S]*?\n\}\n\n", "", phase_9e, count=1)

    phase_9f = extract_section(
        phase9f,
        "enum ComplianceAssessmentStatus",
    )

    schema = prefix.rstrip() + "\n\n"
    schema += strip_duplicate_enums(schema, phase_8g_new).rstrip() + "\n\n"
    schema += suffix_from_9a.rstrip() + "\n\n"
    schema += strip_duplicate_enums(schema, phase_9c).rstrip() + "\n\n"
    schema += strip_duplicate_enums(schema, phase_9d).rstrip() + "\n\n"
    schema += strip_duplicate_enums(schema, phase_9e).rstrip() + "\n\n"
    schema += strip_duplicate_enums(schema, phase_9f).rstrip() + "\n"

    schema = strip_old_lifecycle_coupling(schema)
    for patch_source in (c8a8210, af3de19, phase9d, phase9f):
        schema = merge_inverse_relations(schema, patch_source)
    schema = strip_old_lifecycle_coupling(schema)
    schema = patch_inspection_finding_for_9e(schema)
    schema = remove_denied_relations(schema)
    schema = remove_undefined_relation_lines(schema)

    SCHEMA_OUT.write_text(schema)
    model_count = len(re.findall(r"^model ", schema, re.MULTILINE))
    print(
        f"Wrote {SCHEMA_OUT} ({schema.count(chr(10))} lines, {model_count} models)"
    )


if __name__ == "__main__":
    main()

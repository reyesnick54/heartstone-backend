import { FormFieldType } from '@prisma/client';

import {
  SERVICE_PACK_COMPILATION_CHECK_CODES,
  SERVICE_PACK_ISSUE_SEVERITY,
  SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS,
} from './service-pack.constants';
import {
  type ServicePackCompilationIssue,
  type ServicePackFormFieldManifest,
  type ServicePackFormManifest,
} from './service-pack.types';

const VALID_FIELD_TYPES = new Set<string>(Object.values(FormFieldType));

export function validateServicePackFormManifest(
  form: ServicePackFormManifest,
  pathPrefix: string,
): ServicePackCompilationIssue[] {
  const issues: ServicePackCompilationIssue[] = [];
  const fieldKeys = new Set<string>();

  for (const section of form.sections) {
    for (const field of section.fields) {
      const fieldPath = `${pathPrefix}.sections.${section.sectionKey}.fields.${field.fieldKey}`;

      if (fieldKeys.has(field.fieldKey)) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.CODE_UNIQUENESS,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Duplicate form field key "${field.fieldKey}"`,
          path: fieldPath,
          entityRef: field.fieldKey,
        });
      }
      fieldKeys.add(field.fieldKey);

      issues.push(...validateFormField(field, fieldPath, fieldKeys));
    }
  }

  issues.push(...validateFormConditionalReferences(form, pathPrefix));

  return issues;
}

function validateFormField(
  field: ServicePackFormFieldManifest,
  fieldPath: string,
  allFieldKeys: Set<string>,
): ServicePackCompilationIssue[] {
  const issues: ServicePackCompilationIssue[] = [];

  if (!VALID_FIELD_TYPES.has(field.fieldType)) {
    issues.push({
      code: SERVICE_PACK_COMPILATION_CHECK_CODES.FORM_FIELD_VALIDITY,
      severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
      message: `Invalid field type "${field.fieldType}"`,
      path: fieldPath,
      entityRef: field.fieldKey,
    });
  }

  if (
    field.dataClassification &&
    !SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS.includes(
      field.dataClassification as (typeof SERVICE_PACK_SUPPORTED_DATA_CLASSIFICATIONS)[number],
    )
  ) {
    issues.push({
      code: SERVICE_PACK_COMPILATION_CHECK_CODES.UNSUPPORTED_DATA_CLASSIFICATIONS,
      severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
      message: `Unsupported data classification "${field.dataClassification}" on field "${field.fieldKey}"`,
      path: fieldPath,
      entityRef: field.fieldKey,
    });
  }

  for (const rule of field.conditionalRules ?? []) {
    for (const condition of rule.conditions) {
      if (!allFieldKeys.has(condition.fieldKey) && condition.fieldKey !== field.fieldKey) {
        issues.push({
          code: SERVICE_PACK_COMPILATION_CHECK_CODES.FORM_FIELD_VALIDITY,
          severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
          message: `Conditional rule references unknown field "${condition.fieldKey}"`,
          path: fieldPath,
          entityRef: condition.fieldKey,
        });
      }
    }
  }

  return issues;
}

function validateFormConditionalReferences(
  form: ServicePackFormManifest,
  pathPrefix: string,
): ServicePackCompilationIssue[] {
  const issues: ServicePackCompilationIssue[] = [];
  const allFields = form.sections.flatMap((section) => section.fields);
  const fieldKeySet = new Set(allFields.map((field) => field.fieldKey));

  const graph = new Map<string, Set<string>>();
  for (const field of allFields) {
    const dependencies = new Set<string>();
    for (const rule of field.conditionalRules ?? []) {
      for (const condition of rule.conditions) {
        dependencies.add(condition.fieldKey);
      }
    }
    graph.set(field.fieldKey, dependencies);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (fieldKey: string, path: string[]): void => {
    if (visiting.has(fieldKey)) {
      issues.push({
        code: SERVICE_PACK_COMPILATION_CHECK_CODES.FORM_FIELD_VALIDITY,
        severity: SERVICE_PACK_ISSUE_SEVERITY.ERROR,
        message: `Circular conditional dependency detected: ${[...path, fieldKey].join(' -> ')}`,
        path: pathPrefix,
        entityRef: fieldKey,
      });
      return;
    }

    if (visited.has(fieldKey)) {
      return;
    }

    visiting.add(fieldKey);
    const dependencies = graph.get(fieldKey) ?? new Set<string>();
    for (const dependency of dependencies) {
      if (!fieldKeySet.has(dependency)) {
        continue;
      }
      visit(dependency, [...path, fieldKey]);
    }
    visiting.delete(fieldKey);
    visited.add(fieldKey);
  };

  for (const fieldKey of graph.keys()) {
    visit(fieldKey, []);
  }

  return issues;
}

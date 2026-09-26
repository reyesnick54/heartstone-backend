import {
  type ConsequentialActionContext,
  type ConsequentialInstitutionalContext,
  DEFAULT_INSTITUTIONAL_FIELD_PREFIXES,
} from './consequential-action.types';

type InstitutionalField = keyof ConsequentialInstitutionalContext;

function readDirectField(
  body: Record<string, unknown>,
  field: InstitutionalField,
): string | undefined {
  const direct = body[field];
  return typeof direct === 'string' ? direct : undefined;
}

function readPrefixedField(
  body: Record<string, unknown>,
  field: InstitutionalField,
  prefixes: readonly string[],
): string | undefined {
  const suffix = `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  for (const prefix of prefixes) {
    const key = `${prefix}${suffix}`;
    const value = body[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

export function readInstitutionalContext(
  context: ConsequentialActionContext,
  prefixes: readonly string[] = DEFAULT_INSTITUTIONAL_FIELD_PREFIXES,
): ConsequentialInstitutionalContext {
  const body = context.request.body ?? {};

  return {
    officeholderId:
      readDirectField(body, 'officeholderId') ??
      readPrefixedField(body, 'officeholderId', prefixes),
    officeId: readDirectField(body, 'officeId') ?? readPrefixedField(body, 'officeId', prefixes),
    appointmentId:
      readDirectField(body, 'appointmentId') ?? readPrefixedField(body, 'appointmentId', prefixes),
    delegationId:
      readDirectField(body, 'delegationId') ?? readPrefixedField(body, 'delegationId', prefixes),
  };
}

/** Category-A resource identifiers only; authority facts are never read from the request body. */
export function readEvaluationResourceScope(body: Record<string, unknown>): {
  caseId?: string;
  evidencePacketVersionId?: string;
  decisionReadinessAssessmentId?: string;
  transactionAmount?: number;
  scopeValue?: string;
  externalDataAccessOnly?: boolean;
} {
  return {
    caseId: typeof body.caseId === 'string' ? body.caseId : undefined,
    evidencePacketVersionId:
      typeof body.evidencePacketVersionId === 'string' ? body.evidencePacketVersionId : undefined,
    decisionReadinessAssessmentId:
      typeof body.decisionReadinessAssessmentId === 'string'
        ? body.decisionReadinessAssessmentId
        : undefined,
    transactionAmount:
      typeof body.transactionAmount === 'number' ? body.transactionAmount : undefined,
    scopeValue: typeof body.scopeValue === 'string' ? body.scopeValue : undefined,
    externalDataAccessOnly:
      typeof body.externalDataAccessOnly === 'boolean' ? body.externalDataAccessOnly : undefined,
  };
}

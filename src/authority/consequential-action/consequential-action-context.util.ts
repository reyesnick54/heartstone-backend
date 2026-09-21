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

export function readEvaluationModifiers(body: Record<string, unknown>): {
  evidenceProvided?: string[];
  qualificationCodes?: string[];
  transactionAmount?: number;
  scopeValue?: string;
  hasSecondApproval?: boolean;
  hasConsultation?: boolean;
  hasSupervision?: boolean;
  hasLiaison?: boolean;
  isSelfApproval?: boolean;
  isConflicted?: boolean;
  isRecused?: boolean;
  priorActions?: never;
  externalDataAccessOnly?: boolean;
  at?: Date;
} {
  const atValue = body.at;
  return {
    evidenceProvided: body.evidenceProvided as string[] | undefined,
    qualificationCodes: body.qualificationCodes as string[] | undefined,
    transactionAmount: body.transactionAmount as number | undefined,
    scopeValue: body.scopeValue as string | undefined,
    hasSecondApproval: body.hasSecondApproval as boolean | undefined,
    hasConsultation: body.hasConsultation as boolean | undefined,
    hasSupervision: body.hasSupervision as boolean | undefined,
    hasLiaison: body.hasLiaison as boolean | undefined,
    isSelfApproval: body.isSelfApproval as boolean | undefined,
    isConflicted: body.isConflicted as boolean | undefined,
    isRecused: body.isRecused as boolean | undefined,
    priorActions: body.priorActions as never,
    externalDataAccessOnly: body.externalDataAccessOnly as boolean | undefined,
    at: typeof atValue === 'string' ? new Date(atValue) : undefined,
  };
}

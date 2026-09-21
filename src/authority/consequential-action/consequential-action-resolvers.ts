import {
  type ConsequentialActionContext,
  type ConsequentialFunctionResolver,
  type ConsequentialResourceScope,
  type ConsequentialResourceScopeResolver,
} from './consequential-action.types';

function readBodyString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === 'string' ? value : null;
}

export const resolveFunctionFromDecisionTypeVersion: ConsequentialFunctionResolver = async (
  context,
) => {
  const decisionTypeVersionId = readBodyString(context.request.body ?? {}, 'decisionTypeVersionId');
  if (!decisionTypeVersionId) {
    return null;
  }

  const version = await context.prisma.decisionTypeVersion.findUnique({
    where: { id: decisionTypeVersionId },
    select: { functionAuthorityRecordId: true },
  });
  return version?.functionAuthorityRecordId ?? null;
};

export const resolveFunctionFromInstrumentTypeVersion: ConsequentialFunctionResolver = async (
  context,
) => {
  const instrumentTypeVersionId = readBodyString(
    context.request.body ?? {},
    'instrumentTypeVersionId',
  );
  if (!instrumentTypeVersionId) {
    return null;
  }

  const typeVersion = await context.prisma.instrumentTypeVersion.findUnique({
    where: { id: instrumentTypeVersionId },
    select: { issuanceFunctionAuthorityRecordId: true },
  });
  return typeVersion?.issuanceFunctionAuthorityRecordId ?? null;
};

export const resolveFunctionFromRedressMatter: ConsequentialFunctionResolver = async (context) => {
  const body = context.request.body ?? {};
  const redressMatterId =
    readBodyString(body, 'redressMatterId') ??
    (await resolveRedressMatterIdFromInterimRequest(context));

  if (!redressMatterId) {
    return null;
  }

  const matter = await context.prisma.redressMatter.findUnique({
    where: { id: redressMatterId },
    select: { routeVersion: { select: { functionAuthorityRecordId: true } } },
  });
  return matter?.routeVersion.functionAuthorityRecordId ?? null;
};

async function resolveRedressMatterIdFromInterimRequest(
  context: ConsequentialActionContext,
): Promise<string | null> {
  const interimReliefRequestId = readBodyString(
    context.request.body ?? {},
    'interimReliefRequestId',
  );
  if (!interimReliefRequestId) {
    return null;
  }

  const request = await context.prisma.interimReliefRequest.findUnique({
    where: { id: interimReliefRequestId },
    select: { redressMatterId: true },
  });
  return request?.redressMatterId ?? null;
}

export const resolveFunctionFromComplianceReview: ConsequentialFunctionResolver = async (
  context,
) => {
  const reviewId = readBodyString(context.request.body ?? {}, 'reviewId');
  if (!reviewId) {
    return null;
  }

  const review = await context.prisma.complianceReview.findUnique({
    where: { id: reviewId },
    select: {
      functionAuthorityRecordId: true,
      continuingObligation: { select: { functionAuthorityRecordId: true } },
    },
  });

  return (
    review?.functionAuthorityRecordId ??
    review?.continuingObligation.functionAuthorityRecordId ??
    null
  );
};

export const resolveFunctionFromRouteParam: ConsequentialFunctionResolver = (context) => {
  return Promise.resolve(context.request.params?.id ?? null);
};

export const resolveResourceFromCase: ConsequentialResourceScopeResolver = async (context) => {
  const caseId = readBodyString(context.request.body ?? {}, 'caseId');
  if (!caseId) {
    return null;
  }

  const caseRecord = await context.prisma.case.findUnique({
    where: { id: caseId },
    select: {
      responsibleInstitutionId: true,
      responsibleDepartmentId: true,
    },
  });

  if (!caseRecord) {
    return null;
  }

  return {
    institutionId: caseRecord.responsibleInstitutionId,
    departmentId: caseRecord.responsibleDepartmentId,
  };
};

export const resolveResourceFromRedressMatter: ConsequentialResourceScopeResolver = async (
  context,
) => {
  const body = context.request.body ?? {};
  const redressMatterId =
    readBodyString(body, 'redressMatterId') ??
    (await resolveRedressMatterIdFromInterimRequest(context));

  if (!redressMatterId) {
    return null;
  }

  const matter = await context.prisma.redressMatter.findUnique({
    where: { id: redressMatterId },
    select: {
      challengedDecision: {
        select: {
          institutionId: true,
          departmentId: true,
        },
      },
    },
  });

  if (!matter) {
    return null;
  }

  return {
    institutionId: matter.challengedDecision.institutionId ?? undefined,
    departmentId: matter.challengedDecision.departmentId ?? undefined,
  };
};

export const resolveResourceFromComplianceReview: ConsequentialResourceScopeResolver = async (
  context,
) => {
  const reviewId = readBodyString(context.request.body ?? {}, 'reviewId');
  if (!reviewId) {
    return null;
  }

  const review = await context.prisma.complianceReview.findUnique({
    where: { id: reviewId },
    select: {
      continuingObligation: {
        select: {
          reviewingOfficeId: true,
          complianceMatter: {
            select: {
              responsibleInstitutionId: true,
              responsibleDepartmentId: true,
            },
          },
        },
      },
    },
  });

  if (!review) {
    return null;
  }

  return {
    institutionId: review.continuingObligation.complianceMatter.responsibleInstitutionId,
    departmentId: review.continuingObligation.complianceMatter.responsibleDepartmentId,
    officeId: review.continuingObligation.reviewingOfficeId ?? undefined,
  };
};

export async function validateInstitutionalResourceScope(
  functionAuthorityRecordId: string,
  resourceScope: ConsequentialResourceScope | null,
  prisma: ConsequentialActionContext['prisma'],
): Promise<boolean> {
  if (!resourceScope) {
    return true;
  }

  const functionRecord = await prisma.functionAuthorityRecord.findUnique({
    where: { id: functionAuthorityRecordId },
    select: { institutionId: true, officeId: true },
  });

  if (!functionRecord) {
    return false;
  }

  if (
    resourceScope.institutionId &&
    functionRecord.institutionId &&
    resourceScope.institutionId !== functionRecord.institutionId
  ) {
    return false;
  }

  if (
    resourceScope.officeId &&
    functionRecord.officeId &&
    resourceScope.officeId !== functionRecord.officeId
  ) {
    return false;
  }

  return true;
}

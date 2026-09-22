import {
  type ConsequentialActionContext,
  type ConsequentialFunctionResolver,
  type ConsequentialResourceScopeResolver,
} from '../../authority/consequential-action/consequential-action.types';
import { SERVICE_PACK_GOVERNANCE_FUNCTION_CODE } from './service-pack-governance.constants';

export const resolveFunctionFromServicePackRoute: ConsequentialFunctionResolver = async (
  context,
) => {
  const servicePackId = context.request.params?.id;
  if (!servicePackId) {
    return null;
  }

  const pack = await context.prisma.servicePack.findUnique({
    where: { id: servicePackId },
    select: { institutionId: true },
  });
  if (!pack) {
    return null;
  }

  const functionRecord = await context.prisma.functionAuthorityRecord.findFirst({
    where: {
      institutionId: pack.institutionId,
      code: SERVICE_PACK_GOVERNANCE_FUNCTION_CODE,
    },
    select: { id: true },
  });

  return functionRecord?.id ?? null;
};

export const resolveResourceFromServicePackRoute: ConsequentialResourceScopeResolver = async (
  context: ConsequentialActionContext,
) => {
  const servicePackId = context.request.params?.id;
  if (!servicePackId) {
    return null;
  }

  const pack = await context.prisma.servicePack.findUnique({
    where: { id: servicePackId },
    select: { institutionId: true },
  });
  if (!pack) {
    return null;
  }

  return { institutionId: pack.institutionId };
};

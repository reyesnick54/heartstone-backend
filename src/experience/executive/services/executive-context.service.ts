import { Injectable } from '@nestjs/common';
import { DashboardAccessPurpose, DashboardConsoleType, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { ExecutiveExperienceAccessDeniedException } from '../exceptions/executive-experience.exceptions';
import { EXECUTIVE_AUTHORITY_DISCLAIMER } from '../executive-experience.constants';
import {
  type ExecutiveBriefingScope,
  type ResolvedExecutiveContext,
} from '../types/executive-context.types';

@Injectable()
export class ExecutiveContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveContext(actor: ActorContext): Promise<ResolvedExecutiveContext> {
    if (actor.identityType === IdentityType.SERVICE) {
      throw new ExecutiveExperienceAccessDeniedException(
        'Service or AI identities cannot access the executive government experience',
      );
    }

    const policies = await this.prisma.dashboardAccessPolicy.findMany({
      where: {
        identityId: actor.identityId,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        dashboardDefinition: { consoleType: DashboardConsoleType.EXECUTIVE_COMMAND },
      },
      include: {
        dashboardDefinition: true,
      },
    });

    const substantivePolicies = policies.filter(
      (policy) => policy.substantiveAccessRequired && !policy.technicalPermissionCode,
    );
    const technicalOnlyPolicies = policies.filter(
      (policy) => policy.technicalPermissionCode && !policy.substantiveAccessRequired,
    );

    const isTechnicalAdminOnly =
      substantivePolicies.length === 0 && technicalOnlyPolicies.length > 0;

    if (substantivePolicies.length === 0) {
      throw new ExecutiveExperienceAccessDeniedException(
        isTechnicalAdminOnly
          ? 'Technical platform administration does not confer substantive executive briefing access'
          : 'No executive briefing dashboard access policy exists for this identity',
      );
    }

    const briefingScopes: ExecutiveBriefingScope[] = substantivePolicies.map((policy) => ({
      dashboardDefinitionId: policy.dashboardDefinitionId,
      institutionId: policy.institutionId ?? policy.dashboardDefinition.institutionId ?? '',
      sensitivityLevel: policy.sensitivityLevel,
      dashboardCode: policy.dashboardDefinition.code,
      dashboardName: policy.dashboardDefinition.name,
    }));

    const institutionIds = [
      ...new Set(briefingScopes.map((scope) => scope.institutionId).filter(Boolean)),
    ];

    const appointmentInstitutionIds = actor.activeAppointments.map(
      (appointment) => appointment.institutionId,
    );
    const allInstitutionIds = [...new Set([...institutionIds, ...appointmentInstitutionIds])];

    return {
      actor,
      briefingScopes,
      primaryInstitutionId: institutionIds[0] ?? allInstitutionIds[0] ?? '',
      institutionIds: allInstitutionIds,
      hasExecutiveBriefingAccess: true,
      isTechnicalAdminOnly: false,
      authorityDisclaimer: EXECUTIVE_AUTHORITY_DISCLAIMER,
      visibilityDoesNotCreateAuthority: true,
      executiveDashboardIsNotCommandAuthority: true,
    };
  }

  assertInstitutionInScope(context: ResolvedExecutiveContext, institutionId: string): void {
    const entitledInstitutionIds = context.briefingScopes
      .map((scope) => scope.institutionId)
      .filter(Boolean);

    if (!entitledInstitutionIds.includes(institutionId)) {
      throw new ExecutiveExperienceAccessDeniedException(
        `Institution "${institutionId}" is outside executive briefing policy scope`,
      );
    }
  }
}

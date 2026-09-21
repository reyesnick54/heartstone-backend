import { Injectable } from '@nestjs/common';
import { ApplicantCategory, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { TECHNICAL_ADMIN_ROLE_MARKER } from '../../official/official-experience.constants';
import { OfficialContextService } from '../../official/services/official-context.service';
import {
  DEPARTMENT_MANAGEMENT_ROLE_MARKER,
  EXECUTIVE_ROLE_MARKER,
  EXPERIENCE_PERSONAS,
  type ExperiencePersona,
} from '../constants/experience-persona.constants';
import {
  type ExperienceCapabilities,
  type ResolvedExperienceActor,
} from '../types/experience-actor-context.types';

@Injectable()
export class ExperienceActorResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly officialContext: OfficialContextService,
  ) {}

  async resolve(
    actor: ActorContext,
    options?: { technicalRoleMarker?: string; locale?: string },
  ): Promise<ResolvedExperienceActor> {
    const technicalRoleMarker = options?.technicalRoleMarker;
    const locale = options?.locale ?? 'en';
    const personas = await this.resolvePersonas(actor, technicalRoleMarker);
    const primaryPersona = personas[0] ?? EXPERIENCE_PERSONAS.CITIZEN;

    const officialContext =
      actor.officeholderLinks.length > 0
        ? await this.officialContext.resolveContext(
            actor.identityId,
            actor.assuranceLevel,
            technicalRoleMarker,
          )
        : null;

    const capabilities = this.buildCapabilities(actor, officialContext, technicalRoleMarker);

    return {
      identityId: actor.identityId,
      primaryPersona,
      personas,
      actor,
      officialContext,
      capabilities,
      locale,
      technicalRoleMarker,
    };
  }

  private async resolvePersonas(
    actor: ActorContext,
    technicalRoleMarker?: string,
  ): Promise<ExperiencePersona[]> {
    if (actor.identityType === IdentityType.SERVICE) {
      return [];
    }

    const personas: ExperiencePersona[] = [];

    if (technicalRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER) {
      personas.push(EXPERIENCE_PERSONAS.PLATFORM_ADMINISTRATION);
    }

    if (actor.activeAppointments.length > 0) {
      if (technicalRoleMarker === EXECUTIVE_ROLE_MARKER) {
        personas.push(EXPERIENCE_PERSONAS.EXECUTIVE_LEADERSHIP);
      } else if (technicalRoleMarker === DEPARTMENT_MANAGEMENT_ROLE_MARKER) {
        personas.push(EXPERIENCE_PERSONAS.DEPARTMENT_MANAGEMENT);
      } else {
        personas.push(EXPERIENCE_PERSONAS.GOVERNMENT_OFFICIAL);
      }
    }

    if (actor.representativeAuthorities.length > 0) {
      personas.push(EXPERIENCE_PERSONAS.AUTHORIZED_REPRESENTATIVE);
    }

    if (actor.organizationMemberships.length > 0) {
      personas.push(EXPERIENCE_PERSONAS.BUSINESS);
    }

    const observedCategories = await this.loadObservedApplicantCategories(actor.identityId);
    if (observedCategories.includes(ApplicantCategory.INVESTOR)) {
      personas.push(EXPERIENCE_PERSONAS.INVESTOR);
    }

    if (
      observedCategories.includes(ApplicantCategory.RESIDENT) ||
      observedCategories.includes(ApplicantCategory.NON_RESIDENT)
    ) {
      personas.push(EXPERIENCE_PERSONAS.RESIDENT);
    }

    if (
      observedCategories.includes(ApplicantCategory.CITIZEN) ||
      observedCategories.includes(ApplicantCategory.INDIVIDUAL)
    ) {
      personas.push(EXPERIENCE_PERSONAS.CITIZEN);
    }

    if (personas.length === 0) {
      personas.push(EXPERIENCE_PERSONAS.CITIZEN);
    }

    return [...new Set(personas)];
  }

  private async loadObservedApplicantCategories(identityId: string): Promise<ApplicantCategory[]> {
    const applications = await this.prisma.application.findMany({
      where: { applicantIdentityId: identityId },
      select: { applicantCategory: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return [...new Set(applications.map((application) => application.applicantCategory))];
  }

  private buildCapabilities(
    actor: ActorContext,
    officialContext: Awaited<ReturnType<OfficialContextService['resolveContext']>> | null,
    technicalRoleMarker?: string,
  ): ExperienceCapabilities {
    const substantiveAccess =
      officialContext?.technicalCapabilities.substantiveAccessAllowed ?? false;
    const isTechnicalAdmin =
      technicalRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER &&
      !(officialContext?.technicalCapabilities.hasActiveAppointment ?? false);

    return {
      canSearchCitizenResources: actor.identityType !== IdentityType.SERVICE,
      canSearchOfficialResources: substantiveAccess,
      substantiveAccess,
      executiveBriefing: technicalRoleMarker === EXECUTIVE_ROLE_MARKER && substantiveAccess,
      departmentManagement:
        technicalRoleMarker === DEPARTMENT_MANAGEMENT_ROLE_MARKER && substantiveAccess,
      technicalAdministration: isTechnicalAdmin,
      hasRepresentativeAuthority: actor.representativeAuthorities.length > 0,
      hasOrganizationMembership: actor.organizationMemberships.length > 0,
    };
  }
}

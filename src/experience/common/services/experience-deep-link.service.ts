import { Injectable } from '@nestjs/common';

import { OfficialScopeService } from '../../official/services/official-scope.service';
import { CitizenAccessService } from '../citizen-access.service';
import {
  EXPERIENCE_DEEP_LINK_PARAM_REQUIREMENTS,
  EXPERIENCE_DEEP_LINK_ROUTES,
  type ExperienceDeepLinkRoute,
} from '../constants/experience-deep-link-routes.constants';
import { OFFICIAL_PERSONAS } from '../constants/experience-persona.constants';
import {
  ExperienceDeepLinkResolveRequestDto,
  ExperienceDeepLinkResolveResponseDto,
} from '../dto/experience-response-metadata.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';

@Injectable()
export class ExperienceDeepLinkService {
  constructor(
    private readonly citizenAccess: CitizenAccessService,
    private readonly officialScope: OfficialScopeService,
  ) {}

  async resolveDeepLink(
    actor: ResolvedExperienceActor,
    request: ExperienceDeepLinkResolveRequestDto,
  ): Promise<ExperienceDeepLinkResolveResponseDto> {
    if (!(request.route in EXPERIENCE_DEEP_LINK_PARAM_REQUIREMENTS)) {
      return this.denied(request, 'Unknown deep link route');
    }

    const route = request.route as ExperienceDeepLinkRoute;
    const paramRequirements = EXPERIENCE_DEEP_LINK_PARAM_REQUIREMENTS[route];

    const missingParam = paramRequirements.find((param) => !request.params[param]);
    if (missingParam) {
      return this.denied(request, `Missing required parameter: ${missingParam}`);
    }

    const authorized = await this.evaluateAuthorization(actor, route, request.params);
    if (!authorized.allowed) {
      return this.denied(request, authorized.reason ?? 'Access denied');
    }

    return {
      authorized: true,
      route: request.route,
      params: request.params,
      resolutionDisclaimer:
        'Deep link resolution confirms presentation routing only. Target endpoints re-evaluate authorization at execution time.',
    };
  }

  private async evaluateAuthorization(
    actor: ResolvedExperienceActor,
    route: ExperienceDeepLinkRoute,
    params: Record<string, string>,
  ): Promise<{ allowed: boolean; reason?: string }> {
    switch (route) {
      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_APPLICATION_DETAIL: {
        const applicationId = params.applicationId;
        if (!applicationId) {
          return { allowed: false, reason: 'Missing applicationId' };
        }
        try {
          await this.citizenAccess.assertApplicationAccess(applicationId, actor.identityId);
          return { allowed: true };
        } catch {
          return { allowed: false, reason: 'Application is outside accessible scope' };
        }
      }

      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_CASE_STATUS:
      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_CASE_MESSAGES: {
        const caseId = params.caseId;
        if (!caseId) {
          return { allowed: false, reason: 'Missing caseId' };
        }
        try {
          await this.citizenAccess.assertCaseAccess(caseId, actor.identityId);
          return { allowed: true };
        } catch {
          return { allowed: false, reason: 'Case is outside accessible scope' };
        }
      }

      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_PAYMENT_INVOICE:
      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_INSTRUMENT_DETAIL:
      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_DOCUMENT_DETAIL:
      case EXPERIENCE_DEEP_LINK_ROUTES.CITIZEN_MESSAGE_DETAIL:
        return { allowed: actor.capabilities.canSearchCitizenResources };

      case EXPERIENCE_DEEP_LINK_ROUTES.BUSINESS_OVERVIEW:
        return {
          allowed: actor.capabilities.hasOrganizationMembership,
          reason: actor.capabilities.hasOrganizationMembership
            ? undefined
            : 'No organization membership for business route',
        };

      case EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_DETAIL:
      case EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_CASE_ACTIONS: {
        const caseId = params.caseId;
        if (!caseId) {
          return { allowed: false, reason: 'Missing caseId' };
        }
        if (!actor.officialContext || !actor.capabilities.substantiveAccess) {
          return { allowed: false, reason: 'Substantive official access required' };
        }
        try {
          await this.officialScope.assertCaseAccess(actor.officialContext, caseId);
          return { allowed: true };
        } catch {
          return { allowed: false, reason: 'Case is outside official scope' };
        }
      }

      case EXPERIENCE_DEEP_LINK_ROUTES.OFFICIAL_EVIDENCE_DETAIL:
        if (
          !actor.officialContext ||
          !OFFICIAL_PERSONAS.includes(actor.primaryPersona) ||
          !actor.capabilities.substantiveAccess
        ) {
          return { allowed: false, reason: 'Evidence access requires substantive official scope' };
        }
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Route authorization not configured' };
    }
  }

  private denied(
    request: ExperienceDeepLinkResolveRequestDto,
    reason: string,
  ): ExperienceDeepLinkResolveResponseDto {
    return {
      authorized: false,
      route: request.route,
      params: request.params,
      denialReason: reason,
      resolutionDisclaimer:
        'Unauthorized deep links cannot bypass backend authorization. Resolve endpoints never grant access.',
    };
  }
}

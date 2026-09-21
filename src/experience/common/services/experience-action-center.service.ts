import { Injectable } from '@nestjs/common';

import { CitizenActionCenterService } from '../../citizen/services/citizen-action-center.service';
import { OfficialAvailableActionsService } from '../../official/services/official-available-actions.service';
import {
  EXPERIENCE_ACTION_STATUSES,
  EXPERIENCE_ACTION_TYPES,
} from '../constants/experience-action.constants';
import {
  ExperienceActionItemDto,
  ExperienceActionsResponseDto,
} from '../dto/experience-action.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';
import { ExperienceLocalizationContract } from './experience-localization.contract';

const CITIZEN_ACTION_TYPE_MAP: Record<string, string> = {
  PAY_INVOICE: EXPERIENCE_ACTION_TYPES.PAYMENT,
  PROVIDE_MISSING_INFORMATION: EXPERIENCE_ACTION_TYPES.RESPONSE,
  RESPOND_TO_REQUEST: EXPERIENCE_ACTION_TYPES.RESPONSE,
  REVIEW_GOVERNMENT_MESSAGE: EXPERIENCE_ACTION_TYPES.REVIEW,
  ACKNOWLEDGE_NOTICE: EXPERIENCE_ACTION_TYPES.ACKNOWLEDGMENT,
  RENEW_INSTRUMENT: EXPERIENCE_ACTION_TYPES.RENEWAL,
  COMPLETE_DRAFT_APPLICATION: EXPERIENCE_ACTION_TYPES.TASK,
  SUBMIT_APPEAL: EXPERIENCE_ACTION_TYPES.TASK,
};

@Injectable()
export class ExperienceActionCenterService {
  constructor(
    private readonly citizenActionCenter: CitizenActionCenterService,
    private readonly officialAvailableActions: OfficialAvailableActionsService,
    private readonly localization: ExperienceLocalizationContract,
  ) {}

  async listActions(
    actor: ResolvedExperienceActor,
    query: PaginationQueryDto,
    options?: { caseId?: string },
  ): Promise<ExperienceActionsResponseDto> {
    if (actor.capabilities.substantiveAccess && actor.officialContext && options?.caseId) {
      return this.listOfficialCaseActions(actor, options.caseId);
    }

    if (actor.capabilities.canSearchCitizenResources) {
      return this.listCitizenActions(actor, query);
    }

    return {
      items: [],
      pagination: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      executionRequiresRevalidation: true,
    };
  }

  private async listCitizenActions(
    actor: ResolvedExperienceActor,
    query: PaginationQueryDto,
  ): Promise<ExperienceActionsResponseDto> {
    const response = await this.citizenActionCenter.listActions(actor.identityId, query);

    const items: ExperienceActionItemDto[] = response.items.map((action) => ({
      actionCode: action.actionCode,
      actionType: CITIZEN_ACTION_TYPE_MAP[action.actionCode] ?? EXPERIENCE_ACTION_TYPES.TASK,
      title: action.label,
      description: this.localization.buildLabel(
        {
          defaultLabel: action.label.label,
          labelKey: `${action.label.labelKey ?? action.actionCode}.description`,
        },
        actor.locale,
      ),
      priority: action.priority,
      sourceDomain: 'application_processing',
      resourceType: this.inferCitizenResourceType(action),
      resourceId:
        action.relatedCaseId ??
        action.relatedApplicationId ??
        action.relatedInvoiceId ??
        action.relatedInstrumentId ??
        action.relatedCommunicationId ??
        action.actionCode,
      deepLink: action.deepLink,
      dueDate: action.dueAt,
      institution: action.attribution,
      departmentId: action.attribution.departmentId,
      departmentName: action.attribution.departmentName,
      status:
        action.dueAt && Date.parse(action.dueAt) < Date.now()
          ? EXPERIENCE_ACTION_STATUSES.OVERDUE
          : EXPERIENCE_ACTION_STATUSES.OPEN,
      presentationOnly: true,
    }));

    return {
      items,
      pagination: response.pagination,
      executionRequiresRevalidation: true,
    };
  }

  private async listOfficialCaseActions(
    actor: ResolvedExperienceActor,
    caseId: string,
  ): Promise<ExperienceActionsResponseDto> {
    if (!actor.officialContext) {
      return {
        items: [],
        pagination: {
          page: 1,
          pageSize: 0,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        executionRequiresRevalidation: true,
      };
    }

    const response = await this.officialAvailableActions.getAvailableActions(
      actor.officialContext,
      caseId,
    );

    const items: ExperienceActionItemDto[] = response.actions.map((action) => ({
      actionCode: action.actionKey,
      actionType: action.isConsequential
        ? EXPERIENCE_ACTION_TYPES.DECISION
        : EXPERIENCE_ACTION_TYPES.WORKFLOW,
      title: this.localization.buildLabel(
        {
          defaultLabel: action.label,
          labelKey: `experience.action.official.${action.actionKey}.title`,
        },
        actor.locale,
      ),
      description: this.localization.buildLabel(
        {
          defaultLabel: action.description,
          labelKey: `experience.action.official.${action.actionKey}.description`,
        },
        actor.locale,
      ),
      priority: action.available ? 10 : 100,
      sourceDomain: 'application_processing',
      resourceType: 'case',
      resourceId: caseId,
      deepLink: {
        route: 'official.case.actions',
        params: { caseId },
      },
      dueDate: null,
      status: action.available
        ? EXPERIENCE_ACTION_STATUSES.AVAILABLE
        : EXPERIENCE_ACTION_STATUSES.UNAVAILABLE,
      presentationOnly: true,
    }));

    return {
      items,
      pagination: {
        page: 1,
        pageSize: items.length,
        totalItems: items.length,
        totalPages: items.length === 0 ? 0 : 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      executionRequiresRevalidation: response.executionRequiresAuthorityRevalidation,
    };
  }

  private inferCitizenResourceType(action: {
    relatedCaseId?: string;
    relatedApplicationId?: string;
    relatedInvoiceId?: string;
    relatedInstrumentId?: string;
    relatedCommunicationId?: string;
  }): string {
    if (action.relatedInvoiceId) {
      return 'invoice';
    }
    if (action.relatedInstrumentId) {
      return 'instrument';
    }
    if (action.relatedCommunicationId) {
      return 'communication';
    }
    if (action.relatedApplicationId) {
      return 'application';
    }
    if (action.relatedCaseId) {
      return 'case';
    }
    return 'task';
  }
}

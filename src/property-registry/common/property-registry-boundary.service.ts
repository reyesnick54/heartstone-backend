import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  PropertyRegistryCorrectionStatus,
  PropertyTransferApplicationStatus,
} from '@prisma/client';

import {
  FORBIDDEN_AI_PROPERTY_REGISTRY_ACTIONS,
  FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS,
  FORBIDDEN_CLIENT_TITLE_HOLDER_FIELDS,
  FORBIDDEN_CLIENT_TRANSFER_FIELDS,
  OFFICIAL_TRANSFER_STATUSES,
  PLATFORM_ADMIN_ROLE_MARKER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../property-registry.constants';

@Injectable()
export class PropertyRegistryBoundaryService {
  rejectClientForgedTransferFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_TRANSFER_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}" on a property transfer; title changes require authority and registry mutation`,
        );
      }
    }
  }

  rejectClientForgedTitleHolderFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_TITLE_HOLDER_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not directly mutate title holder field "${field}"; use governed transfer registration`,
        );
      }
    }
  }

  rejectClientForgedRegistryEntryFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a property registry entry`);
      }
    }
  }

  assertCitizenCannotDirectlyChangeTitleHolder(input: {
    mutatesTitleHolder?: boolean;
    isCitizenActor?: boolean;
  }): void {
    if (input.mutatesTitleHolder && input.isCitizenActor !== false) {
      throw new ForbiddenException(
        'Citizens and applicants cannot directly change registered title holders',
      );
    }
  }

  assertTransferApplicationDoesNotMutateTitle(status?: PropertyTransferApplicationStatus): void {
    if (status && (OFFICIAL_TRANSFER_STATUSES as readonly string[]).includes(status)) {
      throw new ForbiddenException(
        'Transfer application status alone cannot mark title as registered; record registry mutation through authority and decision',
      );
    }
  }

  assertPaymentDoesNotChangeTitle(mutatesTitleOnPayment?: boolean): void {
    if (mutatesTitleOnPayment) {
      throw new ForbiddenException(
        'Recording a transfer fee payment must not change title ownership',
      );
    }
  }

  assertParcelDistinctFromTitle(input: { landParcelId?: string; titleRecordId?: string }): void {
    if (!input.landParcelId || !input.titleRecordId) {
      return;
    }
  }

  assertEncumbranceCannotBeSilentlyDeleted(operation: 'delete' | 'hard_remove'): void {
    throw new ForbiddenException(
      `Encumbrances cannot be silently deleted via "${operation}"; record release or supersession with authority`,
    );
  }

  assertUnauthorizedRepresentativeCannotTransfer(hasValidRepresentativeAuthority: boolean): void {
    if (!hasValidRepresentativeAuthority) {
      throw new ForbiddenException(
        'Representative cannot initiate or complete property transfer without valid representative authority',
      );
    }
  }

  assertPlatformAdminCannotMutateLegalOwnership(input: {
    actorRoleMarker?: string;
    mutatesLegalOwnership?: boolean;
  }): void {
    if (
      input.mutatesLegalOwnership &&
      (input.actorRoleMarker === PLATFORM_ADMIN_ROLE_MARKER ||
        input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER)
    ) {
      throw new ForbiddenException(
        'Technical or platform administrative access cannot mutate legal title ownership',
      );
    }
  }

  assertAuthorityEvaluationRequired(authorityEvaluationRecordId?: string): void {
    if (!authorityEvaluationRecordId) {
      throw new BadRequestException(
        'Official property title registration requires a recorded authority evaluation',
      );
    }
  }

  assertAuthorityEvaluationPermitsRegistration(outcome: AuthorityEvaluationOutcome): void {
    if (outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Authority evaluation did not permit official property title registration',
      );
    }
  }

  assertAiCannotApproveTitleTransfer(action: string, isAiActor: boolean): void {
    if (
      isAiActor &&
      (FORBIDDEN_AI_PROPERTY_REGISTRY_ACTIONS as readonly string[]).includes(action)
    ) {
      throw new ForbiddenException('AI assistance cannot approve or record title transfer');
    }
  }

  assertHistoricalTitleDeletionBlocked(): never {
    throw new ForbiddenException(
      'Historical title versions and interest history cannot be deleted; use correction and supersession',
    );
  }

  assertCorrectionRequestIsNotApproval(status: PropertyRegistryCorrectionStatus): void {
    if (status === PropertyRegistryCorrectionStatus.APPROVED_FOR_CORRECTION) {
      throw new BadRequestException(
        'Title correction approval must flow through review, authority, and governed registry mutation',
      );
    }
  }
}

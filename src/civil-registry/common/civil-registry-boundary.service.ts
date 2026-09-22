import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  CivilRecordCorrectionRequestStatus,
  VitalEventRegistrationStatus,
} from '@prisma/client';

import {
  FORBIDDEN_AI_CIVIL_REGISTRY_ACTIONS,
  FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS,
  FORBIDDEN_CLIENT_VITAL_EVENT_FIELDS,
  OFFICIAL_VITAL_EVENT_STATUSES,
  PLATFORM_ADMIN_ROLE_MARKER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../civil-registry.constants';

@Injectable()
export class CivilRegistryBoundaryService {
  rejectClientForgedVitalEventFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_VITAL_EVENT_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}" on a vital event; official registration requires authority and decision`,
        );
      }
    }
  }

  rejectClientForgedRegistryEntryFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}" on a civil registry entry`);
      }
    }
  }

  assertCitizenCannotCreateOfficialRegistryEntry(input: {
    registrationStatus?: VitalEventRegistrationStatus;
    creatingRegistryEntry?: boolean;
  }): void {
    if (input.creatingRegistryEntry) {
      throw new ForbiddenException(
        'Citizen or applicant submission cannot directly create an official civil registry entry',
      );
    }

    if (
      input.registrationStatus &&
      (OFFICIAL_VITAL_EVENT_STATUSES as readonly string[]).includes(input.registrationStatus)
    ) {
      throw new ForbiddenException(
        'Self-declaration or client submission cannot set official vital event registration status',
      );
    }
  }

  assertPlatformAdminCannotAlterOfficialFact(input: {
    actorRoleMarker?: string;
    mutatesOfficialRegistryPayload?: boolean;
  }): void {
    if (
      input.mutatesOfficialRegistryPayload &&
      (input.actorRoleMarker === PLATFORM_ADMIN_ROLE_MARKER ||
        input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER)
    ) {
      throw new ForbiddenException(
        'Platform administrative access cannot alter official civil registry facts',
      );
    }
  }

  assertAuthorityEvaluationRequired(authorityEvaluationRecordId?: string): void {
    if (!authorityEvaluationRecordId) {
      throw new BadRequestException(
        'Official civil registry registration requires a recorded authority evaluation',
      );
    }
  }

  assertAuthorityEvaluationPermitsRegistration(outcome: AuthorityEvaluationOutcome): void {
    if (outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Authority evaluation did not permit official civil registry registration',
      );
    }
  }

  assertAiCannotRegisterOrAmend(action: string, isAiActor: boolean): void {
    if (isAiActor && (FORBIDDEN_AI_CIVIL_REGISTRY_ACTIONS as readonly string[]).includes(action)) {
      throw new ForbiddenException('AI assistance cannot register or amend official vital events');
    }
  }

  assertHistoricalRegistryDeletionBlocked(): never {
    throw new ForbiddenException(
      'Historical civil registry entries and versions cannot be deleted; use amendment and supersession',
    );
  }

  assertCorrectionRequestIsNotApproval(status: CivilRecordCorrectionRequestStatus): void {
    if (status === CivilRecordCorrectionRequestStatus.APPROVED_FOR_AMENDMENT) {
      throw new BadRequestException(
        'Correction request approval must flow through review, authority, and amendment — not direct client approval',
      );
    }
  }

  assertCertificateReferencesAuthoritativeVersion(input: {
    civilRegistryVersionId?: string;
    currentVersionId?: string;
  }): void {
    if (!input.civilRegistryVersionId) {
      throw new BadRequestException(
        'Official certificate or extract must reference an authoritative civil registry version',
      );
    }

    if (input.currentVersionId && input.civilRegistryVersionId !== input.currentVersionId) {
      throw new BadRequestException(
        'Certificate extract must reference the authoritative current registry version unless issuing a historical certified copy through governed workflow',
      );
    }
  }
}

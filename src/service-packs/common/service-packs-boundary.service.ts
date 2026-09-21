import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ServicePackDeploymentStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import {
  FORBIDDEN_CLIENT_SERVICE_PACK_FIELDS,
  SERVICE_PACK_REASON_CODES,
} from '../service-packs.constants';

export interface DependencyControlInput {
  dependencyKind: string;
  controlScope: string;
}

@Injectable()
export class ServicePacksBoundaryService {
  rejectClientProtectedVersionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_SERVICE_PACK_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set "${field}"; service pack lifecycle is governed through institutional pathways`,
        );
      }
    }
  }

  assertAcceptedVersionImmutable(
    immutable: boolean,
    status: ServicePackVersionStatus,
  ): void {
    if (immutable || status === ServicePackVersionStatus.ACCEPTED) {
      throw new BadRequestException(SERVICE_PACK_REASON_CODES.ACCEPTED_VERSION_IMMUTABLE);
    }
  }

  assertNewVersionRequiredForModification(status: ServicePackVersionStatus): void {
    if (status === ServicePackVersionStatus.ACCEPTED) {
      throw new BadRequestException(SERVICE_PACK_REASON_CODES.NEW_VERSION_REQUIRED);
    }
  }

  assertValidationDoesNotActivateServices(
    requestedDeploymentStatus: ServicePackDeploymentStatus | undefined,
  ): void {
    if (
      requestedDeploymentStatus === ServicePackDeploymentStatus.ACTIVE ||
      requestedDeploymentStatus === ServicePackDeploymentStatus.DEPLOYED
    ) {
      throw new BadRequestException(SERVICE_PACK_REASON_CODES.VALIDATION_NOT_ACTIVATION);
    }
  }

  assertValidationDoesNotCreateDecisions(payload: Record<string, unknown>): void {
    const forbiddenDecisionFields = [
      'decisionId',
      'governmentDecisionId',
      'institutionalAcceptanceDecision',
      'approvalDecision',
    ];
    for (const field of forbiddenDecisionFields) {
      if (field in payload && payload[field] !== undefined) {
        throw new BadRequestException(SERVICE_PACK_REASON_CODES.VALIDATION_NOT_DECISION);
      }
    }
  }

  assertExternalDependencyNotFalselyControlled(input: DependencyControlInput): void {
    const externalKinds = [
      'EXTERNAL_AUTHORITY',
      'EXTERNAL_REGISTRY',
      'PAYMENT_PROVIDER',
      'IDENTITY_PROVIDER',
      'INTEGRATION',
      'PROFESSIONAL',
    ];
    if (
      input.controlScope === 'HEARTSTONE_CONTROLLED' &&
      externalKinds.includes(input.dependencyKind)
    ) {
      throw new BadRequestException(
        SERVICE_PACK_REASON_CODES.EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED,
      );
    }
  }

  assertManifestAuthorityNotAutoValid(payload: Record<string, unknown>): void {
    const forbiddenFields = ['isValid', 'authorityValid', 'automaticallyValid', 'autoValid'];
    for (const field of forbiddenFields) {
      if (field in payload && payload[field] === true) {
        throw new BadRequestException(SERVICE_PACK_REASON_CODES.AUTHORITY_AUTO_VALID_FORBIDDEN);
      }
    }
  }

  isManifestValidated(status: ServicePackManifestValidationStatus): boolean {
    return status === ServicePackManifestValidationStatus.VALIDATED;
  }
}

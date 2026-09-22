import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  ExternalDeterminationStatus,
  ImmigrationActorPersona,
  ImmigrationExternalCheckRecordedBy,
  ImmigrationExternalCheckType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ImmigrationBoundaryService } from '../common/immigration-boundary.service';
import { IMMIGRATION_EXTERNAL_CHECK_PREFIX } from '../immigration.constants';

export interface RecordImmigrationExternalCheckInput {
  caseId: string;
  immigrationProfileId?: string;
  externalAuthorityId: string;
  checkType: ImmigrationExternalCheckType;
  determinationStatus: ExternalDeterminationStatus;
  isRequired?: boolean;
  blocksDecisionWhenRequired?: boolean;
  isAuthenticated: boolean;
  authenticatedPayload?: Record<string, unknown>;
  recordedBy: ImmigrationExternalCheckRecordedBy;
  recordedByIdentityId?: string;
}

@Injectable()
export class ImmigrationExternalCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ImmigrationBoundaryService,
  ) {}

  async recordCheck(
    actorPersona: ImmigrationActorPersona,
    input: RecordImmigrationExternalCheckInput,
  ) {
    this.boundary.rejectApplicantForgedExternalCheck(
      {
        isAuthenticated: input.isAuthenticated,
        determinationStatus: input.determinationStatus,
        recordedBy: input.recordedBy,
      },
      actorPersona,
    );
    this.boundary.assertExternalCheckRecorderAllowed(input.recordedBy, actorPersona);

    const authenticatedPayloadHash = input.authenticatedPayload
      ? createHash('sha256').update(JSON.stringify(input.authenticatedPayload)).digest('hex')
      : undefined;

    this.boundary.assertAuthenticatedExternalResult({
      isAuthenticated: input.isAuthenticated,
      authenticatedPayloadHash,
    });

    const checkReference = `${IMMIGRATION_EXTERNAL_CHECK_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.immigrationExternalCheck.create({
      data: {
        id: randomUUID(),
        checkReference,
        caseId: input.caseId,
        immigrationProfileId: input.immigrationProfileId,
        externalAuthorityId: input.externalAuthorityId,
        checkType: input.checkType,
        determinationStatus: input.determinationStatus,
        isRequired: input.isRequired ?? true,
        blocksDecisionWhenRequired: input.blocksDecisionWhenRequired ?? true,
        isAuthenticated: input.isAuthenticated,
        authenticatedPayloadHash,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }

  async assertCaseReadyForDecision(caseId: string): Promise<void> {
    const checks = await this.prisma.immigrationExternalCheck.findMany({ where: { caseId } });
    this.boundary.assertUnresolvedExternalChecksAllowDecision(checks);
  }
}

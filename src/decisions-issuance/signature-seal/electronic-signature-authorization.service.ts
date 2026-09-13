import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssuranceLevel,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  type ElectronicSignatureAuthorization,
  ElectronicSignatureAuthorizationStatus,
} from '@prisma/client';

import { isEffectiveAt } from '../../authority/common/effective-period.util';
import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';

export interface CreateSignatureAuthorizationInput {
  signatoryIdentityId: string;
  officeholderId: string;
  institutionId: string;
  functionAuthorityRecordId: string;
  permittedInstrumentTypes: string[];
  permittedDecisionTypeVersion?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  requiredIdentityAssuranceLevel?: AssuranceLevel;
  requiresMfaAtSigning?: boolean;
  requiresWitness?: boolean;
  requiresCountersignature?: boolean;
  credentialReferenceId?: string;
}

@Injectable()
export class ElectronicSignatureAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createAuthorization(
    input: CreateSignatureAuthorizationInput,
  ): Promise<ElectronicSignatureAuthorization> {
    const authorityCheck = await this.authorityEvaluation.evaluate({
      identityId: input.signatoryIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.SIGN,
      officeholderId: input.officeholderId,
      at: input.effectiveFrom,
    });

    if (authorityCheck.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new BadRequestException('Signature authorization cannot exceed Phase 4 authority');
    }

    return this.prisma.electronicSignatureAuthorization.create({
      data: {
        signatoryIdentityId: input.signatoryIdentityId,
        officeholderId: input.officeholderId,
        institutionId: input.institutionId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        permittedInstrumentTypes: input.permittedInstrumentTypes,
        permittedDecisionTypeVersion: input.permittedDecisionTypeVersion,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        requiredIdentityAssuranceLevel:
          input.requiredIdentityAssuranceLevel ?? AssuranceLevel.MEDIUM,
        requiresMfaAtSigning: input.requiresMfaAtSigning ?? true,
        requiresWitness: input.requiresWitness ?? false,
        requiresCountersignature: input.requiresCountersignature ?? false,
        credentialReferenceId: input.credentialReferenceId,
        status: ElectronicSignatureAuthorizationStatus.ACTIVE,
      },
    });
  }

  async findActiveAuthorization(input: {
    signatoryIdentityId: string;
    officeholderId: string;
    functionAuthorityRecordId: string;
    instrumentType: string;
    at: Date;
  }): Promise<ElectronicSignatureAuthorization> {
    const authorizations = await this.prisma.electronicSignatureAuthorization.findMany({
      where: {
        signatoryIdentityId: input.signatoryIdentityId,
        officeholderId: input.officeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        status: ElectronicSignatureAuthorizationStatus.ACTIVE,
      },
    });

    const authorization = authorizations.find((item) => {
      if (
        !isEffectiveAt(
          { effectiveFrom: item.effectiveFrom, effectiveUntil: item.effectiveUntil },
          input.at,
        )
      ) {
        return false;
      }
      const permitted = item.permittedInstrumentTypes as string[];
      return permitted.includes(input.instrumentType);
    });

    if (!authorization) {
      throw new NotFoundException(
        'No active electronic signature authorization for instrument type',
      );
    }

    return authorization;
  }
}

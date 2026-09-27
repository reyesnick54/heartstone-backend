import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialDelegatedFunctionActivation,
  FinancialLicenceLifecycleStatus,
  FinancialServicesActorPersona,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialServicesAuthorityService } from '../common/financial-services-authority.service';
import { FinancialServicesBoundaryService } from '../common/financial-services-boundary.service';
import { FinancialExternalRegulatoryDependencyService } from '../external/financial-external-regulatory-dependency.service';
import { FINANCIAL_LICENCE_NUMBER_PREFIX } from '../financial-services.constants';

export interface IssueFinancialLicenceInput {
  regulatedEntityProfileId: string;
  licenceApplicationProfileId?: string;
  actorPersona: FinancialServicesActorPersona;
  issuerIdentityId: string;
  issuedByOfficeholderId: string;
  appointmentId?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
  authorityEvaluationRecordId?: string;
  functionAuthorityRecordId?: string;
  requiresDelegatedIssuance?: boolean;
  clientPayload?: Record<string, unknown>;
  aiAction?: string;
}

export interface RecordFinancialLicenceStatusInput {
  financialLicenceRecordId: string;
  toStatus: FinancialLicenceLifecycleStatus;
  actorPersona: FinancialServicesActorPersona;
  actorIdentityId?: string;
  reason?: string;
  governmentDecisionId?: string;
}

@Injectable()
export class FinancialLicenceRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
    private readonly authority: FinancialServicesAuthorityService,
    private readonly externalDependencies: FinancialExternalRegulatoryDependencyService,
  ) {}

  async issueLicence(input: IssueFinancialLicenceInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientForgedLicenceFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfIssueLicence(input.actorPersona);
    this.boundary.assertTechnicalAdminCannotIssueLicence(input.actorPersona);
    if (input.aiAction) {
      this.boundary.assertAiCannotIssueLicence(input.aiAction);
    }

    const profile = await this.prisma.financialRegulatedEntityProfile.findUnique({
      where: { id: input.regulatedEntityProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Financial regulated entity profile not found');
    }

    const applicationProfile = input.licenceApplicationProfileId
      ? await this.prisma.financialLicenceApplicationProfile.findUnique({
          where: { id: input.licenceApplicationProfileId },
        })
      : null;

    const requiresNational = applicationProfile?.requiresNationalDetermination ?? false;
    const awaitingExternal = await this.externalDependencies.countAwaitingExternal(
      input.regulatedEntityProfileId,
    );

    this.boundary.assertDelegatedFunctionActiveForIssuance(
      profile.delegatedLicenceFunctionActivation,
      input.requiresDelegatedIssuance ?? false,
    );

    await this.externalDependencies.assertLicenceDecisionAllowed(input.regulatedEntityProfileId);

    this.boundary.assertCannotSpoofNationalApprovalAsAbsez({
      requiresNationalDetermination: requiresNational,
      absezIssuanceAuthorized: Boolean(input.governmentDecisionId),
      externalResolved: awaitingExternal === 0,
    });

    await this.authority.assertLicenceIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    const licenceNumber = `${FINANCIAL_LICENCE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const absezAuthorized =
      profile.delegatedLicenceFunctionActivation === FinancialDelegatedFunctionActivation.ACTIVE &&
      !requiresNational &&
      Boolean(input.governmentDecisionId);

    const lifecycleStatus = input.governmentDecisionId
      ? FinancialLicenceLifecycleStatus.ISSUED
      : FinancialLicenceLifecycleStatus.PENDING_ISSUANCE;

    return this.prisma.financialLicenceRecord.create({
      data: {
        id: randomUUID(),
        licenceNumber,
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        licenceApplicationProfileId: input.licenceApplicationProfileId,
        lifecycleStatus,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        requiresNationalDetermination: requiresNational,
        absezIssuanceAuthorized: absezAuthorized,
      },
    });
  }

  async recordStatusTransition(input: RecordFinancialLicenceStatusInput) {
    this.boundary.assertTechnicalAdminCannotIssueLicence(input.actorPersona);

    const licence = await this.prisma.financialLicenceRecord.findUnique({
      where: { id: input.financialLicenceRecordId },
    });
    if (!licence) {
      throw new NotFoundException('Financial licence record not found');
    }

    const fromStatus = licence.lifecycleStatus;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.financialLicenceStatusHistory.create({
        data: {
          id: randomUUID(),
          financialLicenceRecordId: licence.id,
          fromStatus,
          toStatus: input.toStatus,
          actorIdentityId: input.actorIdentityId,
          actorPersona: input.actorPersona,
          reason: input.reason,
          governmentDecisionId: input.governmentDecisionId,
        },
      });

      return tx.financialLicenceRecord.update({
        where: { id: licence.id },
        data: {
          lifecycleStatus: input.toStatus,
          governmentDecisionId: input.governmentDecisionId ?? licence.governmentDecisionId,
        },
      });
    });
  }
}

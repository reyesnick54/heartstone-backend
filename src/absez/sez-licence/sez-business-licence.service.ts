import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AbsezZoneEnterpriseActorPersona,
  Prisma,
  SezBusinessLicenceLifecycleStatus,
  type SezBusinessLicenceRecord,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ABSEZ_SEZ_LICENCE_REFERENCE_PREFIX } from '../absez.constants';
import { AbsezBoundaryService } from '../common/absez-boundary.service';
import { ZoneEnterpriseService } from '../zone-enterprise/zone-enterprise.service';

export interface CreateSezLicenceIntakeInput {
  organizationId: string;
  institutionId: string;
  applicationId?: string;
  caseId?: string;
  actorIdentityId?: string;
  approvedActivityCategoryCodes?: string[];
}

export interface RecordSezLicencePaymentInput {
  sezBusinessLicenceId: string;
  paymentReference: string;
  amount: Prisma.Decimal | number;
  currencyCode: string;
  actorPersona: AbsezZoneEnterpriseActorPersona;
}

export interface IssueSezBusinessLicenceInput {
  sezBusinessLicenceId: string;
  governmentDecisionId: string;
  officialInstrumentId: string;
  actorIdentityId?: string;
  actorPersona: AbsezZoneEnterpriseActorPersona;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

export interface TransitionSezLicenceStatusInput {
  sezBusinessLicenceId: string;
  governmentDecisionId: string;
  actorIdentityId?: string;
  actorPersona: AbsezZoneEnterpriseActorPersona;
  summary: string;
  officialInstitutionId: string;
}

@Injectable()
export class SezBusinessLicenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: AbsezBoundaryService,
    private readonly zoneEnterpriseService: ZoneEnterpriseService,
  ) {}

  async createLicenceIntake(input: CreateSezLicenceIntakeInput): Promise<SezBusinessLicenceRecord> {
    const zoneEnterprise = await this.zoneEnterpriseService.ensureZoneEnterprise({
      organizationId: input.organizationId,
      institutionId: input.institutionId,
      approvedActivityCategoryCodes: input.approvedActivityCategoryCodes,
      actorIdentityId: input.actorIdentityId,
    });

    if (input.approvedActivityCategoryCodes?.length) {
      await this.prisma.absezZoneEnterprise.update({
        where: { id: zoneEnterprise.id },
        data: { approvedActivityCategoryCodes: input.approvedActivityCategoryCodes },
      });
    }

    await this.zoneEnterpriseService.markPendingLicence(zoneEnterprise.id, input.actorIdentityId);

    const licenceReference = `${ABSEZ_SEZ_LICENCE_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const licence = await this.prisma.sezBusinessLicenceRecord.create({
      data: {
        zoneEnterpriseId: zoneEnterprise.id,
        institutionId: input.institutionId,
        licenceReference,
        lifecycleStatus: SezBusinessLicenceLifecycleStatus.PENDING,
        applicationId: input.applicationId,
        caseId: input.caseId,
      },
    });

    await this.recordStatusHistory({
      sezBusinessLicenceId: licence.id,
      fromStatus: null,
      toStatus: SezBusinessLicenceLifecycleStatus.PENDING,
      summary: 'SEZ business licence intake recorded; awaits official decision',
      actorIdentityId: input.actorIdentityId,
    });

    return licence;
  }

  async recordPaymentReceived(input: RecordSezLicencePaymentInput): Promise<SezBusinessLicenceRecord> {
    this.boundary.assertPaymentDoesNotIssueLicence(input.actorPersona);

    const licence = await this.prisma.sezBusinessLicenceRecord.findUnique({
      where: { id: input.sezBusinessLicenceId },
    });
    if (!licence) {
      throw new NotFoundException('SEZ business licence record not found');
    }

    await this.prisma.sezBusinessLicencePaymentEvent.create({
      data: {
        sezBusinessLicenceId: licence.id,
        paymentReference: input.paymentReference,
        amount: input.amount,
        currencyCode: input.currencyCode,
        activatesLicence: false,
      },
    });

    await this.recordStatusHistory({
      sezBusinessLicenceId: licence.id,
      fromStatus: licence.lifecycleStatus,
      toStatus: licence.lifecycleStatus,
      summary: 'Payment received; licence activation requires authorized human decision',
    });

    return this.prisma.sezBusinessLicenceRecord.findUniqueOrThrow({
      where: { id: licence.id },
    });
  }

  async issueLicenceAfterDecision(input: IssueSezBusinessLicenceInput): Promise<SezBusinessLicenceRecord> {
    this.boundary.assertAiCannotIssueLicence(input.actorPersona);
    this.boundary.assertLicenceRequiresHumanDecision(input);

    const licence = await this.prisma.sezBusinessLicenceRecord.findUnique({
      where: { id: input.sezBusinessLicenceId },
      include: { zoneEnterprise: true },
    });
    if (!licence) {
      throw new NotFoundException('SEZ business licence record not found');
    }

    await this.boundary.assertAuthorityFunctionIsEffective(
      this.boundary.consequentialFunctionForIssue(),
      licence.institutionId,
    );

    this.boundary.assertLicenceLifecycleAllowsIssuance(licence.lifecycleStatus);

    const updated = await this.prisma.sezBusinessLicenceRecord.update({
      where: { id: licence.id },
      data: {
        lifecycleStatus: SezBusinessLicenceLifecycleStatus.ACTIVE,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        effectiveFrom: input.effectiveFrom ?? new Date(),
        effectiveUntil: input.effectiveUntil,
      },
    });

    await this.recordStatusHistory({
      sezBusinessLicenceId: licence.id,
      fromStatus: licence.lifecycleStatus,
      toStatus: SezBusinessLicenceLifecycleStatus.ACTIVE,
      summary: 'SEZ business licence issued following authorized decision and signed instrument',
      actorIdentityId: input.actorIdentityId,
      governmentDecisionId: input.governmentDecisionId,
    });

    await this.zoneEnterpriseService.activateLicensedEnterprise({
      zoneEnterpriseId: licence.zoneEnterpriseId,
      sezLicenceId: licence.id,
      actorIdentityId: input.actorIdentityId,
    });

    return updated;
  }

  async suspendLicence(input: TransitionSezLicenceStatusInput): Promise<SezBusinessLicenceRecord> {
    return this.transitionWithConsequentialAuthority(
      input,
      SezBusinessLicenceLifecycleStatus.SUSPENDED,
      this.boundary.consequentialFunctionForSuspend(),
    );
  }

  async revokeLicence(input: TransitionSezLicenceStatusInput): Promise<SezBusinessLicenceRecord> {
    return this.transitionWithConsequentialAuthority(
      input,
      SezBusinessLicenceLifecycleStatus.REVOKED,
      this.boundary.consequentialFunctionForRevoke(),
    );
  }

  private async transitionWithConsequentialAuthority(
    input: TransitionSezLicenceStatusInput,
    toStatus: SezBusinessLicenceLifecycleStatus,
    authorityFunctionCode: string,
  ): Promise<SezBusinessLicenceRecord> {
    this.boundary.assertAiCannotIssueLicence(input.actorPersona);
    this.boundary.assertSuspensionOrRevocationRequiresDecision(input.governmentDecisionId);

    const licence = await this.prisma.sezBusinessLicenceRecord.findUnique({
      where: { id: input.sezBusinessLicenceId },
    });
    if (!licence) {
      throw new NotFoundException('SEZ business licence record not found');
    }

    this.boundary.assertCrossInstitutionBlocked(input.officialInstitutionId, licence.institutionId);
    await this.boundary.assertAuthorityFunctionIsEffective(
      authorityFunctionCode,
      licence.institutionId,
    );

    const updated = await this.prisma.sezBusinessLicenceRecord.update({
      where: { id: licence.id },
      data: {
        lifecycleStatus: toStatus,
        governmentDecisionId: input.governmentDecisionId,
      },
    });

    await this.recordStatusHistory({
      sezBusinessLicenceId: licence.id,
      fromStatus: licence.lifecycleStatus,
      toStatus,
      summary: input.summary,
      actorIdentityId: input.actorIdentityId,
      governmentDecisionId: input.governmentDecisionId,
    });

    return updated;
  }

  private async recordStatusHistory(input: {
    sezBusinessLicenceId: string;
    fromStatus: SezBusinessLicenceLifecycleStatus | null;
    toStatus: SezBusinessLicenceLifecycleStatus;
    summary: string;
    actorIdentityId?: string;
    governmentDecisionId?: string;
  }) {
    await this.prisma.sezBusinessLicenceStatusHistory.create({
      data: {
        sezBusinessLicenceId: input.sezBusinessLicenceId,
        fromStatus: input.fromStatus ?? undefined,
        toStatus: input.toStatus,
        summary: input.summary,
        actorIdentityId: input.actorIdentityId,
        governmentDecisionId: input.governmentDecisionId,
      },
    });
  }
}

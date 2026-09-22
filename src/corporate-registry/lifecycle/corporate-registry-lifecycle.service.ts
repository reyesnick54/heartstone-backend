import { Injectable } from '@nestjs/common';
import {
  CorporateEntityType,
  CorporateRegistrationStatus,
  CorporateRegistryDecisionType,
  type CorporateRegistryProfile,
  CorporateRegistryRecordStatus,
  CorporateRegistryStatusEventType,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CorporateRegistryClientStatusForgeryException,
  CorporateRegistryDecisionRequiredException,
} from '../common/corporate-registry.exceptions';

export interface RecordCorporatePaymentInput {
  profileId: string;
  paymentReference: string;
  amount: Prisma.Decimal | number;
  currencyCode: string;
}

export interface ApplyOfficialRegistryDecisionInput {
  profileId: string;
  decisionType: CorporateRegistryDecisionType;
  approved: boolean;
  decidedByIdentityId?: string;
  caseId?: string;
  rationale?: string;
  registeredName?: string;
  registrationReference?: string;
  entityType?: CorporateEntityType;
}

@Injectable()
export class CorporateRegistryLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  assertClientCannotSetRegistrationStatus(): never {
    throw new CorporateRegistryClientStatusForgeryException();
  }

  async ensureProfileForOrganization(organizationId: string): Promise<CorporateRegistryProfile> {
    const existing = await this.prisma.corporateRegistryProfile.findUnique({
      where: { organizationId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.corporateRegistryProfile.create({
      data: {
        organizationId,
        registrationStatus: CorporateRegistrationStatus.DRAFT,
        recordApprovalStatus: CorporateRegistryRecordStatus.DRAFT,
      },
    });
  }

  async recordPaymentReceived(
    input: RecordCorporatePaymentInput,
  ): Promise<CorporateRegistryProfile> {
    const profile = await this.prisma.corporateRegistryProfile.findUnique({
      where: { id: input.profileId },
    });
    if (!profile) {
      throw new CorporateRegistryClientStatusForgeryException();
    }

    const priorStatus = profile.registrationStatus;

    await this.prisma.corporateRegistryPaymentEvent.create({
      data: {
        profileId: input.profileId,
        paymentReference: input.paymentReference,
        amount: input.amount,
        currencyCode: input.currencyCode,
        activatesEntity: false,
      },
    });

    await this.prisma.corporateRegistryStatusHistory.create({
      data: {
        profileId: input.profileId,
        eventType: CorporateRegistryStatusEventType.PAYMENT_RECEIVED,
        fromStatus: priorStatus,
        toStatus: priorStatus,
        summary: 'Payment received; entity activation requires official registry decision',
        preserved: true,
      },
    });

    return this.prisma.corporateRegistryProfile.findUniqueOrThrow({
      where: { id: input.profileId },
    });
  }

  async applyOfficialDecision(
    input: ApplyOfficialRegistryDecisionInput,
  ): Promise<CorporateRegistryProfile> {
    const profile = await this.prisma.corporateRegistryProfile.findUnique({
      where: { id: input.profileId },
    });
    if (!profile) {
      throw new CorporateRegistryDecisionRequiredException();
    }

    if (
      !input.approved &&
      (input.decisionType === CorporateRegistryDecisionType.INCORPORATION ||
        input.decisionType === CorporateRegistryDecisionType.REGISTRATION)
    ) {
      throw new CorporateRegistryDecisionRequiredException();
    }

    const decision = await this.prisma.corporateRegistryOfficialDecision.create({
      data: {
        profileId: input.profileId,
        decisionType: input.decisionType,
        approved: input.approved,
        decidedByIdentityId: input.decidedByIdentityId,
        caseId: input.caseId,
        rationale: input.rationale,
      },
    });

    let nextStatus = profile.registrationStatus;
    let nextRecordStatus = profile.recordApprovalStatus;
    let eventType: CorporateRegistryStatusEventType =
      CorporateRegistryStatusEventType.OFFICIAL_DECISION;
    let summary = `Official registry decision: ${input.decisionType}`;

    if (input.approved) {
      switch (input.decisionType) {
        case CorporateRegistryDecisionType.INCORPORATION:
        case CorporateRegistryDecisionType.REGISTRATION:
        case CorporateRegistryDecisionType.NAME_RESERVATION:
          nextStatus = CorporateRegistrationStatus.ACTIVE;
          nextRecordStatus = CorporateRegistryRecordStatus.APPROVED;
          summary = 'Registry decision approved; entity activated';
          break;
        case CorporateRegistryDecisionType.DISSOLUTION:
          nextStatus = CorporateRegistrationStatus.DISSOLVED;
          eventType = CorporateRegistryStatusEventType.DISSOLUTION;
          summary = 'Entity dissolved by official registry decision';
          break;
        case CorporateRegistryDecisionType.RESTORATION:
          nextStatus = CorporateRegistrationStatus.RESTORED;
          eventType = CorporateRegistryStatusEventType.RESTORATION;
          summary = 'Entity restored; dissolution history preserved';
          break;
        case CorporateRegistryDecisionType.RECORD_CORRECTION:
        case CorporateRegistryDecisionType.AMENDMENT:
          nextRecordStatus = CorporateRegistryRecordStatus.APPROVED;
          break;
        default:
          break;
      }
    }

    await this.prisma.corporateRegistryStatusHistory.create({
      data: {
        profileId: input.profileId,
        eventType,
        fromStatus: profile.registrationStatus,
        toStatus: nextStatus,
        summary,
        preserved: true,
        decisionId: decision.id,
      },
    });

    if (input.decisionType === CorporateRegistryDecisionType.RESTORATION && input.approved) {
      await this.prisma.corporateRegistryStatusHistory.create({
        data: {
          profileId: input.profileId,
          eventType: CorporateRegistryStatusEventType.DISSOLUTION,
          fromStatus: CorporateRegistrationStatus.DISSOLVED,
          toStatus: CorporateRegistrationStatus.DISSOLVED,
          summary: 'Historical dissolution record retained after restoration',
          preserved: true,
          decisionId: decision.id,
        },
      });
    }

    return this.prisma.corporateRegistryProfile.update({
      where: { id: input.profileId },
      data: {
        registrationStatus: nextStatus,
        recordApprovalStatus: nextRecordStatus,
        registeredName: input.registeredName ?? profile.registeredName,
        registrationReference: input.registrationReference ?? profile.registrationReference,
        entityType: input.entityType ?? profile.entityType,
        registrationDate:
          input.approved &&
          (input.decisionType === CorporateRegistryDecisionType.INCORPORATION ||
            input.decisionType === CorporateRegistryDecisionType.REGISTRATION)
            ? new Date()
            : profile.registrationDate,
        publicVerificationReference:
          profile.publicVerificationReference ??
          (input.registrationReference ? `CRV-${input.registrationReference}` : undefined),
      },
    });
  }

  async supersedeRegisteredOffice(profileId: string, addressLine1: string): Promise<void> {
    await this.prisma.corporateRegisteredOffice.updateMany({
      where: { profileId, isCurrent: true },
      data: {
        isCurrent: false,
        recordStatus: CorporateRegistryRecordStatus.SUPERSEDED,
        supersededAt: new Date(),
      },
    });

    await this.prisma.corporateRegisteredOffice.create({
      data: {
        profileId,
        addressLine1,
        recordStatus: CorporateRegistryRecordStatus.APPROVED,
        isCurrent: true,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  PropertyInterestKind,
  PropertyInterestStatus,
  PropertyRegistryApplicationStatus,
  PropertyRegistryApplicationType,
  PropertyTransferDecisionOutcome,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyTransferDecisionRequiredException } from '../common/property-registry.exceptions';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';

export interface SubmitTransferApplicationInput {
  parcelId: string;
  applicantIdentityId: string;
  organizationId?: string;
}

export interface RegisterTransferAfterDecisionInput {
  applicationId: string;
  newOwnerIdentityId: string;
  decidedByIdentityId: string;
}

@Injectable()
export class PropertyTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryBoundaryService,
  ) {}

  async submitTransferApplication(input: SubmitTransferApplicationInput) {
    this.boundary.assertApplicationCannotMutateTitle(false);

    const reference = `PROP-APP-TR-${String(Date.now())}`;
    return this.prisma.propertyRegistryApplication.create({
      data: {
        parcelId: input.parcelId,
        applicationType: PropertyRegistryApplicationType.TRANSFER,
        status: PropertyRegistryApplicationStatus.SUBMITTED,
        applicantIdentityId: input.applicantIdentityId,
        organizationId: input.organizationId,
        applicationReference: reference,
        mayMutateTitle: false,
        submittedAt: new Date(),
      },
    });
  }

  async registerTransferAfterDecision(input: RegisterTransferAfterDecisionInput) {
    const application = await this.prisma.propertyRegistryApplication.findUnique({
      where: { id: input.applicationId },
      include: { transferDecision: true, parcel: true },
    });

    if (
      application?.applicationType !== PropertyRegistryApplicationType.TRANSFER ||
      !application.parcelId ||
      !application.parcel
    ) {
      throw new PropertyTransferDecisionRequiredException();
    }

    this.boundary.assertTransferDecisionRequired(
      application.transferDecision?.outcome === PropertyTransferDecisionOutcome.APPROVED,
    );

    const parcel = application.parcel;
    const priorOwner = await this.prisma.propertyInterest.findFirst({
      where: {
        parcelId: parcel.id,
        interestKind: PropertyInterestKind.OWNER,
        status: PropertyInterestStatus.ACTIVE,
      },
    });

    const nextVersion = parcel.registryVersion + 1;

    return this.prisma.$transaction(async (tx) => {
      let supersededInterestId: string | undefined;
      if (priorOwner) {
        const superseded = await tx.propertyInterest.update({
          where: { id: priorOwner.id },
          data: {
            status: PropertyInterestStatus.SUPERSEDED,
            effectiveUntil: new Date(),
          },
        });
        supersededInterestId = superseded.id;
      }

      const newInterest = await tx.propertyInterest.create({
        data: {
          parcelId: parcel.id,
          interestKind: PropertyInterestKind.OWNER,
          status: PropertyInterestStatus.ACTIVE,
          identityId: input.newOwnerIdentityId,
          effectiveFrom: new Date(),
        },
      });

      if (supersededInterestId) {
        await tx.propertyInterest.update({
          where: { id: supersededInterestId },
          data: { supersededByInterestId: newInterest.id },
        });
      }

      await tx.propertyOwnershipHistory.create({
        data: {
          parcelId: parcel.id,
          fromInterestId: supersededInterestId,
          toInterestId: newInterest.id,
          eventSummary: 'Transfer registered after authorized decision',
          registryVersion: nextVersion,
          preserved: true,
          transferDecisionId: application.transferDecision?.id,
        },
      });

      await tx.propertyParcel.update({
        where: { id: parcel.id },
        data: { registryVersion: nextVersion },
      });

      await tx.propertyInterestEntitlement.upsert({
        where: {
          parcelId_identityId_entitlementKind: {
            parcelId: parcel.id,
            identityId: input.newOwnerIdentityId,
            entitlementKind: PropertyInterestKind.OWNER,
          },
        },
        create: {
          parcelId: parcel.id,
          identityId: input.newOwnerIdentityId,
          entitlementKind: PropertyInterestKind.OWNER,
        },
        update: {},
      });

      return newInterest;
    });
  }

  async recordTransferDecision(input: {
    applicationId: string;
    outcome: PropertyTransferDecisionOutcome;
    decidedByIdentityId: string;
    rationale?: string;
  }) {
    return this.prisma.propertyTransferDecision.create({
      data: {
        applicationId: input.applicationId,
        outcome: input.outcome,
        decidedByIdentityId: input.decidedByIdentityId,
        rationale: input.rationale,
      },
    });
  }
}

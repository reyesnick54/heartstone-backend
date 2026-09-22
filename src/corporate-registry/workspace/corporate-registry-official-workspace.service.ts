import { Injectable } from '@nestjs/common';
import {
  CorporateCertificateStatus,
  CorporateFilingStatus,
  CorporateRegistrationStatus,
  CorporateRegistryActionStatus,
  CorporateRegistryActionType,
  CorporateRegistryRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CorporateRegistryOfficialWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRegistryOfficerWorkspace() {
    const now = new Date();
    const slaHorizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      nameReservationQueue,
      incorporationQueue,
      amendmentQueue,
      annualFilingIssues,
      beneficialOwnershipReview,
      dissolutionRestoration,
      certificateIssuance,
      suspectedInconsistencies,
      slaRisks,
    ] = await Promise.all([
      this.prisma.corporateRegistryAction.findMany({
        where: {
          actionType: CorporateRegistryActionType.NAME_RESERVATION,
          status: {
            in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
          },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateRegistryAction.findMany({
        where: {
          actionType: CorporateRegistryActionType.INCORPORATION,
          status: {
            in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
          },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateRegistryAction.findMany({
        where: {
          actionType: CorporateRegistryActionType.AMENDMENT,
          status: {
            in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
          },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateFiling.findMany({
        where: {
          status: { in: [CorporateFilingStatus.OVERDUE, CorporateFilingStatus.UNDER_REVIEW] },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateBeneficialOwnershipDeclaration.findMany({
        where: { recordApprovalStatus: CorporateRegistryRecordStatus.PENDING_REVIEW },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateRegistryAction.findMany({
        where: {
          actionType: {
            in: [CorporateRegistryActionType.DISSOLUTION, CorporateRegistryActionType.RESTORATION],
          },
          status: {
            in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
          },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateCertificate.findMany({
        where: {
          status: {
            in: [CorporateCertificateStatus.PENDING_ISSUANCE, CorporateCertificateStatus.DRAFT],
          },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
      this.prisma.corporateRegistryProfile.findMany({
        where: {
          OR: [
            { recordApprovalStatus: CorporateRegistryRecordStatus.PENDING_REVIEW },
            { registrationStatus: CorporateRegistrationStatus.PENDING_DECISION },
          ],
        },
        take: 25,
      }),
      this.prisma.corporateRegistryAction.findMany({
        where: {
          status: {
            in: [CorporateRegistryActionStatus.OPEN, CorporateRegistryActionStatus.IN_PROGRESS],
          },
          dueDate: { lte: slaHorizon },
        },
        take: 25,
        include: { profile: { select: { registeredName: true, registrationReference: true } } },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      nameReservationQueue,
      incorporationQueue,
      amendmentQueue,
      annualFilingIssues,
      beneficialOwnershipReview,
      dissolutionRestoration,
      certificateIssuance,
      suspectedInconsistencies,
      slaRisks,
      assignmentDoesNotImplyAuthority: true as const,
    };
  }
}

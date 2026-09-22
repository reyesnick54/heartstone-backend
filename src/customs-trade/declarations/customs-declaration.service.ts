import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomsDeclarationStatus,
  CustomsDeclarationType,
  CustomsDeclarationVersionStatus,
  CustomsStatusSubjectKind,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsDeclarationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async submitDeclaration(input: {
    traderAccountId: string;
    declarationType: CustomsDeclarationType;
    shipmentReferenceId?: string;
    submissionPayload?: Record<string, unknown>;
  }) {
    const declarationNumber = `CD-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const declaration = await tx.customsDeclaration.create({
        data: {
          declarationNumber,
          traderAccountId: input.traderAccountId,
          shipmentReferenceId: input.shipmentReferenceId,
          declarationType: input.declarationType,
          status: CustomsDeclarationStatus.SUBMITTED,
          doesNotReleaseCargo: true,
          submittedAt: new Date(),
        },
      });

      const version = await tx.customsDeclarationVersion.create({
        data: {
          customsDeclarationId: declaration.id,
          versionNumber: 1,
          status: CustomsDeclarationVersionStatus.LOCKED,
          submissionPayload: (input.submissionPayload ?? {}) as Prisma.InputJsonValue,
          submittedAt: new Date(),
          lockedAt: new Date(),
        },
      });

      await tx.customsDeclaration.update({
        where: { id: declaration.id },
        data: { currentVersionId: version.id },
      });

      await tx.customsStatusHistory.create({
        data: {
          subjectKind: CustomsStatusSubjectKind.DECLARATION,
          customsDeclarationId: declaration.id,
          toStatusCode: CustomsDeclarationStatus.SUBMITTED,
          reasonSummary: 'Declaration submitted; cargo not released',
        },
      });

      return { declaration, version };
    });

    this.boundary.assertDeclarationSubmissionDoesNotReleaseCargo(result.declaration.doesNotReleaseCargo);

    return {
      declaration: result.declaration,
      version: result.version,
      cargoReleased: false,
    };
  }

  async amendDeclaration(input: {
    customsDeclarationId: string;
    submissionPayload?: Record<string, unknown>;
  }) {
    const existing = await this.prisma.customsDeclaration.findUnique({
      where: { id: input.customsDeclarationId },
      include: { currentVersion: true },
    });
    if (!existing?.currentVersion) {
      throw new NotFoundException('Declaration not found');
    }

    const priorVersion = existing.currentVersion;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.customsDeclarationVersion.update({
        where: { id: priorVersion.id },
        data: { status: CustomsDeclarationVersionStatus.SUPERSEDED },
      });

      const nextVersionNumber = priorVersion.versionNumber + 1;
      const version = await tx.customsDeclarationVersion.create({
        data: {
          customsDeclarationId: existing.id,
          versionNumber: nextVersionNumber,
          status: CustomsDeclarationVersionStatus.LOCKED,
          submissionPayload: (input.submissionPayload ?? {}) as Prisma.InputJsonValue,
          submittedAt: new Date(),
          lockedAt: new Date(),
          supersedesVersionId: priorVersion.id,
        },
      });

      await tx.customsDeclaration.update({
        where: { id: existing.id },
        data: { currentVersionId: version.id },
      });

      return { priorVersion, version };
    });

    return {
      priorVersionId: result.priorVersion.id,
      priorVersionNumber: result.priorVersion.versionNumber,
      newVersion: result.version,
      priorVersionPreserved: true,
    };
  }
}

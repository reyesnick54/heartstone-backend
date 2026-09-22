import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomsDeclarationStatus, Prisma, TradeShipmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsDeclarationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async submitInitialVersion(input: {
    customsDeclarationId: string;
    declarationData: Record<string, unknown>;
    submittedByIdentityId: string;
  }) {
    this.boundary.rejectClientDeclarationFields(input.declarationData);

    const declaration = await this.prisma.customsDeclaration.findUnique({
      where: { id: input.customsDeclarationId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!declaration) {
      throw new NotFoundException('Declaration not found');
    }

    const nextVersion = (declaration.versions[0]?.versionNumber ?? 0) + 1;
    const now = new Date();

    const version = await this.prisma.customsDeclarationVersion.create({
      data: {
        customsDeclarationId: declaration.id,
        versionNumber: nextVersion,
        declarationData: input.declarationData as Prisma.InputJsonValue,
        submittedByIdentityId: input.submittedByIdentityId,
        submittedAt: now,
        lockedAt: now,
        isAmendment: false,
      },
    });

    await this.prisma.customsDeclaration.update({
      where: { id: declaration.id },
      data: {
        currentVersionId: version.id,
        status: CustomsDeclarationStatus.SUBMITTED,
      },
    });

    await this.prisma.tradeShipment.update({
      where: { id: declaration.shipmentId },
      data: { status: TradeShipmentStatus.ACTIVE },
    });

    this.boundary.assertDeclarationSubmissionDoesNotRelease();

    return {
      version,
      cargoReleased: false,
    };
  }

  async amendDeclaration(input: {
    customsDeclarationId: string;
    declarationData: Record<string, unknown>;
    submittedByIdentityId: string;
  }) {
    this.boundary.rejectClientDeclarationFields(input.declarationData);

    const declaration = await this.prisma.customsDeclaration.findUnique({
      where: { id: input.customsDeclarationId },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!declaration?.currentVersion) {
      throw new NotFoundException('Declaration not found');
    }

    const priorVersion = declaration.currentVersion;
    const nextVersion = (declaration.versions[0]?.versionNumber ?? 0) + 1;
    const now = new Date();

    const version = await this.prisma.customsDeclarationVersion.create({
      data: {
        customsDeclarationId: declaration.id,
        versionNumber: nextVersion,
        declarationData: input.declarationData as Prisma.InputJsonValue,
        submittedByIdentityId: input.submittedByIdentityId,
        submittedAt: now,
        lockedAt: now,
        isAmendment: true,
        supersedesVersionId: priorVersion.id,
      },
    });

    await this.prisma.customsDeclaration.update({
      where: { id: declaration.id },
      data: {
        currentVersionId: version.id,
        status: CustomsDeclarationStatus.ACCEPTED,
      },
    });

    return {
      version,
      previousVersionId: priorVersion.id,
      previousVersionNumber: priorVersion.versionNumber,
    };
  }

  async attemptDestructiveEdit(versionId: string, payload: Record<string, unknown>) {
    const version = await this.prisma.customsDeclarationVersion.findUnique({
      where: { id: versionId },
    });
    this.boundary.assertSubmittedDeclarationVersionImmutable(version?.lockedAt);
    return this.prisma.customsDeclarationVersion.update({
      where: { id: versionId },
      data: { declarationData: payload as Prisma.InputJsonValue },
    });
  }
}

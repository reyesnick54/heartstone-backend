import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { CLINICAL_RESEARCH_REASON_CODES } from '../clinical-research.constants';

@Injectable()
export class ClinicalTrialProtocolVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async activateProtocolVersion(protocolVersionId: string) {
    const version = await this.prisma.clinicalTrialProtocolVersion.findUnique({
      where: { id: protocolVersionId },
      include: { protocol: true },
    });
    if (!version) {
      throw new NotFoundException('Protocol version not found');
    }
    if (version.isImmutable) {
      throw new BadRequestException({
        message: 'Activated protocol versions are immutable',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.PROTOCOL_VERSION_IMMUTABLE,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.clinicalTrialProtocolVersion.updateMany({
        where: { protocolId: version.protocolId, isActive: true },
        data: { isActive: false },
      });

      const activated = await tx.clinicalTrialProtocolVersion.update({
        where: { id: protocolVersionId },
        data: {
          isActive: true,
          isImmutable: true,
          activatedAt: new Date(),
        },
      });

      await tx.clinicalTrial.update({
        where: { id: version.protocol.clinicalTrialId },
        data: { currentProtocolVersionId: activated.id },
      });

      return activated;
    });
  }

  async createAmendmentVersion(input: { protocolId: string; amendmentSummary: string }) {
    const protocol = await this.prisma.clinicalTrialProtocol.findUnique({
      where: { id: input.protocolId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!protocol) {
      throw new NotFoundException('Protocol not found');
    }

    const latest = protocol.versions[0];
    if (latest && !latest.isImmutable) {
      throw new BadRequestException(
        'Activate the current protocol version before creating an amendment',
      );
    }

    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

    return this.prisma.clinicalTrialProtocolVersion.create({
      data: {
        protocolId: input.protocolId,
        versionNumber: nextVersionNumber,
        amendmentSummary: input.amendmentSummary,
        isActive: false,
        isImmutable: false,
      },
    });
  }

  async assertProtocolVersionMutable(protocolVersionId: string): Promise<void> {
    const version = await this.prisma.clinicalTrialProtocolVersion.findUnique({
      where: { id: protocolVersionId },
    });
    if (!version) {
      throw new NotFoundException('Protocol version not found');
    }
    if (version.isImmutable) {
      throw new BadRequestException({
        message: 'Protocol versions are immutable after activation; create a new amendment version',
        reasonCode: CLINICAL_RESEARCH_REASON_CODES.PROTOCOL_VERSION_IMMUTABLE,
      });
    }
  }
}

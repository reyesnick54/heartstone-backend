import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAuditService } from '../audit/civil-registry-audit.service';
import { CERTIFICATE_EXTRACT_REFERENCE_PREFIX } from '../civil-registry.constants';
import { CivilRegistryBoundaryService } from '../common/civil-registry-boundary.service';
import { buildCivilReference } from '../common/civil-registry-reference.util';

export interface IssueCertificateExtractInput {
  civilRegistryEntryId: string;
  civilRegistryVersionId: string;
  officialInstrumentId?: string;
  issuanceEventId?: string;
  isAiActor?: boolean;
}

@Injectable()
export class CivilRegistryCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CivilRegistryBoundaryService,
    private readonly audit: CivilRegistryAuditService,
  ) {}

  async issueExtract(actorIdentityId: string, input: IssueCertificateExtractInput) {
    this.boundary.assertAiCannotRegisterOrAmend(
      'ISSUE_CERTIFICATE_EXTRACT',
      Boolean(input.isAiActor),
    );

    const entry = await this.prisma.civilRegistryEntry.findUnique({
      where: { id: input.civilRegistryEntryId },
      include: {
        versions: { where: { isCurrent: true }, take: 1 },
      },
    });

    if (!entry) {
      throw new BadRequestException('Civil registry entry not found');
    }

    const currentVersion = entry.versions[0];
    this.boundary.assertCertificateReferencesAuthoritativeVersion({
      civilRegistryVersionId: input.civilRegistryVersionId,
      currentVersionId: currentVersion?.id,
    });

    const version = await this.prisma.civilRegistryVersion.findUnique({
      where: { id: input.civilRegistryVersionId },
    });

    if (version?.civilRegistryEntryId !== entry.id) {
      throw new BadRequestException('Registry version does not belong to entry');
    }

    const extractReference = buildCivilReference(CERTIFICATE_EXTRACT_REFERENCE_PREFIX);

    const extract = await this.prisma.civilRegistryCertificateExtract.create({
      data: {
        extractReference,
        civilRegistryEntryId: entry.id,
        civilRegistryVersionId: version.id,
        officialInstrumentId: input.officialInstrumentId,
        issuanceEventId: input.issuanceEventId,
      },
    });

    await this.audit.record({
      civilRegistryEntryId: entry.id,
      eventType: 'CERTIFICATE_ISSUED',
      actorIdentityId,
      metadata: {
        extractReference,
        civilRegistryVersionId: version.id,
        versionNumber: version.versionNumber,
      },
    });

    return extract;
  }
}

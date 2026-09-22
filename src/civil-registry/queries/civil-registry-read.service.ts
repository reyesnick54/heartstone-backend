import { Injectable, NotFoundException } from '@nestjs/common';
import { CivilRegistryAccessClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryClassificationAccessService } from '../common/civil-registry-access.service';

@Injectable()
export class CivilRegistryReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CivilRegistryClassificationAccessService,
  ) {}

  async getEntryForActor(
    actorIdentityId: string,
    entryId: string,
    options?: { isAuthorizedGovernmentActor?: boolean },
  ) {
    const entry = await this.prisma.civilRegistryEntry.findUnique({
      where: { id: entryId },
      include: {
        versions: { where: { isCurrent: true }, take: 1 },
        restrictions: true,
        civilPersonRecord: { include: { person: { include: { identities: true } } } },
      },
    });

    if (!entry) {
      throw new NotFoundException('Civil registry entry not found');
    }

    const effectiveClassification = this.access.resolveEffectiveClassification({
      entryClassification: entry.accessClassification,
      restrictions: entry.restrictions.map((item) => item.accessClassification),
    });

    const linkedIdentity = entry.civilPersonRecord?.person?.identities.find(
      (identity) => identity.id === actorIdentityId,
    );

    const payload = {
      id: entry.id,
      entryReference: entry.entryReference,
      status: entry.status,
      accessClassification: effectiveClassification,
      registeredAt: entry.registeredAt,
      verificationState: entry.versions[0]?.payloadSnapshot,
      currentVersionNumber: entry.currentVersionNumber,
    };

    return this.access.maskOrThrow(
      {
        actorIdentityId,
        linkedSubjectIdentityId: linkedIdentity?.id ?? null,
        isAuthorizedGovernmentActor: options?.isAuthorizedGovernmentActor,
        accessClassification: effectiveClassification,
      },
      payload,
    );
  }

  isExposureAllowed(classification: CivilRegistryAccessClassification): boolean {
    return classification !== CivilRegistryAccessClassification.SEALED;
  }
}

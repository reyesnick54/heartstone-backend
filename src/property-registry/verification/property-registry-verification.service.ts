import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyRegistryAccessClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryClassificationAccessService } from '../common/property-registry-access.service';

@Injectable()
export class PropertyRegistryVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PropertyRegistryClassificationAccessService,
  ) {}

  async verifyPublic(publicVerificationCode: string) {
    const verification = await this.prisma.propertyRegistryVerification.findUnique({
      where: { publicVerificationCode },
      include: {
        propertyRegistryEntry: {
          include: {
            titleRecord: true,
            restrictions: true,
          },
        },
      },
    });

    if (!verification?.propertyRegistryEntry) {
      throw new NotFoundException('Verification code not found');
    }

    const entry = verification.propertyRegistryEntry;
    const effectiveClassification = this.access.resolveEffectiveClassification({
      entryClassification: entry.accessClassification,
      restrictions: entry.restrictions.map((r) => r.accessClassification),
    });

    return this.access.assertPublicVerificationOnlyPayload({
      entryReference: entry.entryReference,
      verificationState: verification.verificationState,
      registeredAt: entry.registeredAt,
      titleReference: entry.titleRecord.titleReference,
      accessClassification: effectiveClassification,
      restrictedPayload: { withheld: effectiveClassification === PropertyRegistryAccessClassification.SEALED },
    });
  }
}

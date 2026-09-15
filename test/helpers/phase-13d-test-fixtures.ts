import { type INestApplication } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';

export interface Phase13DFixture {
  jurisdictionId: string;
  institutionId: string;
  identityId: string;
}

export async function seedPhase13DFixture(
  _app: INestApplication,
  prisma: PrismaService,
): Promise<Phase13DFixture> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: 'AG',
      name: 'Antigua and Barbuda',
      type: 'NATIONAL',
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: 'ABSEZ',
      name: 'Antigua Barbuda Special Economic Zone Authority',
      type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
    },
  });

  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Phase 13D Continuity Officer',
    },
  });

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    identityId: identity.id,
  };
}

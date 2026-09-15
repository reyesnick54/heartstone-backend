import { type INestApplication } from '@nestjs/common';
import { IdentityType } from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { LAUNCH_GATE_REQUIREMENTS } from '../../src/production-readiness/production-readiness.constants';
import { type Phase11FixtureContext, seedPhase11Fixture } from './phase-11-test-fixtures';

export const PHASE_13_FIXTURE_MARKER = 'PHASE_13_PRODUCTION_READINESS';

export interface Phase13FixtureContext extends Phase11FixtureContext {
  operatorIdentityId: string;
  accountableOwnerIdentityId: string;
  releaseCommit: string;
  artifactDigest: string;
}

export function buildPassedGateRequirements(): Record<string, boolean> {
  return Object.fromEntries(LAUNCH_GATE_REQUIREMENTS.map((key) => [key, true]));
}

export async function seedPhase13Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase13FixtureContext> {
  const phase11 = await seedPhase11Fixture(app, prisma);

  const operator = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: `${PHASE_13_FIXTURE_MARKER} Operator`,
    },
  });

  const accountableOwner = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: `${PHASE_13_FIXTURE_MARKER} Accountable Owner`,
    },
  });

  return {
    ...phase11,
    operatorIdentityId: operator.id,
    accountableOwnerIdentityId: accountableOwner.id,
    releaseCommit: 'e9a4082phase13accepted',
    artifactDigest: 'sha256:phase13acceptedartifactdigest00000000000000000000000000000000',
  };
}

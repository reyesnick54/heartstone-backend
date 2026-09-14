import { type INestApplication } from '@nestjs/common';
import { ComplianceReviewOutcome, OfficialInstrumentStatus } from '@prisma/client';
import { type App } from 'supertest/types';

import { ComplianceBoundaryService } from '../src/compliance/common/compliance-boundary.service';
import {
  FORBIDDEN_CLIENT_COMPLIANCE_FIELDS,
  PHASE_9_BOUNDARY_DISCLAIMER,
  PHASE_9H_INVARIANTS,
} from '../src/compliance/compliance.constants';
import { type PrismaService } from '../src/database/prisma.service';
import { CorrectiveActionService } from '../src/inspection-compliance/corrective-action/corrective-action.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;
  let correctiveActionService: CorrectiveActionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
    correctiveActionService = app.get(CorrectiveActionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defines exactly 50 Phase 9H invariants', () => {
    expect(PHASE_9H_INVARIANTS).toHaveLength(50);
    expect(new Set(PHASE_9H_INVARIANTS.map((item) => item.id)).size).toBe(50);
  });

  it('documents Phase 9 boundary disclaimer', () => {
    expect(PHASE_9_BOUNDARY_DISCLAIMER).toMatch(/does not create suspension decisions/i);
    expect(FORBIDDEN_CLIENT_COMPLIANCE_FIELDS.length).toBeGreaterThan(0);
  });

  it('blocks protected client compliance fields', async () => {
    await seedPhase9Fixture(app, prisma);

    for (const field of FORBIDDEN_CLIENT_COMPLIANCE_FIELDS) {
      expect(() => {
        boundary.assertClientPayloadDoesNotSetProtectedFields({ [field]: true });
      }).toThrow(/protected compliance field/i);
    }
  });

  it('blocks Phase 9 suspension decision creation', () => {
    expect(() => {
      boundary.assertPhase9CannotCreateSuspensionDecision({ isCreatingSuspensionDecision: true });
    }).toThrow(/cannot create suspension/i);
  });

  it('blocks Phase 9 instrument status patch', () => {
    expect(() => {
      boundary.assertPhase9CannotPatchInstrumentStatus({
        status: OfficialInstrumentStatus.SUSPENDED,
      });
    }).toThrow(/cannot PATCH official instrument/i);
  });

  it('requires explicit satisfaction semantics for review outcomes', () => {
    expect(
      boundary.assertReviewOutcomeRequiresExplicitSatisfaction(
        ComplianceReviewOutcome.OBLIGATION_SATISFIED,
      ),
    ).toBe(true);
    expect(correctiveActionService).toBeDefined();
  });
});

import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityActionType,
  AuthorityClassification,
  AuthorityEvaluationOutcome,
} from '@prisma/client';

import { resetAllTestData } from '../../../test/helpers/integration-app';
import appConfig from '../../config/app.config';
import identityConfig from '../../config/identity.config';
import redisConfig from '../../config/redis.config';
import securityConfig from '../../config/security.config';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_FIXTURE_MARKER } from '../authority.constants';
import { AuthorityModule } from '../authority.module';
import { Phase4TestFixtures } from '../fixtures/phase-4-test-fixtures';
import { FunctionActivationService } from '../function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../governing-sources/governing-sources.service';
import { AuthorityEvaluationService } from './authority-evaluation.service';

describe('AuthorityEvaluationService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let evaluation: AuthorityEvaluationService;
  let fixtures: Phase4TestFixtures;
  let ctx: Awaited<ReturnType<Phase4TestFixtures['seedStructuralContext']>>;
  let classificationFixtures: Awaited<ReturnType<Phase4TestFixtures['seedEightClassifications']>>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        AuthorityModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    evaluation = moduleRef.get(AuthorityEvaluationService);
    fixtures = new Phase4TestFixtures(
      prisma,
      moduleRef.get(GoverningSourcesService),
      moduleRef.get(FunctionAuthorityRecordsService),
      moduleRef.get(FunctionActivationService),
    );
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);

    ctx = await fixtures.seedStructuralContext();
    classificationFixtures = await fixtures.seedEightClassifications(ctx);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  function fixtureFor(classification: AuthorityClassification) {
    const fixture = classificationFixtures.find((item) => item.classification === classification);
    if (!fixture) {
      throw new Error(`Missing fixture for ${classification}`);
    }
    return fixture;
  }

  it('allows positive E2E path for ABSEZ_OWNED', async () => {
    const owned = fixtureFor(AuthorityClassification.ABSEZ_OWNED);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: owned.functionId,
      action: AuthorityActionType.DECIDE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(result.explanationCodes).toContain('ALLOW');
  });

  it('denies PROHIBITED_OR_UNAUTHORIZED functions', async () => {
    const prohibited = fixtureFor(AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: prohibited.functionId,
      action: AuthorityActionType.DECIDE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.DENY);
    expect(result.explanationCodes).toContain('PROHIBITED_FUNCTION');
  });

  it('requires external determination for retained national without competent determination', async () => {
    const retained = fixtureFor(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: retained.functionId,
      action: AuthorityActionType.DECIDE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION);
  });

  it('requires delegation for ABSEZ_DELEGATED when delegation missing', async () => {
    const delegated = fixtureFor(AuthorityClassification.ABSEZ_DELEGATED);
    await prisma.delegationStructuredScope.deleteMany();
    await prisma.delegation.deleteMany();

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: delegated.functionId,
      action: AuthorityActionType.APPROVE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.DENY);
    expect(result.explanationCodes).toContain('MISSING_DELEGATION');
  });

  it('allows ABSEZ_DELEGATED with valid delegation', async () => {
    const delegated = fixtureFor(AuthorityClassification.ABSEZ_DELEGATED);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: delegated.functionId,
      action: AuthorityActionType.APPROVE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
      delegationId: ctx.delegationId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
  });

  it('marks technology-assisted DECIDE as denied for human-only rights', async () => {
    const tech = fixtureFor(AuthorityClassification.TECHNOLOGY_ASSISTED);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: tech.functionId,
      action: AuthorityActionType.DECIDE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.DENY);
  });

  it('creates immutable evaluation records', async () => {
    const owned = fixtureFor(AuthorityClassification.ABSEZ_OWNED);

    const result = await evaluation.evaluate({
      identityId: ctx.identityId,
      functionAuthorityRecordId: owned.functionId,
      action: AuthorityActionType.DECIDE,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    });

    const record = await evaluation.getEvaluationRecord(result.evaluationId);
    expect(record.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(record.contextSnapshot).toBeTruthy();
  });

  it('seeds eight NON_PRODUCTION classification fixtures', () => {
    expect(classificationFixtures).toHaveLength(8);
    expect(
      classificationFixtures.every((item) => item.marker === NON_PRODUCTION_FIXTURE_MARKER),
    ).toBe(true);
  });
});

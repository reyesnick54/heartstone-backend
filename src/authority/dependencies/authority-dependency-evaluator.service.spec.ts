import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityClassification,
  AuthorityDependencyBlockingStatus,
  AuthorityDependencyType,
  ControlledFunctionClass,
  ExternalAuthorityType,
  ExternalDeterminationStatus,
  FunctionAuthorityLifecycleStatus,
  IdentityType,
  InstitutionalActType,
  JurisdictionType,
  ProfessionalAttestationSource,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { resetAuthorityData } from '../../../test/helpers/authority-test-reset';
import { resetGovernmentData } from '../../../test/helpers/integration-app';
import appConfig from '../../config/app.config';
import redisConfig from '../../config/redis.config';
import securityConfig from '../../config/security.config';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { AuthorityModule } from '../authority.module';
import { FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';
import { AuthorityDependenciesService } from './authority-dependencies.service';
import { AuthorityDependencyEvaluator } from './authority-dependency-evaluator.service';

describe('AuthorityDependencyEvaluator (Phase 4E)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let records: FunctionAuthorityRecordsService;
  let dependencies: AuthorityDependenciesService;
  let evaluator: AuthorityDependencyEvaluator;

  let institutionId: string;
  let nationalAuthorityId: string;
  let wrongAuthorityId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig],
        }),
        DatabaseModule,
        AuthorityModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    records = moduleRef.get(FunctionAuthorityRecordsService);
    dependencies = moduleRef.get(AuthorityDependenciesService);
    evaluator = moduleRef.get(AuthorityDependencyEvaluator);
  });

  beforeEach(async () => {
    await resetAuthorityData(prisma);
    await resetGovernmentData(prisma);

    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'AG-SEZ', name: 'ABSEZ', type: JurisdictionType.SPECIAL_ECONOMIC_ZONE },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'ABSEZ',
        name: 'ABSEZ Authority',
        type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
      },
    });
    institutionId = institution.id;

    const national = await prisma.externalAuthority.create({
      data: {
        code: 'AG-NAT-GOV',
        name: 'National Government',
        type: ExternalAuthorityType.GOVERNMENT,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    nationalAuthorityId = national.id;

    const wrong = await prisma.externalAuthority.create({
      data: {
        code: 'OTHER-REG',
        name: 'Other Regulator',
        type: ExternalAuthorityType.REGULATORY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    wrongAuthorityId = wrong.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createFunction(classification: AuthorityClassification) {
    const record = await records.create({
      code: `FUNC-${classification}`,
      name: `Function ${classification}`,
      classification,
      functionClass: ControlledFunctionClass.LICENSING,
      institutionId,
    });
    await prisma.functionAuthorityRecord.update({
      where: { id: record.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE },
    });
    return record;
  }

  it('authenticated external determination satisfies configured dependency', async () => {
    const record = await createFunction(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
      externalAuthorityId: nationalAuthorityId,
    });

    await dependencies.registerExternalDetermination({
      authorityDependencyId: dependency.id,
      externalAuthorityId: nationalAuthorityId,
      determinationReference: 'NAT-2026-0001',
      determinationStatus: ExternalDeterminationStatus.GRANTED,
      isAuthenticated: true,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toHaveLength(0);
  });

  it('unauthenticated response does not satisfy dependency', async () => {
    const record = await createFunction(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
      externalAuthorityId: nationalAuthorityId,
    });

    await dependencies.registerExternalDetermination({
      authorityDependencyId: dependency.id,
      externalAuthorityId: nationalAuthorityId,
      determinationReference: 'NAT-UNAUTH',
      determinationStatus: ExternalDeterminationStatus.GRANTED,
      isAuthenticated: false,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
    );
  });

  it('expired external determination does not satisfy dependency', async () => {
    const record = await createFunction(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
      externalAuthorityId: nationalAuthorityId,
    });

    await dependencies.registerExternalDetermination({
      authorityDependencyId: dependency.id,
      externalAuthorityId: nationalAuthorityId,
      determinationReference: 'NAT-EXPIRED',
      determinationStatus: ExternalDeterminationStatus.GRANTED,
      isAuthenticated: true,
      expiryDate: new Date('2020-01-01'),
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
      at: new Date(),
    });
    expect(failures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
    );
  });

  it('wrong competent authority does not satisfy dependency', async () => {
    const record = await createFunction(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
      externalAuthorityId: nationalAuthorityId,
    });

    await dependencies.registerExternalDetermination({
      authorityDependencyId: dependency.id,
      externalAuthorityId: wrongAuthorityId,
      determinationReference: 'WRONG-001',
      determinationStatus: ExternalDeterminationStatus.GRANTED,
      isAuthenticated: true,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
    );
  });

  it('consultation does not satisfy concurrence', async () => {
    const record = await createFunction(AuthorityClassification.ABSEZ_OWNED);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
      externalAuthorityId: nationalAuthorityId,
    });

    await dependencies.recordInstitutionalAct({
      functionAuthorityRecordId: record.id,
      externalAuthorityId: nationalAuthorityId,
      actType: InstitutionalActType.CONSULTATION,
      decisionOrAction: 'Consulted only',
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE,
    );
  });

  it('supervision does not automatically block an otherwise ABSEZ-owned function', async () => {
    const record = await createFunction(AuthorityClassification.ABSEZ_OWNED);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.SUPERVISORY_REVIEW,
      blockingStatus: AuthorityDependencyBlockingStatus.NON_BLOCKING,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toHaveLength(0);
  });

  it('liaison does not create delegation', async () => {
    const record = await createFunction(AuthorityClassification.ABSEZ_OWNED);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.LIAISON,
      blockingStatus: AuthorityDependencyBlockingStatus.NON_BLOCKING,
    });

    await dependencies.recordInstitutionalAct({
      functionAuthorityRecordId: record.id,
      externalAuthorityId: nationalAuthorityId,
      actType: InstitutionalActType.LIAISON,
      decisionOrAction: 'Liaison meeting',
      legalEffect: 'Information exchanged only',
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(failures).toHaveLength(0);
  });

  it('professional-review requirement cannot be satisfied by AI output', async () => {
    const record = await createFunction(AuthorityClassification.RESERVED_PROFESSIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.PROFESSIONAL_REVIEW,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
      attestationSource: ProfessionalAttestationSource.AI_ASSISTANCE,
    });
    expect(failures).toContain(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL);
  });

  it('professional-review requirement cannot be satisfied by ordinary administrator', async () => {
    const record = await createFunction(AuthorityClassification.RESERVED_PROFESSIONAL);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.PROFESSIONAL_REVIEW,
    });

    const failures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
      attestationSource: ProfessionalAttestationSource.ADMINISTRATOR,
    });
    expect(failures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.ADMINISTRATOR_CANNOT_SATISFY_PROFESSIONAL,
    );
  });

  it('shared workflow preserves separate acts', async () => {
    const record = await createFunction(AuthorityClassification.SHARED_OR_COORDINATED);
    const dependency = await records.createDependency({
      functionAuthorityRecordId: record.id,
      dependencyType: AuthorityDependencyType.SHARED_COORDINATED_ACTION,
    });

    await dependencies.recordInstitutionalAct({
      functionAuthorityRecordId: record.id,
      institutionId,
      actType: InstitutionalActType.COORDINATED_ACTION,
      decisionOrAction: 'ABSEZ step',
      legalEffect: 'ABSEZ act only',
    });

    const partialFailures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(partialFailures).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SHARED_COORDINATED_ACTION,
    );

    await dependencies.recordInstitutionalAct({
      functionAuthorityRecordId: record.id,
      externalAuthorityId: nationalAuthorityId,
      actType: InstitutionalActType.COORDINATED_ACTION,
      decisionOrAction: 'National step',
      legalEffect: 'National act only',
    });

    const completeFailures = await evaluator.evaluate(record.id, [dependency], {
      identityType: IdentityType.INDIVIDUAL,
    });
    expect(completeFailures).toHaveLength(0);
  });

  it('technology cannot silently convert a retained function to ABSEZ-owned', async () => {
    const record = await createFunction(AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL);

    await expect(
      records.updateClassification(record.id, AuthorityClassification.ABSEZ_OWNED),
    ).rejects.toThrow('cannot be silently converted');
  });
});

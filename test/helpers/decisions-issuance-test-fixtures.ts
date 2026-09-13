import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  CatalogLifecycleStatus,
  IdentityType,
  InstrumentDeliveryChannel,
  InstrumentTypePublicVerificationMode,
  OfficialInstrumentKind,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER } from '../../src/decisions-issuance/decisions-issuance.constants';
import { asLoginResponseBody } from './identity-test-types';
import {
  type Phase8eFixtureContext,
  seedPhase8eIssuanceFixture,
} from './phase-8e-test-fixtures';

export interface Phase8fFixtureContext extends Phase8eFixtureContext {
  applicantSessionToken: string;
  officialSessionToken: string;
  restrictedInstrumentTypeVersionId: string;
}

export async function seedPhase8fDeliveryFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase8fFixtureContext> {
  const base = await seedPhase8eIssuanceFixture(prisma);
  const marker = NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER;

  await prisma.instrumentTypeVersion.update({
    where: { id: base.instrumentTypeVersionId },
    data: {
      publicVerificationMode: InstrumentTypePublicVerificationMode.FULL,
      holderDisplayPermitted: true,
      scopeSummaryPublic: true,
      restrictedClassification: false,
      permittedDeliveryChannels: [
        InstrumentDeliveryChannel.PORTAL,
        InstrumentDeliveryChannel.CONTROLLED_DOWNLOAD,
      ],
    },
  });

  const restrictedTypeDef = await prisma.instrumentTypeDefinition.create({
    data: {
      code: `${marker}-RESTRICTED`,
      name: 'Restricted Test Instrument',
      kind: OfficialInstrumentKind.PERMIT,
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
    },
  });

  const issueFunction = await prisma.functionAuthorityRecord.findFirstOrThrow({
    where: { code: `${marker}-ISSUE-FUNC` },
  });

  const numberingRule = await prisma.instrumentNumberingRule.findFirstOrThrow({
    where: { code: `${marker}-NUM` },
  });

  const restrictedTypeVersion = await prisma.instrumentTypeVersion.create({
    data: {
      instrumentTypeDefinitionId: restrictedTypeDef.id,
      versionNumber: 1,
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
      issuingInstitutionId: base.institutionId,
      issuanceFunctionAuthorityRecordId: issueFunction.id,
      signatureRequired: false,
      sealRequired: false,
      numberingRuleId: numberingRule.id,
      effectiveDateRule: { source: 'ISSUANCE_DATE' },
      verificationMethod: 'CHECKSUM',
      publicationStatus: 'OFFICIAL',
      recordsClassification: 'RESTRICTED',
      retainedNationalBoundary: false,
      publicVerificationMode: InstrumentTypePublicVerificationMode.FULL,
      holderDisplayPermitted: true,
      scopeSummaryPublic: true,
      restrictedClassification: true,
      permittedDeliveryChannels: [InstrumentDeliveryChannel.PORTAL],
      legalEffectRequiresDelivery: true,
      requiredTemplateVersionId: base.templateVersionId,
    },
  });

  await prisma.instrumentTypeEligibleDecisionType.create({
    data: {
      instrumentTypeVersionId: restrictedTypeVersion.id,
      decisionTypeVersionId: base.decisionTypeVersionId,
    },
  });

  const applicantPerson = await prisma.person.create({
    data: { givenName: 'Applicant', familyName: 'Holder' },
  });

  const applicantIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      personId: applicantPerson.id,
      displayName: 'Phase 8F Applicant',
    },
  });

  await prisma.case.update({
    where: { id: base.caseId },
    data: { applicantIdentityId: applicantIdentity.id },
  });

  const applicantSessionToken = await ensureIdentitySession(
    app,
    prisma,
    applicantIdentity.id,
    `${marker}-applicant`,
  );
  const officialSessionToken = await ensureIdentitySession(
    app,
    prisma,
    base.officialIdentityId,
    `${marker}-official`,
  );

  return {
    ...base,
    applicantIdentityId: applicantIdentity.id,
    applicantSessionToken,
    officialSessionToken,
    restrictedInstrumentTypeVersionId: restrictedTypeVersion.id,
  };
}

async function ensureIdentitySession(
  app: INestApplication<App>,
  prisma: PrismaService,
  identityId: string,
  loginPrefix: string,
): Promise<string> {
  let identity = await prisma.identity.findUniqueOrThrow({
    where: { id: identityId },
    include: { userAccount: true, person: true },
  });

  if (!identity.personId) {
    const person = await prisma.person.create({
      data: { givenName: 'Phase', familyName: '8F' },
    });
    identity = await prisma.identity.update({
      where: { id: identityId },
      data: { personId: person.id },
      include: { userAccount: true, person: true },
    });
  }

  const loginIdentifier = `${loginPrefix}@test.gov`;

  if (!identity.userAccountId) {
    const userAccount = await prisma.userAccount.create({
      data: {
        loginIdentifier,
        status: AccountStatus.ACTIVE,
      },
    });
    identity = await prisma.identity.update({
      where: { id: identityId },
      data: { userAccountId: userAccount.id },
      include: { userAccount: true, person: true },
    });
  } else {
    await prisma.userAccount.update({
      where: { id: identity.userAccountId },
      data: { loginIdentifier, status: AccountStatus.ACTIVE },
    });
  }

  const existingCredential = await prisma.credential.findFirst({
    where: { identityId },
  });

  if (!existingCredential) {
    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId, type: 'PASSWORD', password: 'Phase8f123!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId, type: AuthenticationMethodType.PASSWORD })
      .expect(201);
  }

  const login = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier, password: 'Phase8f123!' })
        .expect(201)
    ).body,
  );

  return login.sessionToken;
}

export async function resetDecisionsIssuanceData(prisma: PrismaService): Promise<void> {
  await prisma.instrumentDownloadEvent.deleteMany();
  await prisma.instrumentDeliveryAuditEvent.deleteMany();
  await prisma.instrumentVerificationEvent.deleteMany();
  await prisma.instrumentVerificationRecord.deleteMany();
  await prisma.instrumentReceiptAcknowledgment.deleteMany();
  await prisma.instrumentDeliveryAttempt.deleteMany();
  await prisma.instrumentDelivery.deleteMany();
}

import {
  BuildProvenanceStatus,
  CredentialStatus,
  CredentialType,
  IdentityType,
  SecurityControlDomain,
  SecurityEnvironment,
  SecurityFindingSeverity,
} from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';

export interface Phase13BFixtureContext {
  ownerIdentityId: string;
  serviceIdentityId: string;
  credentialId: string;
  assetId: string;
  controlDefinitionId: string;
  buildProvenanceId: string;
  componentId: string;
}

export async function seedPhase13BFixture(prisma: PrismaService): Promise<Phase13BFixtureContext> {
  const person = await prisma.person.create({
    data: { givenName: 'Security', familyName: 'Owner' },
  });
  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier: 'security-owner@phase13b.test',
      personId: person.id,
    },
  });
  const owner = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Security Owner',
      userAccountId: account.id,
      personId: person.id,
    },
  });

  const serviceIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: 'Integration Service Identity',
    },
  });

  const credential = await prisma.credential.create({
    data: {
      identityId: serviceIdentity.id,
      type: CredentialType.API_KEY,
      status: CredentialStatus.ACTIVE,
      secretHash: 'hash-only-not-secret',
    },
  });

  const asset = await prisma.securityAsset.create({
    data: {
      assetCode: 'SAST-PH13B-001',
      name: 'HeartStone API',
      assetType: 'APPLICATION',
      environment: SecurityEnvironment.PRODUCTION,
      ownerIdentityId: owner.id,
      criticality: SecurityFindingSeverity.HIGH,
      isProductionConsequential: true,
    },
  });

  const controlDefinition = await prisma.securityControlDefinition.create({
    data: {
      controlCode: 'SCTL-PH13B-001',
      title: 'No secrets in source control',
      domain: SecurityControlDomain.SECRETS,
      requirementSource: 'Phase 13B baseline',
      ownerIdentityId: owner.id,
    },
  });

  const buildProvenance = await prisma.buildProvenanceRecord.create({
    data: {
      provenanceCode: 'BPRV-PH13B-001',
      sourceCommitSha: 'abc123def456',
      buildId: 'build-001',
      buildSystem: 'github-actions',
      testRunReference: 'ci/test/001',
      artifactDigest: 'sha256:artifact001',
      status: BuildProvenanceStatus.VERIFIED,
      ownerIdentityId: owner.id,
    },
  });

  const component = await prisma.softwareComponentRecord.create({
    data: {
      componentCode: 'SWCM-PH13B-001',
      name: '@nestjs/common',
      version: '11.0.1',
      componentType: 'LIBRARY',
      ownerIdentityId: owner.id,
    },
  });

  return {
    ownerIdentityId: owner.id,
    serviceIdentityId: serviceIdentity.id,
    credentialId: credential.id,
    assetId: asset.id,
    controlDefinitionId: controlDefinition.id,
    buildProvenanceId: buildProvenance.id,
    componentId: component.id,
  };
}

import * as fs from 'node:fs';
import * as path from 'node:path';

import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';
import { SERVICE_PACK_RUNTIME_COMPILER_MARKER } from '../../src/service-catalog/service-packs/service-pack-runtime-compiler.constants';
import { parseServicePackManifest } from '../../src/service-catalog/service-packs/validate-service-pack';

const ABSEZ_PACK_PATH = path.join(
  process.cwd(),
  'service-packs/examples/absez-non-production-simple-registration.pack.json',
);

export interface S15CompileFixtureContext {
  institutionId: string;
  institutionCode: string;
  secondInstitutionId: string;
  secondInstitutionCode: string;
  departmentId: string;
  secondDepartmentId: string;
  serviceFamilyId: string;
  secondServiceFamilyId: string;
  servicePackId: string;
  authoringManifest: ReturnType<typeof parseServicePackManifest>;
}

export async function seedS15CompileFixture(
  _app: INestApplication,
  prisma: PrismaService,
): Promise<S15CompileFixtureContext> {
  const raw = JSON.parse(fs.readFileSync(ABSEZ_PACK_PATH, 'utf8')) as unknown;
  const authoringManifest = parseServicePackManifest(raw);

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-JUR`,
      name: 'S15 Compile Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: authoringManifest.institutionCode,
      name: 'S15 ABSEZ Draft Institution',
      type: InstitutionType.AGENCY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: authoringManifest.departmentCode ?? `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-DEPT`,
      name: 'S15 ABSEZ Draft Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const secondInstitution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-PEER-INST`,
      name: 'S15 Peer Institution',
      type: InstitutionType.AGENCY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const secondDepartment = await prisma.department.create({
    data: {
      institutionId: secondInstitution.id,
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-PEER-DEPT`,
      name: 'S15 Peer Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const primaryService = authoringManifest.services[0];
  if (!primaryService) {
    throw new Error('Authoring manifest must declare at least one service');
  }

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: primaryService.serviceFamilyCode,
      name: 'S15 ABSEZ Service Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const secondServiceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-PEER-FAMILY`,
      name: 'S15 Peer Service Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-GS`,
      title: 'S15 compile governing source',
      versionLabel: '1.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-hash`,
    },
  });

  const office = await prisma.office.create({
    data: {
      departmentId: department.id,
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-OFF`,
      name: 'S15 Compile Office',
    },
  });

  for (const functionCode of [
    'TEMPLATE-AUTH-REGISTRATION-INTAKE',
    'TEMPLATE-AUTH-REGISTRATION-VERIFY',
  ]) {
    await prisma.functionAuthorityRecord.upsert({
      where: { code: functionCode },
      create: {
        code: functionCode,
        name: functionCode,
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.ADMINISTRATIVE,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: institution.id,
        officeId: office.id,
        activatedAt: new Date('2020-01-01'),
        governingSources: {
          create: { governingSourceId: governingSource.id, isPrimary: true },
        },
        actionRights: {
          create: [
            {
              action: AuthorityActionType.REVIEW,
              permitted: true,
              requiresHumanActor: true,
            },
          ],
        },
      },
      update: {
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: institution.id,
        officeId: office.id,
      },
    });
  }

  const servicePack = await prisma.servicePack.create({
    data: {
      code: `${SERVICE_PACK_RUNTIME_COMPILER_MARKER}-PACK`,
      name: 'S15 Compile Test Pack',
      institutionId: institution.id,
      jurisdictionId: jurisdiction.id,
    },
  });

  return {
    institutionId: institution.id,
    institutionCode: institution.code,
    secondInstitutionId: secondInstitution.id,
    secondInstitutionCode: secondInstitution.code,
    departmentId: department.id,
    secondDepartmentId: secondDepartment.id,
    serviceFamilyId: serviceFamily.id,
    secondServiceFamilyId: secondServiceFamily.id,
    servicePackId: servicePack.id,
    authoringManifest,
  };
}

export async function createServicePackVersionWithManifest(
  prisma: PrismaService,
  input: {
    servicePackId: string;
    versionLabel: string;
    manifest: unknown;
    compilationFingerprint: string;
  },
) {
  return prisma.servicePackVersion.create({
    data: {
      servicePackId: input.servicePackId,
      version: input.versionLabel,
      manifest: input.manifest as never,
      compilationFingerprint: input.compilationFingerprint,
      manifestChecksum: input.compilationFingerprint,
    },
  });
}

export function loadAbsezAuthoringManifest() {
  const raw = JSON.parse(fs.readFileSync(ABSEZ_PACK_PATH, 'utf8')) as unknown;
  return parseServicePackManifest(raw);
}

export function peerInstitutionManifest(
  base: ReturnType<typeof parseServicePackManifest>,
  institutionCode: string,
  departmentCode: string,
  serviceFamilyCode: string,
  packVersion: string,
) {
  return {
    ...base,
    institutionCode,
    departmentCode,
    packVersion,
    services: base.services.map((service) => ({
      ...service,
      serviceFamilyCode,
    })),
  };
}

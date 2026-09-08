import {
  AppointmentStatus,
  DelegationStatus,
  Prisma,
  PrismaClient,
  StructuralLifecycleStatus,
} from '@prisma/client';

import {
  ANTIGUA_BARBUDA,
  DEVELOPMENT_LABEL,
  SAMPLE_LABEL,
  SEED_MANIFEST_KEY,
  SEED_MANIFEST_VERSION,
} from './constants';

export async function seedAntiguaBarbudaStructural(prisma: PrismaClient): Promise<void> {
  const jurisdiction = await prisma.jurisdiction.upsert({
    where: { code: ANTIGUA_BARBUDA.jurisdiction.code },
    create: {
      code: ANTIGUA_BARBUDA.jurisdiction.code,
      name: ANTIGUA_BARBUDA.jurisdiction.name,
      description: ANTIGUA_BARBUDA.jurisdiction.description,
      type: ANTIGUA_BARBUDA.jurisdiction.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.jurisdiction.name,
      description: ANTIGUA_BARBUDA.jurisdiction.description,
      type: ANTIGUA_BARBUDA.jurisdiction.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.upsert({
    where: {
      jurisdictionId_code: {
        jurisdictionId: jurisdiction.id,
        code: ANTIGUA_BARBUDA.institution.code,
      },
    },
    create: {
      jurisdictionId: jurisdiction.id,
      code: ANTIGUA_BARBUDA.institution.code,
      name: ANTIGUA_BARBUDA.institution.name,
      description: ANTIGUA_BARBUDA.institution.description,
      type: ANTIGUA_BARBUDA.institution.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.institution.name,
      description: ANTIGUA_BARBUDA.institution.description,
      type: ANTIGUA_BARBUDA.institution.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.governmentBody.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: ANTIGUA_BARBUDA.governmentBody.code,
      },
    },
    create: {
      institutionId: institution.id,
      code: ANTIGUA_BARBUDA.governmentBody.code,
      name: ANTIGUA_BARBUDA.governmentBody.name,
      description: ANTIGUA_BARBUDA.governmentBody.description,
      type: ANTIGUA_BARBUDA.governmentBody.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.governmentBody.name,
      description: ANTIGUA_BARBUDA.governmentBody.description,
      type: ANTIGUA_BARBUDA.governmentBody.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: ANTIGUA_BARBUDA.department.code,
      },
    },
    create: {
      institutionId: institution.id,
      code: ANTIGUA_BARBUDA.department.code,
      name: ANTIGUA_BARBUDA.department.name,
      description: ANTIGUA_BARBUDA.department.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.department.name,
      description: ANTIGUA_BARBUDA.department.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const office = await prisma.office.upsert({
    where: {
      departmentId_code: {
        departmentId: department.id,
        code: ANTIGUA_BARBUDA.office.code,
      },
    },
    create: {
      departmentId: department.id,
      code: ANTIGUA_BARBUDA.office.code,
      name: ANTIGUA_BARBUDA.office.name,
      description: ANTIGUA_BARBUDA.office.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.office.name,
      description: ANTIGUA_BARBUDA.office.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const primaryOfficeholder = await prisma.officeholder.upsert({
    where: { code: ANTIGUA_BARBUDA.officeholders.primary.code },
    create: {
      code: ANTIGUA_BARBUDA.officeholders.primary.code,
      displayName: ANTIGUA_BARBUDA.officeholders.primary.displayName,
      description: ANTIGUA_BARBUDA.officeholders.primary.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      displayName: ANTIGUA_BARBUDA.officeholders.primary.displayName,
      description: ANTIGUA_BARBUDA.officeholders.primary.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const delegateOfficeholder = await prisma.officeholder.upsert({
    where: { code: ANTIGUA_BARBUDA.officeholders.delegate.code },
    create: {
      code: ANTIGUA_BARBUDA.officeholders.delegate.code,
      displayName: ANTIGUA_BARBUDA.officeholders.delegate.displayName,
      description: ANTIGUA_BARBUDA.officeholders.delegate.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      displayName: ANTIGUA_BARBUDA.officeholders.delegate.displayName,
      description: ANTIGUA_BARBUDA.officeholders.delegate.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');

  await prisma.appointment.upsert({
    where: { code: ANTIGUA_BARBUDA.appointment.code },
    create: {
      code: ANTIGUA_BARBUDA.appointment.code,
      officeId: office.id,
      officeholderId: primaryOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom,
      notes: ANTIGUA_BARBUDA.appointment.notes,
    },
    update: {
      officeId: office.id,
      officeholderId: primaryOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom,
      notes: ANTIGUA_BARBUDA.appointment.notes,
    },
  });

  await prisma.delegation.upsert({
    where: { code: ANTIGUA_BARBUDA.delegation.code },
    create: {
      code: ANTIGUA_BARBUDA.delegation.code,
      sourceInstitutionId: institution.id,
      delegatorOfficeholderId: primaryOfficeholder.id,
      recipientOfficeholderId: delegateOfficeholder.id,
      scopeDescription: ANTIGUA_BARBUDA.delegation.scopeDescription,
      status: DelegationStatus.ACTIVE,
      effectiveFrom,
      notes: ANTIGUA_BARBUDA.delegation.notes,
    },
    update: {
      sourceInstitutionId: institution.id,
      delegatorOfficeholderId: primaryOfficeholder.id,
      recipientOfficeholderId: delegateOfficeholder.id,
      scopeDescription: ANTIGUA_BARBUDA.delegation.scopeDescription,
      status: DelegationStatus.ACTIVE,
      effectiveFrom,
      notes: ANTIGUA_BARBUDA.delegation.notes,
    },
  });

  const externalAuthority = await prisma.externalAuthority.upsert({
    where: { code: ANTIGUA_BARBUDA.externalAuthority.code },
    create: {
      code: ANTIGUA_BARBUDA.externalAuthority.code,
      name: ANTIGUA_BARBUDA.externalAuthority.name,
      description: ANTIGUA_BARBUDA.externalAuthority.description,
      type: ANTIGUA_BARBUDA.externalAuthority.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      name: ANTIGUA_BARBUDA.externalAuthority.name,
      description: ANTIGUA_BARBUDA.externalAuthority.description,
      type: ANTIGUA_BARBUDA.externalAuthority.type,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.institutionExternalAuthority.upsert({
    where: { code: ANTIGUA_BARBUDA.institutionExternalAuthority.code },
    create: {
      code: ANTIGUA_BARBUDA.institutionExternalAuthority.code,
      institutionId: institution.id,
      externalAuthorityId: externalAuthority.id,
      relationshipType: ANTIGUA_BARBUDA.institutionExternalAuthority.relationshipType,
      description: ANTIGUA_BARBUDA.institutionExternalAuthority.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
    update: {
      institutionId: institution.id,
      externalAuthorityId: externalAuthority.id,
      relationshipType: ANTIGUA_BARBUDA.institutionExternalAuthority.relationshipType,
      description: ANTIGUA_BARBUDA.institutionExternalAuthority.description,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const manifest: Prisma.InputJsonValue = {
    version: SEED_MANIFEST_VERSION,
    classification: 'NON_PRODUCTION',
    purpose: 'DEVELOPMENT',
    jurisdictionIsoAlpha2: ANTIGUA_BARBUDA.jurisdiction.isoAlpha2,
    jurisdictionIsoAlpha3: ANTIGUA_BARBUDA.jurisdiction.isoAlpha3,
    labels: [SAMPLE_LABEL, DEVELOPMENT_LABEL],
    disclaimer:
      'Development/testing seed only. Not a legal assertion of governmental authority, appointments, or delegations.',
    entityCodes: {
      jurisdiction: ANTIGUA_BARBUDA.jurisdiction.code,
      institution: ANTIGUA_BARBUDA.institution.code,
      governmentBody: ANTIGUA_BARBUDA.governmentBody.code,
      department: ANTIGUA_BARBUDA.department.code,
      office: ANTIGUA_BARBUDA.office.code,
      officeholders: [
        ANTIGUA_BARBUDA.officeholders.primary.code,
        ANTIGUA_BARBUDA.officeholders.delegate.code,
      ],
      appointment: ANTIGUA_BARBUDA.appointment.code,
      delegation: ANTIGUA_BARBUDA.delegation.code,
      externalAuthority: ANTIGUA_BARBUDA.externalAuthority.code,
      institutionExternalAuthority: ANTIGUA_BARBUDA.institutionExternalAuthority.code,
    },
  };

  await prisma.systemMetadata.upsert({
    where: { key: SEED_MANIFEST_KEY },
    create: {
      key: SEED_MANIFEST_KEY,
      value: JSON.stringify(manifest),
    },
    update: {
      value: JSON.stringify(manifest),
    },
  });
}

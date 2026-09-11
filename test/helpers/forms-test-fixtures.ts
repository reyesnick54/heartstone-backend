import { CatalogServiceType, JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';

export async function seedFormsGovernmentServiceVersion(
  prisma: PrismaService,
): Promise<{ serviceVersionId: string }> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: 'NON_PRODUCTION-FORMS-JUR',
      name: 'Forms Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: 'NON_PRODUCTION-FORMS-INST',
      name: 'Forms Test Institution',
      type: 'AGENCY',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: 'NON_PRODUCTION-FORMS-DEPT',
      name: 'Forms Test Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: 'NON_PRODUCTION-FORMS-FAMILY',
      name: 'Forms Test Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: 'NON_PRODUCTION-business-license',
      slug: 'non-production-business-license',
      officialName: 'Business License',
      publicName: 'Business License',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
      catalogServiceType: CatalogServiceType.LICENCE,
    },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      purpose: 'Business license intake',
      publicDescription: 'Apply for a business license',
    },
  });

  return { serviceVersionId: serviceVersion.id };
}

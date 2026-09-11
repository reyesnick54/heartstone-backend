import {
  AuthorityClassification,
  AuthorityDependencyType,
  ControlledFunctionClass,
  ServiceFeeCalculationType,
  ServiceFeeRefundability,
  ServiceLevelClockBasis,
  ServiceLevelDayBasis,
  ServiceLevelDurationUnit,
  ServiceLevelTargetType,
  ServiceOperatingMetadataStatus,
  ServiceOutputType,
  ServiceRedressRouteType,
} from '@prisma/client';

import { hashContent } from '../../authority/common/authority-hash.util';
import { type PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../service-catalog.constants';

export interface Phase5eFixtureContext {
  jurisdictionId: string;
  institutionId: string;
  governmentServiceId: string;
  serviceVersionId: string;
  governingSourceId: string;
  authorityDependencyId?: string;
}

export async function seedPhase5eOperatingMetadataFixture(
  prisma: PrismaService,
): Promise<Phase5eFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `P5E-JUR-${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}`,
      name: 'Phase 5E Test Jurisdiction',
      type: 'NATIONAL',
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `P5E-INST-${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}`,
      name: 'Phase 5E Test Institution',
      type: 'AGENCY',
    },
  });

  const governmentService = await prisma.governmentService.create({
    data: {
      code: `P5E-SVC-${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}`,
      name: 'Business Registration Service',
      responsibleInstitutionId: institution.id,
    },
  });

  const serviceVersion = await prisma.serviceVersion.create({
    data: {
      governmentServiceId: governmentService.id,
      versionLabel: '1.0.0',
      description: 'Initial published version',
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `P5E-GS-${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}`,
      title: 'Business Registration Fee Schedule',
      versionLabel: '2024-01',
      effectiveFrom: new Date('2024-01-01'),
      contentHash: hashContent('phase-5e-fee-schedule'),
      versions: {
        create: {
          versionLabel: '2024-01',
          contentHash: hashContent('phase-5e-fee-schedule'),
        },
      },
    },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `P5E-FUNC-${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}`,
      name: 'Fee Waiver Authority',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.ADMINISTRATIVE,
    },
  });

  const authorityDependency = await prisma.authorityDependency.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      dependencyType: AuthorityDependencyType.PROFESSIONAL_QUALIFICATION,
      competentAuthorityLabel: 'Professional Board',
      requiredOutcome: 'Qualification verified',
    },
  });

  await prisma.serviceFeeDefinition.createMany({
    data: [
      {
        serviceVersionId: serviceVersion.id,
        feeCode: 'APPLICATION_FEE',
        name: 'Application Fee (2024)',
        currency: 'XCD',
        calculationType: ServiceFeeCalculationType.FIXED,
        fixedAmount: '250.00',
        governingSourceId: governingSource.id,
        collectingInstitutionId: institution.id,
        refundability: ServiceFeeRefundability.NON_REFUNDABLE,
        waiverReductionAvailable: true,
        waiverAuthorityFunctionId: functionRecord.id,
        effectiveFrom: new Date('2024-01-01'),
        effectiveUntil: new Date('2024-12-31'),
        status: ServiceOperatingMetadataStatus.ACTIVE,
      },
      {
        serviceVersionId: serviceVersion.id,
        feeCode: 'APPLICATION_FEE',
        name: 'Application Fee (2025)',
        currency: 'XCD',
        calculationType: ServiceFeeCalculationType.FIXED,
        fixedAmount: '300.00',
        governingSourceId: governingSource.id,
        collectingInstitutionId: institution.id,
        refundability: ServiceFeeRefundability.NON_REFUNDABLE,
        waiverReductionAvailable: true,
        waiverAuthorityFunctionId: functionRecord.id,
        effectiveFrom: new Date('2025-01-01'),
        status: ServiceOperatingMetadataStatus.ACTIVE,
      },
    ],
  });

  await prisma.serviceLevelTarget.create({
    data: {
      serviceVersionId: serviceVersion.id,
      targetType: ServiceLevelTargetType.FULL_PROCESSING,
      targetDurationValue: 30,
      targetDurationUnit: ServiceLevelDurationUnit.DAYS,
      clockBasis: ServiceLevelClockBasis.BUSINESS_PROCESSING,
      dayBasis: ServiceLevelDayBasis.BUSINESS_DAYS,
      startEventDescription: 'Complete application received',
      pausable: true,
      approvedPauseReasons: ['Awaiting applicant response'],
      governingSourceId: governingSource.id,
      effectiveFrom: new Date('2024-01-01'),
      status: ServiceOperatingMetadataStatus.ACTIVE,
    },
  });

  await prisma.serviceDependencyDefinition.create({
    data: {
      serviceVersionId: serviceVersion.id,
      dependencyType: 'PROFESSIONAL',
      authorityDependencyId: authorityDependency.id,
      name: 'Professional qualification verification',
      description: 'Operational dependency on professional board',
      externalEntityLabel: 'Professional Board',
      effectiveFrom: new Date('2024-01-01'),
      status: ServiceOperatingMetadataStatus.ACTIVE,
    },
  });

  await prisma.serviceOutputDefinition.create({
    data: {
      serviceVersionId: serviceVersion.id,
      outputType: ServiceOutputType.CERTIFICATE,
      publicName: 'Business Registration Certificate',
      issuingInstitutionId: institution.id,
      expectedValidityDescription: 'Valid for one year',
      renewalRequired: true,
      authorityFunctionId: functionRecord.id,
      electronicIssuanceEligible: true,
      effectiveFrom: new Date('2024-01-01'),
      status: ServiceOperatingMetadataStatus.ACTIVE,
    },
  });

  await prisma.serviceOutputDefinition.create({
    data: {
      serviceVersionId: serviceVersion.id,
      outputType: ServiceOutputType.DECISION,
      publicName: 'Registration Decision Notice',
      issuingInstitutionId: institution.id,
      effectiveFrom: new Date('2024-01-01'),
      status: ServiceOperatingMetadataStatus.ACTIVE,
    },
  });

  await prisma.serviceRedressRoute.create({
    data: {
      serviceVersionId: serviceVersion.id,
      routeType: ServiceRedressRouteType.APPEAL,
      routeName: 'Administrative Appeal',
      responsibleInstitutionId: institution.id,
      deadlineDescription: '30 days from decision notice',
      governingSourceId: governingSource.id,
      independenceRequired: true,
      contactChannelMetadata: { channel: 'email', address: 'appeals@example.gov' },
      effectiveFrom: new Date('2024-01-01'),
      status: ServiceOperatingMetadataStatus.ACTIVE,
    },
  });

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    governmentServiceId: governmentService.id,
    serviceVersionId: serviceVersion.id,
    governingSourceId: governingSource.id,
    authorityDependencyId: authorityDependency.id,
  };
}

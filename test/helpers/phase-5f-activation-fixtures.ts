/**
 * NON_PRODUCTION SAMPLE TEST_ONLY fixtures for Phase 5F activation governance.
 */
import {
  AuthorityActionType,
  AuthorityClassification,
  CatalogServiceType,
  ControlledFunctionClass,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  ServiceFunctionMappingStatus,
  ServiceTestReadinessStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type FunctionActivationService } from '../../src/authority/function-authority-records/function-activation.service';
import { type FunctionAuthorityRecordsService } from '../../src/authority/function-authority-records/function-authority-records.service';
import { type GoverningSourcesService } from '../../src/authority/governing-sources/governing-sources.service';
import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../../src/service-catalog/service-catalog.constants';

export interface Phase5FActivationFixtureContext {
  institutionId: string;
  departmentId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  identityId: string;
  activationFunctionId: string;
  mappedFunctionId: string;
}

export interface Phase5FConfiguredServiceFixture {
  governmentServiceId: string;
  governmentServiceVersionId: string;
  formVersionId: string;
}

export class Phase5FActivationFixtures {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governingSources: GoverningSourcesService,
    private readonly functions: FunctionAuthorityRecordsService,
    private readonly activation: FunctionActivationService,
  ) {}

  async seedStructuralContext(): Promise<Phase5FActivationFixtureContext> {
    const marker = NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER;
    const jurisdiction = await this.prisma.jurisdiction.create({
      data: {
        code: `${marker}-5F-JUR`,
        name: 'NON_PRODUCTION 5F Jurisdiction',
        type: 'SPECIAL_ECONOMIC_ZONE',
      },
    });

    const institution = await this.prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: `${marker}-5F-INST`,
        name: 'NON_PRODUCTION 5F Institution',
        type: 'SPECIAL_ECONOMIC_ZONE_AUTHORITY',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const department = await this.prisma.department.create({
      data: {
        institutionId: institution.id,
        code: `${marker}-5F-DEPT`,
        name: 'NON_PRODUCTION 5F Department',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const office = await this.prisma.office.create({
      data: {
        departmentId: department.id,
        code: `${marker}-5F-OFFICE`,
        name: 'NON_PRODUCTION 5F Office',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const officeholder = await this.prisma.officeholder.create({
      data: {
        code: `${marker}-5F-OH`,
        name: 'NON_PRODUCTION 5F Service Owner',
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const person = await this.prisma.person.create({
      data: { givenName: 'Service', familyName: 'AuthorityActor' },
    });

    const identity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        personId: person.id,
        displayName: 'NON_PRODUCTION 5F Authority Actor',
      },
    });

    await this.prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: 'ACTIVE',
      },
    });

    const actorPerson = await this.prisma.person.create({
      data: { givenName: 'Activation', familyName: 'Authority' },
    });

    const actorIdentity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        personId: actorPerson.id,
        displayName: 'NON_PRODUCTION 5F Activation Seeder',
      },
    });

    const source = await this.governingSources.create({
      code: `${marker}-5F-GS`,
      title: 'NON_PRODUCTION 5F Governing Source',
      versionLabel: '1.0',
      content: `${marker} governing source content`,
      effectiveFrom: '2020-01-01T00:00:00.000Z',
    });
    await this.governingSources.authenticate(source.id, {
      authenticatedByIdentityId: actorIdentity.id,
    });

    const activationFunction = await this.functions.create({
      code: `${marker}-5F-ACTIVATE`,
      name: 'NON_PRODUCTION 5F Service Activation Authority',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.ADMINISTRATIVE,
      institutionId: institution.id,
      officeId: office.id,
    });
    await this.functions.linkGoverningSource({
      functionAuthorityRecordId: activationFunction.id,
      governingSourceId: source.id,
    });
    await this.functions.createAssignment({
      functionAuthorityRecordId: activationFunction.id,
      officeholderId: officeholder.id,
      officeId: office.id,
      institutionId: institution.id,
      effectiveFrom: new Date('2020-01-01'),
    });
    await this.functions.createActionRight({
      functionAuthorityRecordId: activationFunction.id,
      action: AuthorityActionType.APPROVE,
      permitted: true,
      requiresHumanActor: true,
    });
    await this.activation.activate(activationFunction.id, {
      actorIdentityId: actorIdentity.id,
      reason: 'NON_PRODUCTION 5F activation authority fixture',
    });

    const mappedFunction = await this.functions.create({
      code: `${marker}-5F-MAPPED`,
      name: 'NON_PRODUCTION 5F Mapped Service Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      institutionId: institution.id,
      officeId: office.id,
    });
    await this.functions.linkGoverningSource({
      functionAuthorityRecordId: mappedFunction.id,
      governingSourceId: source.id,
    });
    await this.functions.createAssignment({
      functionAuthorityRecordId: mappedFunction.id,
      officeholderId: officeholder.id,
      officeId: office.id,
      institutionId: institution.id,
      effectiveFrom: new Date('2020-01-01'),
    });
    await this.functions.createActionRight({
      functionAuthorityRecordId: mappedFunction.id,
      action: AuthorityActionType.DECIDE,
      permitted: true,
      requiresHumanActor: true,
    });
    await this.activation.activate(mappedFunction.id, {
      actorIdentityId: actorIdentity.id,
      reason: 'NON_PRODUCTION 5F mapped function fixture',
    });

    return {
      institutionId: institution.id,
      departmentId: department.id,
      officeId: office.id,
      officeholderId: officeholder.id,
      appointmentId: appointment.id,
      identityId: identity.id,
      activationFunctionId: activationFunction.id,
      mappedFunctionId: mappedFunction.id,
    };
  }

  async seedConfiguredServiceVersion(
    ctx: Phase5FActivationFixtureContext,
    serviceFamilyId: string,
    options?: {
      withActivationAuthority?: boolean;
      withActiveForm?: boolean;
      withChecklist?: boolean;
      withFees?: boolean;
      testReadinessStatus?: ServiceTestReadinessStatus;
    },
  ): Promise<Phase5FConfiguredServiceFixture> {
    const marker = NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER;
    const service = await this.prisma.governmentService.create({
      data: {
        code: `${marker}-5F-SVC`,
        slug: `${marker}-5f-svc`,
        officialName: 'NON_PRODUCTION Sample Government Service',
        publicName: 'NON_PRODUCTION Public Service',
        summary: 'Summary',
        catalogServiceType: CatalogServiceType.APPLICATION,
        responsibleInstitutionId: ctx.institutionId,
        responsibleDepartmentId: ctx.departmentId,
        serviceFamilyId,
        ownerOfficeholderId: ctx.officeholderId,
      },
    });

    const formDefinition = await this.prisma.formDefinition.create({
      data: {
        code: `${marker}-5F-FORM`,
        name: 'NON_PRODUCTION Intake Form',
      },
    });

    const formVersion = await this.prisma.formVersion.create({
      data: {
        formDefinitionId: formDefinition.id,
        versionNumber: 1,
        status:
          options?.withActiveForm === false ? FormVersionStatus.DRAFT : FormVersionStatus.ACTIVE,
        schema: { fields: [] },
        activatedAt: options?.withActiveForm === false ? null : new Date('2020-01-01'),
      },
    });

    const version = await this.prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: service.id,
        version: '1.0.0',
        maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
        publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
        publicDescription: 'NON_PRODUCTION complete public description for service discovery.',
        internalGoverningSourceMaterial: 'NON_PRODUCTION governing source material reference',
        majorDependencies: [{ label: 'Prerequisite check' }],
        effectiveFrom: new Date('2020-01-01'),
        testReadinessStatus:
          options?.testReadinessStatus ?? ServiceTestReadinessStatus.TECHNICAL_TESTS_PASSED,
        activationFunctionAuthorityRecordId:
          options?.withActivationAuthority === false ? null : ctx.activationFunctionId,
        formDefinitionId: formDefinition.id,
        formVersionId: options?.withActiveForm === false ? null : formVersion.id,
      },
    });

    await this.prisma.serviceFunctionMapping.create({
      data: {
        governmentServiceVersionId: version.id,
        functionAuthorityRecordId: ctx.mappedFunctionId,
        isConsequential: true,
        status: ServiceFunctionMappingStatus.ACTIVE,
      },
    });

    if (options?.withChecklist !== false) {
      await this.prisma.governmentServiceChecklistItem.create({
        data: {
          governmentServiceVersionId: version.id,
          itemCode: 'ID_DOC',
          label: 'Identity document',
          description: 'Provide identity document',
        },
      });
    }

    await this.prisma.governmentServiceOutputDefinition.create({
      data: {
        governmentServiceVersionId: version.id,
        outputCode: 'CERT',
        label: 'Certificate',
        description: 'Expected certificate output',
      },
    });

    await this.prisma.governmentServiceRedressRoute.create({
      data: {
        governmentServiceVersionId: version.id,
        routeCode: 'APPEAL',
        label: 'Appeals office',
        description: 'Contact appeals office',
      },
    });

    if (options?.withFees) {
      await this.prisma.governmentServiceFeeDefinition.create({
        data: {
          governmentServiceVersionId: version.id,
          code: 'BASE',
          label: 'Base fee',
          amountCents: 10000,
        },
      });
    }

    return {
      governmentServiceId: service.id,
      governmentServiceVersionId: version.id,
      formVersionId: formVersion.id,
    };
  }

  async seedApplicantIdentity(): Promise<string> {
    const person = await this.prisma.person.create({
      data: { givenName: 'Ordinary', familyName: 'Applicant' },
    });
    const identity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        personId: person.id,
        displayName: 'NON_PRODUCTION Ordinary Applicant',
      },
    });
    return identity.id;
  }

  async seedAdminIdentityWithoutAuthority(): Promise<string> {
    const person = await this.prisma.person.create({
      data: { givenName: 'Technical', familyName: 'Administrator' },
    });
    const identity = await this.prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        personId: person.id,
        displayName: 'NON_PRODUCTION Technical Administrator',
      },
    });
    return identity.id;
  }
}

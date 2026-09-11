/**
 * NON_PRODUCTION SAMPLE TEST_ONLY
 * Representative fixtures for Phase 5D service requirement checklist tests.
 */
import {
  EvidenceQualityExpectation,
  GoverningSourceStatus,
  ServiceRequirementMandatoryStatus,
  ServiceRequirementType,
  StructuredApplicabilityRuleType,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { type DeclarationDefinitionsService } from '../declarations/declaration-definitions.service';
import { type GovernmentServicesService } from '../government-services/government-services.service';
import { type ServiceRequirementsService } from '../requirements/service-requirements.service';
import { type StructuredApplicabilityRulesService } from '../rules/structured-applicability-rules.service';
import { NON_PRODUCTION_SERVICE_FIXTURE_MARKER } from '../services.constants';

export interface Phase5DFixtureContext {
  institutionId: string;
  serviceId: string;
  serviceVersionId: string;
  governingSourceId: string;
  formDefinitionId: string;
  formVersionId: string;
  formFieldId: string;
  declarationDefinitionId: string;
  declarationVersionId: string;
}

export class Phase5DTestFixtures {
  constructor(
    private readonly prisma: PrismaService,
    private readonly governmentServices: GovernmentServicesService,
    private readonly rules: StructuredApplicabilityRulesService,
    private readonly requirements: ServiceRequirementsService,
    private readonly declarations: DeclarationDefinitionsService,
  ) {}

  async seedStructuralContext(): Promise<Phase5DFixtureContext> {
    const jurisdiction = await this.prisma.jurisdiction.create({
      data: {
        code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-JUR`,
        name: 'NON_PRODUCTION Sample Jurisdiction',
        type: 'SPECIAL_ECONOMIC_ZONE',
      },
    });

    const institution = await this.prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-INST`,
        name: 'NON_PRODUCTION Sample Institution',
        type: 'AGENCY',
      },
    });

    const governingSource = await this.prisma.governingSource.create({
      data: {
        code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-GS`,
        title: 'NON_PRODUCTION Sample Governing Source',
        versionLabel: '1.0',
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2020-01-01'),
        contentHash: 'sample-hash',
      },
    });

    const service = await this.governmentServices.createService({
      institutionId: institution.id,
      code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-SVC`,
      name: 'NON_PRODUCTION Business Registration',
    });

    const serviceVersion = await this.governmentServices.createVersion({
      governmentServiceId: service.id,
      versionLabel: '1.0',
      effectiveFrom: new Date('2024-01-01'),
    });

    const formDefinition = await this.prisma.formDefinition.create({
      data: {
        code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-FORM`,
        name: 'NON_PRODUCTION Application Form',
      },
    });

    const formVersion = await this.prisma.formVersion.create({
      data: {
        formDefinitionId: formDefinition.id,
        versionLabel: '1.0',
      },
    });

    const formField = await this.prisma.formField.create({
      data: {
        formVersionId: formVersion.id,
        fieldKey: 'businessName',
        label: 'Business Name',
        fieldType: 'TEXT',
      },
    });

    const declarationDefinition = await this.declarations.createDefinition({
      code: `${NON_PRODUCTION_SERVICE_FIXTURE_MARKER}-DECL`,
      name: 'NON_PRODUCTION Applicant Declaration',
    });

    const declarationVersion = await this.declarations.createVersion({
      declarationDefinitionId: declarationDefinition.id,
      versionLabel: '1.0',
      declarationText: 'I declare that the information provided is accurate.',
    });

    await this.declarations.publishVersion(declarationVersion.id);

    return {
      institutionId: institution.id,
      serviceId: service.id,
      serviceVersionId: serviceVersion.id,
      governingSourceId: governingSource.id,
      formDefinitionId: formDefinition.id,
      formVersionId: formVersion.id,
      formFieldId: formField.id,
      declarationDefinitionId: declarationDefinition.id,
      declarationVersionId: declarationVersion.id,
    };
  }

  async seedStandardRequirements(context: Phase5DFixtureContext): Promise<void> {
    await this.requirements.create({
      serviceVersionId: context.serviceVersionId,
      code: 'IDENTITY_PROOF',
      name: 'Identity Proof',
      requirementType: ServiceRequirementType.IDENTITY,
      mandatoryStatus: ServiceRequirementMandatoryStatus.MANDATORY,
      sourceReference: 'Section 4(1)(a)',
      governingSourceId: context.governingSourceId,
      displayOrder: 1,
    });

    const companyRule = await this.rules.create({
      serviceVersionId: context.serviceVersionId,
      code: 'COMPANY_APPLICANT',
      name: 'Company applicant',
      ruleType: StructuredApplicabilityRuleType.FACT_EQUALS,
      configuration: { factKey: 'applicantType', value: 'COMPANY' },
    });
    await this.rules.activate(companyRule.id);

    await this.requirements.create({
      serviceVersionId: context.serviceVersionId,
      code: 'BENEFICIAL_OWNERSHIP',
      name: 'Beneficial Ownership Disclosure',
      requirementType: ServiceRequirementType.INFORMATION,
      mandatoryStatus: ServiceRequirementMandatoryStatus.CONDITIONAL,
      applicabilityRuleId: companyRule.id,
      sourceReference: 'Section 12(3)',
      governingSourceId: context.governingSourceId,
      displayOrder: 2,
    });

    const constructionRule = await this.rules.create({
      serviceVersionId: context.serviceVersionId,
      code: 'CONSTRUCTION_ACTIVITY',
      name: 'Construction activity',
      ruleType: StructuredApplicabilityRuleType.FACT_EQUALS,
      configuration: { factKey: 'activityType', value: 'CONSTRUCTION' },
    });
    await this.rules.activate(constructionRule.id);

    await this.requirements.create({
      serviceVersionId: context.serviceVersionId,
      code: 'ENGINEERING_PLANS',
      name: 'Engineering Plans',
      requirementType: ServiceRequirementType.DOCUMENT,
      mandatoryStatus: ServiceRequirementMandatoryStatus.CONDITIONAL,
      applicabilityRuleId: constructionRule.id,
      evidenceQualityExpectation: EvidenceQualityExpectation.ORIGINAL_REQUIRED,
      displayOrder: 3,
    });

    await this.requirements.create({
      serviceVersionId: context.serviceVersionId,
      code: 'PROFESSIONAL_LICENSE',
      name: 'Professional License',
      requirementType: ServiceRequirementType.PROFESSIONAL_DOCUMENT,
      mandatoryStatus: ServiceRequirementMandatoryStatus.MANDATORY,
      evidenceQualityExpectation: EvidenceQualityExpectation.PROFESSIONAL_VALIDATION_REQUIRED,
      displayOrder: 4,
    });

    await this.requirements.create({
      serviceVersionId: context.serviceVersionId,
      code: 'APPLICANT_DECLARATION',
      name: 'Applicant Declaration',
      requirementType: ServiceRequirementType.DECLARATION,
      mandatoryStatus: ServiceRequirementMandatoryStatus.MANDATORY,
      declarationDefinitionId: context.declarationDefinitionId,
      declarationDefinitionVersionId: context.declarationVersionId,
      displayOrder: 5,
    });

    const allRequirements = await this.requirements.listForServiceVersion(context.serviceVersionId);
    for (const requirement of allRequirements) {
      await this.requirements.activateRequirement(requirement.id);
    }
  }
}

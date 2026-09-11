import { BadRequestException } from '@nestjs/common';
import {
  ServiceRequirementEffectiveState,
  ServiceRequirementMandatoryStatus,
  ServiceRequirementType,
  StructuredApplicabilityRuleType,
} from '@prisma/client';
import request from 'supertest';

import { type PrismaService } from '../src/database/prisma.service';
import { ServiceChecklistService } from '../src/services/checklist/service-checklist.service';
import { DeclarationDefinitionsService } from '../src/services/declarations/declaration-definitions.service';
import { Phase5DTestFixtures } from '../src/services/fixtures/phase-5d-test-fixtures';
import { GovernmentServicesService } from '../src/services/government-services/government-services.service';
import { ServiceRequirementsService } from '../src/services/requirements/service-requirements.service';
import { StructuredApplicabilityRulesService } from '../src/services/rules/structured-applicability-rules.service';
import { SERVICE_CHECKLIST_EXPLANATION_CODES } from '../src/services/services.constants';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type ServiceChecklistBody } from './helpers/services-test-types';

describe('Phase 5D service requirements checklist (integration)', () => {
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let prisma: PrismaService;
  let fixtures: Phase5DTestFixtures;
  let checklist: ServiceChecklistService;
  let requirements: ServiceRequirementsService;
  let governmentServices: GovernmentServicesService;
  let context: Awaited<ReturnType<Phase5DTestFixtures['seedStructuralContext']>>;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;

    fixtures = new Phase5DTestFixtures(
      prisma,
      app.get(GovernmentServicesService),
      app.get(StructuredApplicabilityRulesService),
      app.get(ServiceRequirementsService),
      app.get(DeclarationDefinitionsService),
    );

    checklist = app.get(ServiceChecklistService);
    requirements = app.get(ServiceRequirementsService);
    governmentServices = app.get(GovernmentServicesService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    context = await fixtures.seedStructuralContext();
    await fixtures.seedStandardRequirements(context);
    await governmentServices.publishVersion(context.serviceVersionId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('includes mandatory requirements in checklist', async () => {
    const result = await checklist.generate(context.serviceVersionId, {});

    expect(result.mandatoryRequirements.map((item) => item.code)).toEqual(
      expect.arrayContaining(['IDENTITY_PROOF', 'PROFESSIONAL_LICENSE', 'APPLICANT_DECLARATION']),
    );
  });

  it('activates conditional requirements deterministically', async () => {
    const companyResult = await checklist.generate(context.serviceVersionId, {
      applicantType: 'COMPANY',
    });
    expect(companyResult.conditionalRequirementsTriggered.map((item) => item.code)).toContain(
      'BENEFICIAL_OWNERSHIP',
    );

    const individualResult = await checklist.generate(context.serviceVersionId, {
      applicantType: 'INDIVIDUAL',
    });
    expect(individualResult.requirementsNotApplicable.map((item) => item.code)).toContain(
      'BENEFICIAL_OWNERSHIP',
    );
  });

  it('keeps non-applicable requirements distinguishable from applicable ones', async () => {
    const result = await checklist.generate(context.serviceVersionId, {
      applicantType: 'INDIVIDUAL',
      activityType: 'RETAIL',
    });

    expect(result.requirementsNotApplicable.length).toBeGreaterThan(0);
    expect(result.applicableRequirements.map((item) => item.code)).not.toContain(
      'BENEFICIAL_OWNERSHIP',
    );
    expect(result.requirementsNotApplicable.map((item) => item.code)).toContain(
      'BENEFICIAL_OWNERSHIP',
    );
  });

  it('links mandatory legal requirements to governing sources by reference', async () => {
    const result = await checklist.generate(context.serviceVersionId, {});

    expect(result.governingSourceReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          governingSourceId: context.governingSourceId,
          sourceReference: 'Section 4(1)(a)',
        }),
      ]),
    );
  });

  it('excludes expired and superseded requirements from current checklist', async () => {
    const identityRequirement = await prisma.serviceRequirement.findFirst({
      where: { serviceVersionId: context.serviceVersionId, code: 'IDENTITY_PROOF' },
    });
    const professionalRequirement = await prisma.serviceRequirement.findFirst({
      where: { serviceVersionId: context.serviceVersionId, code: 'PROFESSIONAL_LICENSE' },
    });

    expect(identityRequirement).not.toBeNull();
    expect(professionalRequirement).not.toBeNull();

    await prisma.serviceRequirement.update({
      where: { id: identityRequirement!.id },
      data: {
        effectiveUntil: new Date('2020-01-01'),
      },
    });

    await prisma.serviceRequirement.update({
      where: { id: professionalRequirement!.id },
      data: {
        effectiveState: ServiceRequirementEffectiveState.SUPERSEDED,
      },
    });

    const result = await checklist.generate(context.serviceVersionId, {});
    const codes = result.applicableRequirements.map((item) => item.code);

    expect(codes).not.toContain('IDENTITY_PROOF');
    expect(codes).not.toContain('PROFESSIONAL_LICENSE');
  });

  it('uses the exact requested service version', async () => {
    const otherVersion = await governmentServices.createVersion({
      governmentServiceId: context.serviceId,
      versionLabel: '2.0',
    });

    const result = await checklist.generate(otherVersion.id, {});

    expect(result.serviceVersionId).toBe(otherVersion.id);
    expect(result.versionLabel).toBe('2.0');
    expect(result.checklistComplete).toBe(false);
    expect(result.explanationCodes).toContain(
      SERVICE_CHECKLIST_EXPLANATION_CODES.NO_APPROVED_REQUIREMENT_SET,
    );
  });

  it('does not mark submitted documents as verified', async () => {
    const result = await checklist.generate(context.serviceVersionId, {
      activityType: 'CONSTRUCTION',
      submittedDocuments: ['ENGINEERING_PLANS'],
    });

    const engineeringPlans = result.conditionalRequirementsTriggered.find(
      (item) => item.code === 'ENGINEERING_PLANS',
    );

    expect(engineeringPlans?.evidenceStatus).toBe('SUBMITTED_NOT_VERIFIED');
    expect(engineeringPlans?.explanationCodes).toContain(
      SERVICE_CHECKLIST_EXPLANATION_CODES.DOCUMENT_SUBMITTED_NOT_VERIFIED,
    );
  });

  it('prevents professional document requirements from using ordinary form fields', async () => {
    await expect(
      requirements.create({
        serviceVersionId: context.serviceVersionId,
        code: 'INVALID_PRO_DOC',
        name: 'Invalid Professional Document',
        requirementType: ServiceRequirementType.PROFESSIONAL_DOCUMENT,
        mandatoryStatus: ServiceRequirementMandatoryStatus.MANDATORY,
        formFieldId: context.formFieldId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps declaration text immutable after publication', async () => {
    const declarations = app.get(DeclarationDefinitionsService);

    await expect(
      declarations.updateDeclarationText(context.declarationVersionId, 'Changed wording'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents silently adding mandatory requirements to published service versions', async () => {
    await expect(
      requirements.create({
        serviceVersionId: context.serviceVersionId,
        code: 'SILENT_REQUIREMENT',
        name: 'Silent Requirement',
        requirementType: ServiceRequirementType.INFORMATION,
        mandatoryStatus: ServiceRequirementMandatoryStatus.MANDATORY,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed when conditional rule facts are unknown', async () => {
    const result = await checklist.generate(context.serviceVersionId, {});

    expect(result.unresolvedRequirements.map((item) => item.code)).toContain(
      'BENEFICIAL_OWNERSHIP',
    );
    expect(result.checklistComplete).toBe(false);
  });

  it('does not claim checklist complete when no approved requirement set exists', async () => {
    const emptyVersion = await governmentServices.createVersion({
      governmentServiceId: context.serviceId,
      versionLabel: 'empty',
    });

    const result = await checklist.generate(emptyVersion.id, {});

    expect(result.checklistComplete).toBe(false);
    expect(result.explanationCodes).toContain(
      SERVICE_CHECKLIST_EXPLANATION_CODES.NO_APPROVED_REQUIREMENT_SET,
    );
  });

  it('exposes checklist generation through the HTTP API', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/services/checklist/generate')
      .send({
        serviceVersionId: context.serviceVersionId,
        facts: { applicantType: 'COMPANY', activityType: 'CONSTRUCTION' },
      })
      .expect(201);

    const body = response.body as ServiceChecklistBody;
    expect(body.mandatoryRequirements.length).toBeGreaterThan(0);
    expect(body.checklistComplete).toBe(true);
  });

  it('safe-halts when conditional applicability rule is not active', async () => {
    const draftVersion = await governmentServices.createVersion({
      governmentServiceId: context.serviceId,
      versionLabel: 'draft-inactive-rule',
    });

    const inactiveRule = await prisma.structuredApplicabilityRule.create({
      data: {
        serviceVersionId: draftVersion.id,
        code: 'INACTIVE_RULE',
        name: 'Inactive Rule',
        ruleType: StructuredApplicabilityRuleType.FACT_EQUALS,
        configuration: { factKey: 'applicantType', value: 'COMPANY' },
        status: 'DRAFT',
      },
    });

    const requirement = await requirements.create({
      serviceVersionId: draftVersion.id,
      code: 'INACTIVE_RULE_REQ',
      name: 'Inactive Rule Requirement',
      requirementType: ServiceRequirementType.INFORMATION,
      mandatoryStatus: ServiceRequirementMandatoryStatus.CONDITIONAL,
      applicabilityRuleId: inactiveRule.id,
    });

    await requirements.activateRequirement(requirement.id);

    const result = await checklist.generate(draftVersion.id, { applicantType: 'COMPANY' });
    expect(result.unresolvedRequirements.map((item) => item.code)).toContain('INACTIVE_RULE_REQ');
    expect(result.checklistComplete).toBe(false);
  });
});

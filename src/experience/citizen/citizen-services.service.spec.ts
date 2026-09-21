import { UnprocessableEntityException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ApplicantCategory } from '@prisma/client';

import { ApplicationsService } from '../../application-processing/applications/applications.service';
import { FormRenderService } from '../../service-catalog/forms/form-render.service';
import { PublicServiceDiscoveryService } from '../../service-catalog/public/public-service-discovery.service';
import { CitizenServicesService } from './citizen-services.service';

describe('CitizenServicesService', () => {
  let service: CitizenServicesService;
  let publicServiceDiscoveryService: {
    listServices: jest.Mock;
    matchServices: jest.Mock;
    getServiceBySlug: jest.Mock;
    evaluateEligibility: jest.Mock;
    getStartPackage: jest.Mock;
  };
  let formRenderService: { renderFormSchema: jest.Mock };
  let applicationsService: { createDraft: jest.Mock };

  const startPackage = {
    serviceId: 'service-1',
    serviceSlug: 'business-permit',
    serviceVersionId: 'version-1',
    versionLabel: '1.0.0',
    formDefinitionId: 'form-def-1',
    formVersionId: 'form-ver-1',
    formSchema: null,
    eligibilityGuidance: [],
    conditionalChecklist: [],
    feeDefinitions: [],
    dependencySummary: [],
    expectedStagesSummary: [],
    outputDefinitions: [],
    redressRoutes: [],
    serviceAvailability: 'ACTIVE',
    applicationCapable: true,
    publicDisclaimers: ['Nonbinding guidance'],
    configurationFingerprint: 'abc123fingerprint',
  };

  const renderedFormSchema = {
    formVersionId: 'form-ver-1',
    formDefinitionId: 'form-def-1',
    formDefinitionCode: 'FORM',
    version: 1,
    title: { en: 'Application' },
    status: 'PUBLISHED',
    sections: [
      {
        sectionKey: 'main',
        title: { en: 'Main' },
        displayOrder: 1,
        fields: [
          {
            fieldKey: 'businessName',
            label: { en: 'Business Name' },
            fieldType: 'TEXT',
            required: true,
            displayOrder: 1,
            dataClassification: 'STANDARD',
            validation: {},
            conditionalRules: [],
          },
          {
            fieldKey: 'declarationAccepted',
            label: { en: 'Declaration' },
            fieldType: 'DECLARATION',
            required: true,
            displayOrder: 2,
            dataClassification: 'STANDARD',
            validation: {},
            conditionalRules: [],
            declaration: {
              declarationVersion: '1.0',
              declarationText: { en: 'I declare the information is accurate.' },
            },
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    publicServiceDiscoveryService = {
      listServices: jest.fn(),
      matchServices: jest.fn(),
      getServiceBySlug: jest.fn(),
      evaluateEligibility: jest.fn(),
      getStartPackage: jest.fn(),
    };
    formRenderService = { renderFormSchema: jest.fn() };
    applicationsService = { createDraft: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenServicesService,
        { provide: PublicServiceDiscoveryService, useValue: publicServiceDiscoveryService },
        { provide: FormRenderService, useValue: formRenderService },
        { provide: ApplicationsService, useValue: applicationsService },
      ],
    }).compile();

    service = module.get(CitizenServicesService);
  });

  it('delegates service discovery to PublicServiceDiscoveryService', async () => {
    publicServiceDiscoveryService.listServices.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

    await service.listServices({ page: 1, limit: 20 });

    expect(publicServiceDiscoveryService.listServices).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('enriches start package with rendered form schema and next step', async () => {
    publicServiceDiscoveryService.getStartPackage.mockResolvedValue(startPackage);
    formRenderService.renderFormSchema.mockResolvedValue(renderedFormSchema);

    const result = await service.getStartExperience('business-permit', {});

    expect(result.formSchema).toEqual(renderedFormSchema);
    expect(result.requiredFields).toEqual(['businessName', 'declarationAccepted']);
    expect(result.declarations).toHaveLength(1);
    expect(result.expectedNextStep).toContain('submit your draft application');
    expect(result.configurationFingerprint).toBe('abc123fingerprint');
  });

  it('creates an application using resolved start package identifiers', async () => {
    publicServiceDiscoveryService.getStartPackage.mockResolvedValue(startPackage);
    applicationsService.createDraft.mockResolvedValue({ id: 'app-1' });

    await service.createApplication('business-permit', 'identity-1', {
      configurationFingerprint: 'abc123fingerprint',
      applicantCategory: ApplicantCategory.INDIVIDUAL,
      draftAnswers: { businessName: 'Acme' },
    });

    expect(publicServiceDiscoveryService.getStartPackage).toHaveBeenCalledWith('business-permit', {
      serviceVersionId: undefined,
      configurationFingerprint: 'abc123fingerprint',
    });
    expect(applicationsService.createDraft).toHaveBeenCalledWith('identity-1', {
      governmentServiceVersionId: 'version-1',
      formDefinitionId: 'form-def-1',
      formVersionId: 'form-ver-1',
      configurationFingerprint: 'abc123fingerprint',
      applicantCategory: ApplicantCategory.INDIVIDUAL,
      organizationId: undefined,
      representativeAuthorityId: undefined,
      draftAnswers: { businessName: 'Acme' },
    });
  });

  it('rejects application creation when start package lacks form configuration', async () => {
    publicServiceDiscoveryService.getStartPackage.mockResolvedValue({
      ...startPackage,
      formDefinitionId: null,
      formVersionId: null,
    });

    await expect(
      service.createApplication('business-permit', 'identity-1', {
        configurationFingerprint: 'abc123fingerprint',
        applicantCategory: ApplicantCategory.INDIVIDUAL,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InformationOnlyNotStartableException } from '../common/information-only-not-startable.exception';
import { ServiceCatalogCacheService } from '../common/service-catalog-cache.service';
import { VersionSupersededException } from '../common/version-superseded.exception';
import { PublicServiceDiscoveryService } from './public-service-discovery.service';

describe('PublicServiceDiscoveryService', () => {
  let service: PublicServiceDiscoveryService;
  let prisma: {
    governmentService: { findMany: jest.Mock };
    governmentServiceVersion: { findMany: jest.Mock; findFirst: jest.Mock };
    serviceFamily: { findMany: jest.Mock };
  };
  let cacheService: {
    buildListCacheKey: jest.Mock;
    buildDetailCacheKey: jest.Mock;
    buildFamiliesCacheKey: jest.Mock;
    buildStartPackageCacheKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };

  const versionRecord = {
    id: 'version-1',
    governmentServiceId: 'service-1',
    version: '1.0.0',
    purpose: 'Apply to operate a business.',
    publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
    maturityStatus: 'ACTIVE',
    coveredActivities: 'operate business',
    excludedActivities: 'banking',
    geographicScope: 'ABSEZ',
    authorityClassificationSummary: 'Delegated licensing',
    majorDependencies: [],
    typicalValidityDescription: '1 year',
    informationLastVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
    publicDisclaimer: 'Indicative only',
    formDefinitionId: 'form-def-1',
    formVersionId: 'form-ver-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    formDefinition: { id: 'form-def-1', code: 'FORM', name: 'Form' },
    formVersion: {
      id: 'form-ver-1',
      schema: { type: 'object', properties: { businessName: { type: 'string' } } },
    },
    applicantCategories: [{ category: ApplicantCategory.BUSINESS }],
    fees: [
      {
        id: 'fee-1',
        code: 'APPLICATION_FEE',
        label: 'Application fee',
        description: null,
        amountCents: 25000,
        currency: 'XCD',
        isVariable: false,
        sortOrder: 1,
      },
    ],
    eligibilityRules: [
      {
        id: 'rule-1',
        ruleCode: 'REGISTERED_BUSINESS',
        label: 'Registered business',
        description: 'Must be registered',
        configuration: { requiredAttribute: 'registeredBusiness', requiresTruthyAttribute: true },
        sortOrder: 1,
        isRequired: true,
      },
    ],
    checklistItems: [
      {
        id: 'check-1',
        itemCode: 'ID_DOCUMENT',
        label: 'Identification document',
        description: 'Valid ID',
        conditionExpression: null,
        sortOrder: 1,
        isRequired: true,
      },
    ],
    functionMappings: [],
    outputs: [
      {
        outputCode: 'LICENCE_CERTIFICATE',
        label: 'Operating licence certificate',
        description: null,
        validityLabel: '1 year',
        sortOrder: 1,
      },
    ],
    redressRoutes: [
      {
        routeCode: 'COMPLAINTS',
        label: 'Complaints desk',
        description: null,
        contactReference: 'complaints@example.gov',
        sortOrder: 1,
      },
    ],
    governmentService: {
      id: 'service-1',
      slug: 'business-operating-licence',
      publicName: 'Business Operating Licence',
      summary: 'Apply to operate a business.',
      catalogServiceType: CatalogServiceType.LICENCE,
      responsibleDepartment: { name: 'Licensing Department' },
      serviceFamily: { name: 'Business Licensing' },
    },
  };

  beforeEach(async () => {
    prisma = {
      governmentService: { findMany: jest.fn() },
      governmentServiceVersion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      serviceFamily: { findMany: jest.fn() },
    };

    cacheService = {
      buildListCacheKey: jest.fn().mockReturnValue('cache:list'),
      buildDetailCacheKey: jest.fn().mockReturnValue('cache:detail'),
      buildFamiliesCacheKey: jest.fn().mockReturnValue('cache:families'),
      buildStartPackageCacheKey: jest.fn().mockReturnValue('cache:start-package'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicServiceDiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServiceCatalogCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get(PublicServiceDiscoveryService);
  });

  it('lists only public summaries without restricted fields', async () => {
    prisma.governmentService.findMany.mockResolvedValue([
      { id: 'service-1', slug: 'business-operating-licence' },
    ]);
    prisma.governmentServiceVersion.findMany.mockResolvedValue([versionRecord]);

    const result = await service.listServices({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      slug: 'business-operating-licence',
      availabilityStatus: GovernmentServicePublicAvailability.ACTIVE,
      applicationCapable: true,
    });
    expect(result.items[0]).not.toHaveProperty('internalNotes');
  });

  it('returns nonbinding eligibility guidance', async () => {
    prisma.governmentServiceVersion.findMany.mockResolvedValue([versionRecord]);

    const result = await service.evaluateEligibility('business-operating-licence', {
      applicantCategory: ApplicantCategory.BUSINESS,
      attributes: { registeredBusiness: true },
    });

    expect(result.eligible).toBe(true);
    expect(result.nonbindingDisclaimer).toContain('informational only');
  });

  it('returns a version-pinned start package', async () => {
    prisma.governmentServiceVersion.findMany.mockResolvedValue([versionRecord]);

    const startPackage = await service.getStartPackage('business-operating-licence', {});

    expect(startPackage.serviceVersionId).toBe('version-1');
    expect(startPackage.configurationFingerprint).toHaveLength(64);
  });

  it('requires refresh when a pinned configuration fingerprint is superseded', async () => {
    prisma.governmentServiceVersion.findMany.mockResolvedValue([versionRecord]);

    await expect(
      service.getStartPackage('business-operating-licence', {
        configurationFingerprint: 'stale-fingerprint',
      }),
    ).rejects.toBeInstanceOf(VersionSupersededException);
  });

  it('rejects start packages for information-only services', async () => {
    prisma.governmentServiceVersion.findMany.mockResolvedValue([
      {
        ...versionRecord,
        publicAvailability: GovernmentServicePublicAvailability.INFORMATION_ONLY,
      },
    ]);

    await expect(service.getStartPackage('business-setup-guide', {})).rejects.toBeInstanceOf(
      InformationOnlyNotStartableException,
    );
  });

  it('throws not found when a suspended service is requested as active detail', async () => {
    prisma.governmentServiceVersion.findMany.mockResolvedValue([]);

    await expect(service.getServiceBySlug('suspended-export-permit')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

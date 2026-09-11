import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ServiceEligibilityRuleCategory, ServiceEligibilityRuleOperator } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceCatalogValidationService } from './service-catalog-validation.service';

describe('ServiceCatalogValidationService', () => {
  let service: ServiceCatalogValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceCatalogValidationService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get(ServiceCatalogValidationService);
  });

  it('rejects malformed rule configuration missing expectedValue for EQUALS', () => {
    expect(() => {
      service.validateRuleConfiguration({
        category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
        attributeKey: 'applicantCategory',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        expectedValue: undefined,
        reasonCode: 'TEST',
      });
    }).toThrow(BadRequestException);
  });

  it('rejects IN operator without array expectedValue', () => {
    expect(() => {
      service.validateRuleConfiguration({
        category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
        attributeKey: 'applicantCategory',
        operator: ServiceEligibilityRuleOperator.IN,
        expectedValue: 'INDIVIDUAL',
        reasonCode: 'TEST',
      });
    }).toThrow(BadRequestException);
  });

  it('accepts valid rule configuration', () => {
    expect(() => {
      service.validateRuleConfiguration({
        category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
        attributeKey: 'applicantCategory',
        operator: ServiceEligibilityRuleOperator.EQUALS,
        expectedValue: { value: 'INDIVIDUAL' },
        reasonCode: 'APPLICANT_CATEGORY_MATCH',
      });
    }).not.toThrow();
  });
});

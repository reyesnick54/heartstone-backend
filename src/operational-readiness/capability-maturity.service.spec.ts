import { BadRequestException } from '@nestjs/common';
import { CapabilityMaturityState } from '@prisma/client';

import { CapabilityMaturityService } from './capabilities/capability-maturity.service';
import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';

describe('CapabilityMaturityService', () => {
  const prisma = {
    capabilityVersion: { findUnique: jest.fn() },
    capabilityMaturityAssessment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productionReadinessAssessment: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
      fn({
        capabilityMaturityHistory: { create: jest.fn() },
        capabilityDefinition: { update: jest.fn() },
      }),
    ),
  };

  const definitionService = {
    findDefinitionById: jest.fn(),
  };

  const boundary = new OperationalReadinessBoundaryService();
  const service = new CapabilityMaturityService(
    prisma as never,
    boundary,
    definitionService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    definitionService.findDefinitionById.mockResolvedValue({
      id: 'cap-1',
      currentMaturityState: CapabilityMaturityState.CONCEPTUAL,
      isSuspended: false,
      isRetired: false,
      replacedByCapabilityId: null,
    });
    prisma.capabilityVersion.findUnique.mockResolvedValue({
      id: 'ver-1',
      capabilityDefinitionId: 'cap-1',
    });
  });

  it('preserves historical maturity through assessment and decision workflow', async () => {
    prisma.capabilityMaturityAssessment.create.mockResolvedValue({ id: 'assess-1' });
    prisma.capabilityMaturityAssessment.findUnique.mockResolvedValue({
      id: 'assess-1',
      capabilityDefinitionId: 'cap-1',
      capabilityVersionId: 'ver-1',
      currentMaturity: CapabilityMaturityState.CONCEPTUAL,
      requestedMaturity: CapabilityMaturityState.DESIGNED,
      decision: null,
      capabilityDefinition: {
        isSuspended: false,
        isRetired: false,
        replacedByCapabilityId: null,
      },
    });
    prisma.capabilityMaturityAssessment.update.mockResolvedValue({ id: 'assess-1', decision: 'APPROVED' });

    await service.createAssessment({
      capabilityDefinitionId: 'cap-1',
      capabilityVersionId: 'ver-1',
      requestedMaturity: CapabilityMaturityState.DESIGNED,
      evidence: [{ type: 'DESIGN_REVIEW', reference: 'ref-1' }],
    });

    await service.recordDecision({
      assessmentId: 'assess-1',
      decision: 'APPROVED',
      reviewerIdentityId: 'reviewer-1',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('blocks technical completion from advancing to production ready', async () => {
    definitionService.findDefinitionById.mockResolvedValue({
      id: 'cap-1',
      currentMaturityState: CapabilityMaturityState.PILOT_OPERATIONAL,
      isSuspended: false,
      isRetired: false,
      replacedByCapabilityId: null,
    });

    await expect(
      service.createAssessment({
        capabilityDefinitionId: 'cap-1',
        capabilityVersionId: 'ver-1',
        requestedMaturity: CapabilityMaturityState.PRODUCTION_READY,
        evidence: [{ type: 'CI_PIPELINE_SUCCESS', reference: 'build-1' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

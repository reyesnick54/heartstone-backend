import { ProductionReadinessStatus } from '@prisma/client';

import { OperationalReadinessBoundaryService } from './common/operational-readiness-boundary.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';

describe('ProductionReadinessService', () => {
  const prisma = {
    productionReadinessAssessment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productionReadinessRequirement: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    productionReadinessEvidence: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const definitionService = {
    findDefinitionById: jest.fn().mockResolvedValue({ id: 'cap-1' }),
  };

  const boundary = new OperationalReadinessBoundaryService();
  const service = new ProductionReadinessService(prisma as never, boundary, definitionService as never);

  it('links replayable readiness evidence', async () => {
    prisma.productionReadinessAssessment.create.mockResolvedValue({ id: 'assess-1' });
    prisma.productionReadinessRequirement.createMany.mockResolvedValue({ count: 25 });
    prisma.productionReadinessAssessment.findUnique.mockResolvedValue({
      id: 'assess-1',
      requirements: [],
      evidence: [],
    });
    prisma.productionReadinessEvidence.create.mockResolvedValue({
      id: 'ev-1',
      isReplayable: true,
      replaySnapshot: { status: 'READY' },
    });
    prisma.productionReadinessEvidence.findMany.mockResolvedValue([
      { id: 'ev-1', isReplayable: true, replaySnapshot: { status: 'READY' } },
    ]);

    await service.createAssessment({
      capabilityDefinitionId: 'cap-1',
      capabilityVersionId: 'ver-1',
    });

    await service.submitEvidence({
      assessmentId: 'assess-1',
      evidenceReference: 'evidence://readiness/1',
      evidenceType: 'READINESS_CHECKLIST',
      replaySnapshot: { status: 'READY' },
    });

    const replayable = await service.getReplayableEvidence('assess-1');
    expect(replayable).toHaveLength(1);
    expect(replayable[0]?.isReplayable).toBe(true);
  });

  it('requires measurable conditions for READY_WITH_CONDITIONS', async () => {
    await expect(
      service.updateRequirementStatus({
        requirementId: 'req-1',
        status: ProductionReadinessStatus.READY_WITH_CONDITIONS,
        measurableConditions: [],
      }),
    ).rejects.toThrow();
  });
});

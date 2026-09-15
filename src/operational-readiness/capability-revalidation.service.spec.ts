import { CapabilityMaturityState, CapabilityRevalidationTrigger } from '@prisma/client';

import { CapabilityRevalidationService } from './revalidation/capability-revalidation.service';

describe('CapabilityRevalidationService', () => {
  const prisma = {
    capabilityRevalidationRequirement: { create: jest.fn() },
    capabilityDefinition: { update: jest.fn() },
    capabilityVersion: { findFirst: jest.fn() },
    capabilityMaturityHistory: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
      fn({
        capabilityDefinition: { update: jest.fn() },
        capabilityVersion: { findFirst: jest.fn().mockResolvedValue({ id: 'ver-1' }) },
        capabilityMaturityHistory: { create: jest.fn() },
      }),
    ),
  };

  const definitionService = {
    findDefinitionById: jest.fn(),
  };

  const service = new CapabilityRevalidationService(prisma as never, definitionService as never);

  beforeEach(() => {
    jest.clearAllMocks();
    definitionService.findDefinitionById.mockResolvedValue({
      id: 'cap-1',
      currentMaturityState: CapabilityMaturityState.PRODUCTION_READY,
    });
    prisma.capabilityRevalidationRequirement.create.mockResolvedValue({ id: 'rev-1' });
  });

  it('triggers revalidation state on material change', async () => {
    const result = await service.triggerFromMaterialChange(
      'cap-1',
      CapabilityRevalidationTrigger.RELEASE_CHANGE,
      'New release deployed',
      'actor-1',
    );

    expect(result).toEqual({ id: 'rev-1' });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

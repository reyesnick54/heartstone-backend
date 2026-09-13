import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { CaseEventPublicVisibility, CaseEventType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CaseEventService } from './case-event.service';

describe('CaseEventService', () => {
  let service: CaseEventService;

  const prisma = {
    case: {
      findUnique: jest.fn(),
    },
    caseEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaseEventService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CaseEventService);
    jest.clearAllMocks();
  });

  it('appends events as append-only records', async () => {
    prisma.case.findUnique.mockResolvedValue({ id: 'case-1' });
    prisma.caseEvent.create.mockResolvedValue({
      id: 'event-1',
      caseId: 'case-1',
      eventType: CaseEventType.CASE_OPENED,
    });

    const result = await service.append({
      caseId: 'case-1',
      eventType: CaseEventType.CASE_OPENED,
      publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
    });

    expect(result.id).toBe('event-1');
    expect(prisma.caseEvent.create).toHaveBeenCalled();
  });

  it('rejects append when case does not exist', async () => {
    prisma.case.findUnique.mockResolvedValue(null);

    await expect(
      service.append({ caseId: 'missing', eventType: CaseEventType.CASE_OPENED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update attempts', async () => {
    await expect(service.updateEvent()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects delete attempts', async () => {
    await expect(service.deleteEvent()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters applicant timeline to applicant-visible events', async () => {
    prisma.case.findUnique.mockResolvedValue({ id: 'case-1' });
    prisma.caseEvent.findMany.mockResolvedValue([]);

    await service.listApplicantVisibleTimeline('case-1');

    expect(prisma.caseEvent.findMany).toHaveBeenCalledWith({
      where: {
        caseId: 'case-1',
        publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
        eventType: { notIn: [CaseEventType.SAFE_HALT] },
      },
      orderBy: { occurredAt: 'asc' },
      take: 50,
    });
  });
});

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Appointment, AppointmentStatus, AppointmentType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const officeId = 'office-1';
  const officeholderId = 'holder-1';

  const baseAppointment: Appointment = {
    id: 'appointment-1',
    officeId,
    officeholderId,
    referenceCode: 'APPT-001',
    appointmentType: AppointmentType.PERMANENT,
    status: AppointmentStatus.ACTIVE,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    instrumentReference: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const prisma = {
    office: {
      findUnique: jest.fn(),
    },
    officeholder: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  it('creates a valid appointment', async () => {
    prisma.office.findUnique.mockResolvedValue({ id: officeId });
    prisma.officeholder.findUnique.mockResolvedValue({ id: officeholderId });
    prisma.appointment.findUnique.mockResolvedValue(null);
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.create.mockResolvedValue(baseAppointment);

    const result = await service.create({
      officeId,
      officeholderId,
      referenceCode: 'APPT-001',
      appointmentType: AppointmentType.PERMANENT,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result).toEqual(baseAppointment);
    expect(prisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        officeId,
        officeholderId,
        referenceCode: 'APPT-001',
        status: AppointmentStatus.ACTIVE,
      }) as Record<string, unknown>,
    });
  });

  it('rejects an invalid office', async () => {
    prisma.office.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        officeId: 'missing-office',
        officeholderId,
        referenceCode: 'APPT-002',
        appointmentType: AppointmentType.ACTING,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an invalid officeholder', async () => {
    prisma.office.findUnique.mockResolvedValue({ id: officeId });
    prisma.officeholder.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        officeId,
        officeholderId: 'missing-holder',
        referenceCode: 'APPT-003',
        appointmentType: AppointmentType.ACTING,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an invalid date period', async () => {
    await expect(
      service.create({
        officeId,
        officeholderId,
        referenceCode: 'APPT-004',
        appointmentType: AppointmentType.FIXED_TERM,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
        effectiveUntil: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('preserves ended appointments via update', async () => {
    const endedAppointment = {
      ...baseAppointment,
      status: AppointmentStatus.ENDED,
      effectiveUntil: new Date('2026-12-31T23:59:59.999Z'),
    };

    prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
    prisma.appointment.update.mockResolvedValue(endedAppointment);

    const result = await service.update(baseAppointment.id, {
      status: AppointmentStatus.ENDED,
      effectiveUntil: new Date('2026-12-31T23:59:59.999Z'),
    });

    expect(result.status).toBe(AppointmentStatus.ENDED);
    expect(prisma.appointment.update).toHaveBeenCalled();
  });

  it('preserves revoked appointments via update', async () => {
    const revokedAppointment = {
      ...baseAppointment,
      status: AppointmentStatus.REVOKED,
    };

    prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
    prisma.appointment.update.mockResolvedValue(revokedAppointment);

    const result = await service.update(baseAppointment.id, {
      status: AppointmentStatus.REVOKED,
    });

    expect(result.status).toBe(AppointmentStatus.REVOKED);
  });

  it('returns current appointments for an office', async () => {
    prisma.office.findUnique.mockResolvedValue({ id: officeId });
    prisma.appointment.findMany.mockResolvedValue([baseAppointment]);

    const result = await service.findCurrentForOffice(officeId);

    expect(result).toEqual([baseAppointment]);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          officeId,
          status: AppointmentStatus.ACTIVE,
        }) as Record<string, unknown>,
      }),
    );
  });

  it('rejects overlapping active appointments for the same office', async () => {
    prisma.office.findUnique.mockResolvedValue({ id: officeId });
    prisma.officeholder.findUnique.mockResolvedValue({ id: officeholderId });
    prisma.appointment.findUnique.mockResolvedValue(null);
    prisma.appointment.findMany.mockResolvedValue([
      {
        ...baseAppointment,
        id: 'existing-active',
        referenceCode: 'APPT-EXISTING',
      },
    ]);

    await expect(
      service.create({
        officeId,
        officeholderId,
        referenceCode: 'APPT-OVERLAP',
        appointmentType: AppointmentType.ACTING,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate reference codes', async () => {
    prisma.office.findUnique.mockResolvedValue({ id: officeId });
    prisma.officeholder.findUnique.mockResolvedValue({ id: officeholderId });
    prisma.appointment.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.create({
        officeId,
        officeholderId,
        referenceCode: 'APPT-001',
        appointmentType: AppointmentType.PERMANENT,
        status: AppointmentStatus.PLANNED,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(ConflictException);
  });
});

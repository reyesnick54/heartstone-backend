import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Appointment, AppointmentStatus, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { type CreateAppointmentDto } from './dto/create-appointment.dto';
import { type ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { type UpdateAppointmentDto } from './dto/update-appointment.dto';

const OPEN_ENDED_PERIOD = new Date('9999-12-31T23:59:59.999Z');

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    this.assertValidPeriod(dto.effectiveFrom, dto.effectiveUntil ?? null);

    await this.assertOfficeExists(dto.officeId);
    await this.assertOfficeholderExists(dto.officeholderId);
    await this.assertReferenceCodeAvailable(dto.referenceCode);

    if (dto.status === AppointmentStatus.ACTIVE) {
      await this.assertNoOverlappingActiveAppointments(
        dto.officeId,
        dto.effectiveFrom,
        dto.effectiveUntil ?? null,
      );
    }

    try {
      return await this.prisma.appointment.create({
        data: {
          officeId: dto.officeId,
          officeholderId: dto.officeholderId,
          referenceCode: dto.referenceCode,
          appointmentType: dto.appointmentType,
          status: dto.status,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil ?? null,
          instrumentReference: dto.instrumentReference ?? null,
          notes: dto.notes ?? null,
        },
      });
    } catch (error) {
      this.handleUniqueConstraintError(error, dto.referenceCode);
      throw error;
    }
  }

  async findAll(query: ListAppointmentsQueryDto): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.officeId) {
      where.officeId = query.officeId;
    }

    if (query.officeholderId) {
      where.officeholderId = query.officeholderId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.appointmentType) {
      where.appointmentType = query.appointmentType;
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found`);
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const existing = await this.findById(id);

    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil === undefined ? existing.effectiveUntil : dto.effectiveUntil;
    const status = dto.status ?? existing.status;

    this.assertValidPeriod(effectiveFrom, effectiveUntil);

    if (status === AppointmentStatus.ACTIVE) {
      await this.assertNoOverlappingActiveAppointments(
        existing.officeId,
        effectiveFrom,
        effectiveUntil,
        id,
      );
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.appointmentType !== undefined ? { appointmentType: dto.appointmentType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: dto.effectiveFrom } : {}),
        ...(dto.effectiveUntil !== undefined ? { effectiveUntil: dto.effectiveUntil } : {}),
        ...(dto.instrumentReference !== undefined
          ? { instrumentReference: dto.instrumentReference }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async findCurrentForOffice(officeId: string): Promise<Appointment[]> {
    await this.assertOfficeExists(officeId);
    return this.findCurrentAppointments({ officeId });
  }

  async findCurrentForOfficeholder(officeholderId: string): Promise<Appointment[]> {
    await this.assertOfficeholderExists(officeholderId);
    return this.findCurrentAppointments({ officeholderId });
  }

  private async findCurrentAppointments(
    filter: Pick<Prisma.AppointmentWhereInput, 'officeId' | 'officeholderId'>,
  ): Promise<Appointment[]> {
    const now = new Date();

    return this.prisma.appointment.findMany({
      where: {
        ...filter,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private assertValidPeriod(effectiveFrom: Date, effectiveUntil: Date | null): void {
    if (effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new BadRequestException('effectiveUntil must not precede effectiveFrom');
    }
  }

  private async assertOfficeExists(officeId: string): Promise<void> {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
    });

    if (!office) {
      throw new NotFoundException(`Office with id "${officeId}" was not found`);
    }
  }

  private async assertOfficeholderExists(officeholderId: string): Promise<void> {
    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id: officeholderId },
    });

    if (!officeholder) {
      throw new NotFoundException(`Officeholder with id "${officeholderId}" was not found`);
    }
  }

  private async assertReferenceCodeAvailable(referenceCode: string): Promise<void> {
    const existing = await this.prisma.appointment.findUnique({
      where: { referenceCode },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Appointment referenceCode "${referenceCode}" is already in use`);
    }
  }

  private async assertNoOverlappingActiveAppointments(
    officeId: string,
    effectiveFrom: Date,
    effectiveUntil: Date | null,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const activeAppointments = await this.prisma.appointment.findMany({
      where: {
        officeId,
        status: AppointmentStatus.ACTIVE,
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });

    const overlapping = activeAppointments.filter((appointment) =>
      this.periodsOverlap(
        effectiveFrom,
        effectiveUntil,
        appointment.effectiveFrom,
        appointment.effectiveUntil,
      ),
    );

    if (overlapping.length > 0) {
      throw new ConflictException(
        'An active appointment already exists for this office during the requested effective period',
      );
    }
  }

  private periodsOverlap(
    fromA: Date,
    untilA: Date | null,
    fromB: Date,
    untilB: Date | null,
  ): boolean {
    const endA = untilA ?? OPEN_ENDED_PERIOD;
    const endB = untilB ?? OPEN_ENDED_PERIOD;
    return fromA <= endB && fromB <= endA;
  }

  private handleUniqueConstraintError(error: unknown, referenceCode: string): void {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new ConflictException(`Appointment referenceCode "${referenceCode}" is already in use`);
    }
  }
}

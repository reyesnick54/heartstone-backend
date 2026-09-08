import { Injectable, NotFoundException } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../common/appointment-current.util';
import { GovernmentStructureValidationService } from '../common/government-structure-validation.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: GovernmentStructureValidationService,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    await this.validation.ensureOfficeExists(dto.officeId);
    await this.validation.ensureOfficeholderExists(dto.officeholderId);

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const appointment = await this.prisma.appointment.create({
      data: {
        officeId: dto.officeId,
        officeholderId: dto.officeholderId,
        status: dto.status ?? AppointmentStatus.PENDING,
        effectiveFrom,
        effectiveUntil,
      },
    });

    return this.toResponse(appointment);
  }

  async findAll(query: QueryAppointmentsDto): Promise<AppointmentResponseDto[]> {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.officeId !== undefined) {
      where.officeId = query.officeId;
    }

    if (query.officeholderId !== undefined) {
      where.officeholderId = query.officeholderId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async findOne(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });

    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found`);
    }

    return this.toResponse(appointment);
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Appointment with id "${id}" was not found`);
    }

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil === undefined
        ? existing.effectiveUntil
        : dto.effectiveUntil === null
          ? null
          : new Date(dto.effectiveUntil);

    this.validation.validateEffectivePeriod(effectiveFrom, effectiveUntil);

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: dto.status,
        effectiveFrom,
        effectiveUntil,
      },
    });

    return this.toResponse(appointment);
  }

  toResponse(appointment: Appointment, at: Date = new Date()): AppointmentResponseDto {
    return {
      id: appointment.id,
      officeId: appointment.officeId,
      officeholderId: appointment.officeholderId,
      status: appointment.status,
      effectiveFrom: appointment.effectiveFrom,
      effectiveUntil: appointment.effectiveUntil,
      isCurrent: isAppointmentCurrent(appointment, at),
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}

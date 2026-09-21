import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SCHEDULING_API_TAG } from '../scheduling.constants';
import { AppointmentSlotsService } from './appointment-slots.service';

class CreateAppointmentSlotDto {
  @IsUUID()
  institutionId!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  governmentServiceId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

@ApiTags(SCHEDULING_API_TAG)
@ApiBearerAuth()
@Controller('scheduling/slots')
@UseGuards(SessionAuthGuard)
export class AppointmentSlotsController {
  constructor(private readonly slots: AppointmentSlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment slot' })
  create(@Body() dto: CreateAppointmentSlotDto) {
    return this.slots.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List available appointment slots' })
  list(
    @Query('institutionId') institutionId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('governmentServiceId') governmentServiceId?: string,
  ) {
    return this.slots.listAvailable({ institutionId, departmentId, governmentServiceId });
  }
}

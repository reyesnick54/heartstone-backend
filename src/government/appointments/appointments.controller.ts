import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { AppointmentsService } from './appointments.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
@DenyByDefaultAdministrative()
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.GOVERNMENT_APPOINTMENT_CREATE)
  @ApiOperation({ summary: 'Create an appointment' })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.GOVERNMENT_APPOINTMENT_READ)
  @ApiOperation({ summary: 'List appointments' })
  @ApiOkResponse({ type: AppointmentResponseDto, isArray: true })
  findAll(@Query() query: QueryAppointmentsDto): Promise<AppointmentResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_APPOINTMENT_READ)
  @ApiOperation({ summary: 'Get an appointment by id' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_APPOINTMENT_UPDATE)
  @ApiOperation({ summary: 'Update an appointment' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.service.update(id, dto);
  }
}

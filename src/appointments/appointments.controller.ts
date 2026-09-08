import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppointmentsService } from './appointments.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment record' })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.appointmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointment records with optional filters' })
  @ApiOkResponse({ type: AppointmentResponseDto, isArray: true })
  findAll(@Query() query: ListAppointmentsQueryDto): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findAll(query);
  }

  @Get('current/by-office/:officeId')
  @ApiOperation({ summary: 'List current active appointments for an office' })
  @ApiOkResponse({ type: AppointmentResponseDto, isArray: true })
  findCurrentForOffice(@Param('officeId') officeId: string): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findCurrentForOffice(officeId);
  }

  @Get('current/by-officeholder/:officeholderId')
  @ApiOperation({
    summary: 'List current active appointments for an officeholder',
  })
  @ApiOkResponse({ type: AppointmentResponseDto, isArray: true })
  findCurrentForOfficeholder(
    @Param('officeholderId') officeholderId: string,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findCurrentForOfficeholder(officeholderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment record by id' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  findById(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment record' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.update(id, dto);
  }
}

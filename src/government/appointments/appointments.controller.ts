import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppointmentsService } from './appointments.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment' })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments' })
  @ApiOkResponse({ type: AppointmentResponseDto, isArray: true })
  findAll(@Query() query: QueryAppointmentsDto): Promise<AppointmentResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by id' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AppointmentResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.service.update(id, dto);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  @ApiCreatedResponse({ type: DepartmentResponseDto })
  create(@Body() dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List departments' })
  @ApiOkResponse({ type: DepartmentResponseDto, isArray: true })
  findAll(@Query() query: QueryDepartmentsDto): Promise<DepartmentResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by id' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DepartmentResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.service.update(id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  @ApiCreatedResponse({ type: DepartmentResponseDto })
  create(@Body() dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    return this.departmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List departments' })
  @ApiOkResponse({ type: DepartmentResponseDto, isArray: true })
  findAll(@Query() query: ListDepartmentsQueryDto): Promise<DepartmentResponseDto[]> {
    return this.departmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by id' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  findById(@Param('id') id: string): Promise<DepartmentResponseDto> {
    return this.departmentService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.update(id, dto);
  }
}

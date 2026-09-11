import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('identity-organizations')
@Controller('identity/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  create(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  @ApiOkResponse({ type: OrganizationResponseDto, isArray: true })
  findAll(@Query() query: QueryOrganizationsDto): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization metadata' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate an organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.activate(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend an organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.suspend(id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke an organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.revoke(id);
  }
}

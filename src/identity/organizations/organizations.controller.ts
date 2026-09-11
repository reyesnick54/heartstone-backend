import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }
}

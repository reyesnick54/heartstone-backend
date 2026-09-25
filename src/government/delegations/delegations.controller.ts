import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { QueryDelegationsDto } from './dto/query-delegations.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';

@ApiTags('delegations')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Government structure administration",
  authorityRequirement: "Institutional configuration authority (not self-granted)",
  actorSource: "Authenticated institutional administrator",
  primarySecurityInvariant: "Government structure facts remain separate from identity privilege",
})
@Controller('delegations')
export class DelegationsController {
  constructor(private readonly service: DelegationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a delegation' })
  @ApiCreatedResponse({ type: DelegationResponseDto })
  create(@Body() dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List delegations' })
  @ApiOkResponse({ type: DelegationResponseDto, isArray: true })
  findAll(@Query() query: QueryDelegationsDto): Promise<DelegationResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delegation by id' })
  @ApiOkResponse({ type: DelegationResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DelegationResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a delegation' })
  @ApiOkResponse({ type: DelegationResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDelegationDto,
  ): Promise<DelegationResponseDto> {
    return this.service.update(id, dto);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { QueryPersonsDto } from './dto/query-persons.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonsService } from './persons.service';

@ApiTags('identity-persons')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Identity administration or authenticated self-service session',
  authorityRequirement: 'No government authority inferred from identity alone',
  actorSource: 'Session identity or institutional administrator',
  primarySecurityInvariant: 'User != Officeholder != Role != Permission != Authority',
})
@Controller('identity/persons')
@DenyByDefaultAdministrative()
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.IDENTITY_PERSON_CREATE)
  @ApiOperation({ summary: 'Create a person record' })
  @ApiCreatedResponse({ type: PersonResponseDto })
  create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.personsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.IDENTITY_PERSON_READ)
  @ApiOperation({ summary: 'List persons' })
  @ApiOkResponse({ type: PersonResponseDto, isArray: true })
  findAll(@Query() query: QueryPersonsDto): Promise<PersonResponseDto[]> {
    return this.personsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_PERSON_READ)
  @ApiOperation({ summary: 'Get a person by id' })
  @ApiOkResponse({ type: PersonResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PersonResponseDto> {
    return this.personsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.IDENTITY_PERSON_UPDATE)
  @ApiOperation({ summary: 'Update person metadata' })
  @ApiOkResponse({ type: PersonResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.personsService.update(id, dto);
  }
}

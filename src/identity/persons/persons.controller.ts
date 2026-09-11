import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { QueryPersonsDto } from './dto/query-persons.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonsService } from './persons.service';

@ApiTags('identity-persons')
@Controller('identity/persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a person record' })
  @ApiCreatedResponse({ type: PersonResponseDto })
  create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.personsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List persons' })
  @ApiOkResponse({ type: PersonResponseDto, isArray: true })
  findAll(@Query() query: QueryPersonsDto): Promise<PersonResponseDto[]> {
    return this.personsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person by id' })
  @ApiOkResponse({ type: PersonResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PersonResponseDto> {
    return this.personsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update person metadata' })
  @ApiOkResponse({ type: PersonResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.personsService.update(id, dto);
  }
}

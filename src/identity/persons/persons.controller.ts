import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a person by id' })
  @ApiOkResponse({ type: PersonResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PersonResponseDto> {
    return this.personsService.findOne(id);
  }
}

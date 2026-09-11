import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CreateFunctionGoverningSourceDto } from './dto/create-function-governing-source.dto';
import { FunctionGoverningSourceResponseDto } from './dto/function-governing-source-response.dto';
import { UpdateFunctionGoverningSourceDto } from './dto/update-function-governing-source.dto';
import { FunctionGoverningSourcesService } from './function-governing-sources.service';

@ApiTags('authority-function-sources')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('authority/functions/:functionId/governing-sources')
export class FunctionGoverningSourcesController {
  constructor(private readonly functionGoverningSourcesService: FunctionGoverningSourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Link a governing source to a function' })
  @ApiCreatedResponse({ type: FunctionGoverningSourceResponseDto })
  link(
    @Param('functionId', ParseUUIDPipe) functionId: string,
    @Body() dto: CreateFunctionGoverningSourceDto,
  ): Promise<FunctionGoverningSourceResponseDto> {
    return this.functionGoverningSourcesService.link(functionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'View function-source crosswalk' })
  @ApiOkResponse({ type: FunctionGoverningSourceResponseDto, isArray: true })
  findByFunction(
    @Param('functionId', ParseUUIDPipe) functionId: string,
  ): Promise<FunctionGoverningSourceResponseDto[]> {
    return this.functionGoverningSourcesService.findByFunction(functionId);
  }

  @Patch(':linkId')
  @ApiOperation({ summary: 'Update a function-source crosswalk link' })
  @ApiOkResponse({ type: FunctionGoverningSourceResponseDto })
  update(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: UpdateFunctionGoverningSourceDto,
  ): Promise<FunctionGoverningSourceResponseDto> {
    return this.functionGoverningSourcesService.update(linkId, dto);
  }
}

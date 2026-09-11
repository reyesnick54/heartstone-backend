import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GenerateChecklistDto } from './dto/generate-checklist.dto';
import { ServiceChecklistResponseDto } from './dto/service-checklist-response.dto';
import { ServiceChecklistService } from './service-checklist.service';

@ApiTags('services/checklist')
@Controller('services/checklist')
export class ServiceChecklistController {
  constructor(private readonly checklistService: ServiceChecklistService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate an informational pre-application checklist for a service version',
  })
  async generate(@Body() dto: GenerateChecklistDto): Promise<ServiceChecklistResponseDto> {
    return this.checklistService.generate(dto.serviceVersionId, dto.facts ?? {});
  }
}

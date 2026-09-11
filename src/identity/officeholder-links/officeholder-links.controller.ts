import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOfficeholderLinkDto } from './dto/create-officeholder-link.dto';
import { OfficeholderLinkResponseDto } from './dto/officeholder-link-response.dto';
import { OfficeholderLinksService } from './officeholder-links.service';

@ApiTags('identity-officeholder-links')
@Controller('identity/officeholder-links')
export class OfficeholderLinksController {
  constructor(private readonly officeholderLinksService: OfficeholderLinksService) {}

  @Post()
  @ApiOperation({
    summary: 'Link an identity to an officeholder (controlled path, no authority conferred)',
  })
  @ApiCreatedResponse({ type: OfficeholderLinkResponseDto })
  create(@Body() dto: CreateOfficeholderLinkDto): Promise<OfficeholderLinkResponseDto> {
    return this.officeholderLinksService.create(dto);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { SessionContextDto } from '../auth/dto/session-context.dto';
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
  create(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateOfficeholderLinkDto,
  ): Promise<OfficeholderLinkResponseDto> {
    return this.officeholderLinksService.create(dto, session.identityId);
  }
}

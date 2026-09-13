import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { InstrumentDownloadService } from './instrument-download.service';

@ApiTags('instrument-downloads')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('instruments')
export class InstrumentDownloadController {
  constructor(private readonly downloadService: InstrumentDownloadService) {}

  @Get(':officialInstrumentId/download')
  @ApiOperation({ summary: 'Download the exact stored issued instrument version' })
  @Header('Cache-Control', 'private, no-store')
  async downloadIssuedVersion(
    @Param('officialInstrumentId', ParseUUIDPipe) officialInstrumentId: string,
    @Query('versionId') versionId: string | undefined,
    @CurrentSession() session: SessionContextDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.downloadService.downloadIssuedVersion(
      officialInstrumentId,
      session.identityId,
      versionId,
    );

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.originalFilename}"`);
    response.setHeader('X-Instrument-Version-Id', result.instrumentVersionId);
    response.setHeader('X-Instrument-Version-Number', String(result.versionNumber));
    response.setHeader('X-Content-Sha256', result.contentSha256);
    response.send(result.content);
  }
}

import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { HistoricalReplayService } from './historical-replay.service';

class ReplayQueryDto {
  @IsDateString()
  asOf!: string;
}

@ApiTags('evidence-records-replay')
@Controller('evidence-records/replay')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ReplayController {
  constructor(private readonly replayService: HistoricalReplayService) {}

  @Get('master-files/:masterAdministrativeFileId')
  @ApiQuery({ name: 'asOf', required: true, type: String })
  reconstruct(
    @Param('masterAdministrativeFileId', ParseUUIDPipe) masterAdministrativeFileId: string,
    @Query() query: ReplayQueryDto,
  ) {
    return this.replayService.reconstructAt(masterAdministrativeFileId, new Date(query.asOf));
  }
}

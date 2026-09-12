import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { EvidenceRecordsAccessService } from '../common/evidence-records-access.service';
import { MasterFilesService } from './master-files.service';

@ApiTags('master-files')
@Controller('master-files')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class MasterFilesController {
  constructor(
    private readonly access: EvidenceRecordsAccessService,
    private readonly masterFiles: MasterFilesService,
  ) {}

  @Get(':id')
  async findById(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.masterFiles.findById(id, session.identityId, isOfficial);
  }

  @Post(':id/completeness')
  getCompleteness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { requiredRequirementCodes?: string[] },
  ) {
    return this.masterFiles.assessCompleteness(id, body.requiredRequirementCodes ?? []);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterFiles.close(id);
  }
}

import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ExecuteDispositionDto } from './dto/execute-disposition.dto';
import { RequestDispositionDto } from './dto/request-disposition.dto';
import { RecordDispositionService } from './record-disposition.service';

@ApiTags('evidence-records-retention')
@Controller('evidence-records/retention')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class RetentionController {
  constructor(private readonly dispositionService: RecordDispositionService) {}

  @Post('disposition-requests')
  requestDisposition(
    @CurrentSession() session: SessionContextDto,
    @Body() body: RequestDispositionDto,
  ) {
    return this.dispositionService.requestDisposition({
      ...body,
      requestedByIdentityId: session.identityId,
    });
  }

  @Post('disposition-requests/:id/execute')
  executeDisposition(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ExecuteDispositionDto,
  ) {
    return this.dispositionService.execute({
      dispositionRequestId: id,
      executedByIdentityId: session.identityId,
      ...body,
    });
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { ArchivalTransfersService } from './archival/archival-transfers.service';
import { RecordsClassificationsService } from './classifications/records-classifications.service';
import { RecordDispositionService } from './disposition/record-disposition.service';
import { LegalHoldsService } from './legal-hold/legal-holds.service';
import { RetentionSchedulesService } from './retention/retention-schedules.service';

@ApiTags('evidence-records')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Evidence governance, document custody, or applicant document scope",
  authorityRequirement: "Document/evidence access guard or institutional evidence role",
  actorSource: "Session identity with applicant or official actor context",
  primarySecurityInvariant: "Evidence quality and verification cannot be client-asserted",
})
@Controller('evidence-records')
export class EvidenceRecordsController {
  constructor(
    private readonly classificationsService: RecordsClassificationsService,
    private readonly retentionSchedulesService: RetentionSchedulesService,
    private readonly legalHoldsService: LegalHoldsService,
    private readonly dispositionService: RecordDispositionService,
    private readonly archivalTransfersService: ArchivalTransfersService,
  ) {}

  @Post('classifications')
  createClassification(@Body() body: Parameters<RecordsClassificationsService['create']>[0]) {
    return this.classificationsService.create(body);
  }

  @Post('retention-schedules')
  createRetentionSchedule(@Body() body: Parameters<RetentionSchedulesService['create']>[0]) {
    return this.retentionSchedulesService.create(body);
  }

  @Post('legal-holds')
  createLegalHold(@Body() body: Parameters<LegalHoldsService['create']>[0]) {
    return this.legalHoldsService.create(body);
  }

  @Post('legal-holds/:id/release')
  releaseLegalHold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Parameters<LegalHoldsService['release']>[1],
  ) {
    return this.legalHoldsService.release(id, body);
  }

  @Post('disposition/evaluate')
  evaluateDisposition(
    @Body() body: Parameters<RecordDispositionService['evaluateEligibility']>[0],
  ) {
    return this.dispositionService.evaluateEligibility(body);
  }

  @Post('disposition/requests')
  createDispositionRequest(@Body() body: Parameters<RecordDispositionService['createRequest']>[0]) {
    return this.dispositionService.createRequest(body);
  }

  @Get('retention-schedules/:code/history')
  getScheduleHistory(@Param('code') code: string) {
    return this.retentionSchedulesService.getVersionHistory(code);
  }
}

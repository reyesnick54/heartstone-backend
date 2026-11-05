import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { RequirePermissions } from '../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../technical-access/constants/permission-codes.constants';
import { ArchivalTransfersService } from './archival/archival-transfers.service';
import { RecordsClassificationsService } from './classifications/records-classifications.service';
import { RecordDispositionService } from './disposition/record-disposition.service';
import { CreateLegalHoldDto, ReleaseLegalHoldDto } from './dto/legal-hold.dto';
import { LegalHoldsService } from './legal-hold/legal-holds.service';
import { RetentionSchedulesService } from './retention/retention-schedules.service';

type WithoutActor<T, K extends keyof T> = Omit<T, K>;

/**
 * Records governance administration: classifications, retention, legal holds, disposition.
 * Restricted: every route needs an explicit technical permission, and every acting officer
 * is the signed-in identity rather than a request field.
 */
@ApiTags('evidence-records')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Records governance administration',
  authorityRequirement: 'Configured records permissions; legal hold release is level F',
  actorSource: 'Session identity only',
  primarySecurityInvariant: 'Evidence quality and verification cannot be client-asserted',
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
  @RequirePermissions(PermissionCodes.RECORDS_CLASSIFICATION_MANAGE)
  createClassification(@Body() body: Parameters<RecordsClassificationsService['create']>[0]) {
    return this.classificationsService.create(body);
  }

  @Post('retention-schedules')
  @RequirePermissions(PermissionCodes.RECORDS_RETENTION_SCHEDULE_MANAGE)
  createRetentionSchedule(@Body() body: Parameters<RetentionSchedulesService['create']>[0]) {
    return this.retentionSchedulesService.create(body);
  }

  @Post('legal-holds')
  @RequirePermissions(PermissionCodes.RECORDS_LEGAL_HOLD_PLACE)
  createLegalHold(@CurrentSession() session: SessionContextDto, @Body() dto: CreateLegalHoldDto) {
    return this.legalHoldsService.create({
      holdNumber: dto.holdNumber,
      title: dto.title,
      authorityReference: dto.authorityReference,
      reason: dto.reason,
      effectiveFrom: dto.effectiveFrom,
      targets: dto.targets.map((target) => ({
        targetType: target.targetType,
        targetReference: target.targetReference,
        recordsClassificationId: target.recordsClassificationId,
        notes: target.notes,
      })),
      issuedByIdentityId: session.identityId,
    });
  }

  @Post('legal-holds/:id/release')
  @RequirePermissions(PermissionCodes.RECORDS_LEGAL_HOLD_RELEASE)
  releaseLegalHold(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseLegalHoldDto,
  ) {
    return this.legalHoldsService.release(id, {
      releasedByIdentityId: session.identityId,
      releaseAuthorityReference: dto.releaseAuthorityReference,
      releaseReason: dto.releaseReason,
    });
  }

  @Post('disposition/evaluate')
  @RequirePermissions(PermissionCodes.RECORDS_DISPOSITION_REQUEST)
  evaluateDisposition(
    @Body() body: Parameters<RecordDispositionService['evaluateEligibility']>[0],
  ) {
    return this.dispositionService.evaluateEligibility(body);
  }

  @Post('disposition/requests')
  @RequirePermissions(PermissionCodes.RECORDS_DISPOSITION_REQUEST)
  createDispositionRequest(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: WithoutActor<
      Parameters<RecordDispositionService['createRequest']>[0],
      'requestedByIdentityId'
    >,
  ) {
    return this.dispositionService.createRequest({
      ...body,
      requestedByIdentityId: session.identityId,
    });
  }

  @Get('retention-schedules/:code/history')
  @RequirePermissions(PermissionCodes.RECORDS_RETENTION_SCHEDULE_READ)
  getScheduleHistory(@Param('code') code: string) {
    return this.retentionSchedulesService.getVersionHistory(code);
  }
}

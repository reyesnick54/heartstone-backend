import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';
import { CreateStrategicProjectProfileDto } from '../dto/create-strategic-project-profile.dto';
import { DeriveProjectStatusProjectionDto } from '../dto/derive-project-status-projection.dto';
import { RecordStrategicProjectStageDto } from '../dto/record-strategic-project-stage.dto';
import { ProjectStatusProjectionService } from './project-status-projection.service';
import { StrategicProjectProfileService } from './strategic-project-profile.service';
import { StrategicProjectStageService } from './strategic-project-stage.service';

@ApiTags('intelligence/strategic-projects')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('intelligence/strategic-projects')
export class StrategicProjectController {
  constructor(
    private readonly profileService: StrategicProjectProfileService,
    private readonly stageService: StrategicProjectStageService,
    private readonly projectionService: ProjectStatusProjectionService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  @Post()
  createProfile(@Body() dto: CreateStrategicProjectProfileDto) {
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    return this.profileService.createProfile({
      projectCode: dto.projectCode,
      title: dto.title,
      description: dto.description,
      sponsoringInstitutionId: dto.sponsoringInstitutionId,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      caseId: dto.caseId,
      sectorCode: dto.sectorCode,
      attributionMetadata: dto.attributionMetadata as Prisma.InputJsonValue,
      externalFactorNotes: dto.externalFactorNotes,
      announcementDate: dto.announcementDate ? new Date(dto.announcementDate) : undefined,
    });
  }

  @Get(':profileId')
  getProfile(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.profileService.getProfile(profileId);
  }

  @Post(':profileId/stages')
  recordStage(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: RecordStrategicProjectStageDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    return this.stageService.recordStage({
      profileId,
      stage: dto.stage,
      institutionalStateReference: dto.institutionalStateReference,
      effectiveFrom: new Date(dto.effectiveFrom),
      recordedByIdentityId: session.identityId,
      sourceRecordType: dto.sourceRecordType,
      sourceRecordId: dto.sourceRecordId,
    });
  }

  @Post(':profileId/projections/derive')
  deriveProjection(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: DeriveProjectStatusProjectionDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    return this.projectionService.deriveProjection({
      profileId,
      audience: dto.audience,
      evidenceCutoffAt: dto.evidenceCutoffAt ? new Date(dto.evidenceCutoffAt) : undefined,
      derivedByIdentityId: session.identityId,
    });
  }
}

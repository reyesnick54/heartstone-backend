import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '../database/prisma.service';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ScopedResourceType } from '../institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../institutional-scope/resource-access.service';
import { MasterFileCompletenessAssessmentService } from './completeness/master-file-completeness-assessment.service';
import { AssessMasterFileCompletenessDto } from './dto/assess-master-file-completeness.dto';
import { MasterAdministrativeFileService } from './master-administrative-file.service';
import {
  MasterAdministrativeFileAccessService,
  type MasterFileAccessContext,
} from './master-administrative-file-access.service';
import { MasterAdministrativeFileIndexService } from './master-administrative-file-index.service';

@ApiTags('records')
@Controller('records/master-files')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class MasterAdministrativeFileController {
  constructor(
    private readonly masterFileService: MasterAdministrativeFileService,
    private readonly indexService: MasterAdministrativeFileIndexService,
    private readonly accessService: MasterAdministrativeFileAccessService,
    private readonly completenessAssessment: MasterFileCompletenessAssessmentService,
    private readonly prisma: PrismaService,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  @Get('by-case/:caseId')
  @ApiOperation({ summary: 'Get Master Administrative File by case' })
  async getByCaseId(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    await this.resourceAccess.assertVisibility(session, ScopedResourceType.CASE, caseId);
    const accessContext = await this.buildAccessContext(session.identityId);
    const file = await this.masterFileService.findByCaseId(caseId);
    const accessLevel = await this.accessService.resolveAccessLevel(file, accessContext);
    return this.accessService.sanitizeFileView(accessLevel, file);
  }

  @Post('initialize/by-case/:caseId')
  @ApiOperation({ summary: 'Initialize Master Administrative File for a case' })
  @ApiCreatedResponse({ description: 'Canonical one-to-one Master File created for case' })
  async initializeForCase(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    const file = await this.masterFileService.initializeForCase({
      caseId,
      actorIdentityId: session.identityId,
    });
    const accessContext = await this.buildAccessContext(session.identityId);
    const accessLevel = await this.accessService.resolveAccessLevel(file, accessContext);
    return this.accessService.sanitizeFileView(accessLevel, file);
  }

  @Post(':id/completeness')
  @ApiOperation({ summary: 'Assess Master Administrative File evidence completeness' })
  @ApiCreatedResponse({
    description:
      'Completeness outcome for required evidence requirements. Does not constitute approval.',
  })
  async assessCompleteness(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssessMasterFileCompletenessDto,
  ) {
    await this.resourceAccess.assertVisibility(
      session,
      ScopedResourceType.MASTER_ADMINISTRATIVE_FILE,
      id,
    );
    const accessContext = await this.buildAccessContext(session.identityId);
    const file = await this.masterFileService.findById(id);
    await this.accessService.resolveAccessLevel(file, accessContext);
    return this.completenessAssessment.assess({
      masterAdministrativeFileId: id,
      requiredRequirementCodes: dto.requiredRequirementCodes,
    });
  }

  @Get(':id/index')
  @ApiOperation({ summary: 'Get Master Administrative File index' })
  @ApiOkResponse({ description: 'Section index referencing existing Phase 3–6 records' })
  async getIndex(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.resourceAccess.assertVisibility(
      session,
      ScopedResourceType.MASTER_ADMINISTRATIVE_FILE,
      id,
    );
    const accessContext = await this.buildAccessContext(session.identityId);
    return this.indexService.buildIndex(id, accessContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Master Administrative File metadata' })
  @ApiOkResponse({ description: 'Institutional file metadata with minimum-necessary fields' })
  async getById(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.resourceAccess.assertVisibility(
      session,
      ScopedResourceType.MASTER_ADMINISTRATIVE_FILE,
      id,
    );
    const accessContext = await this.buildAccessContext(session.identityId);
    const file = await this.masterFileService.findById(id);
    const accessLevel = await this.accessService.resolveAccessLevel(file, accessContext);
    return this.accessService.sanitizeFileView(accessLevel, file);
  }

  private async buildAccessContext(identityId: string): Promise<MasterFileAccessContext> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: {
        type: true,
        officeholderLinks: {
          where: { status: 'ACTIVE' },
          select: {
            officeholderId: true,
            officeholder: {
              select: {
                appointments: {
                  where: { status: 'ACTIVE' },
                  select: { officeId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!identity) {
      throw new Error(`Identity "${identityId}" was not found`);
    }

    const linkedOfficeIds = identity.officeholderLinks.flatMap((link) =>
      link.officeholder.appointments.map((appointment) => appointment.officeId),
    );

    return {
      identityId,
      identityType: identity.type,
      officeholderId: identity.officeholderLinks[0]?.officeholderId,
      linkedOfficeIds,
    };
  }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ElectronicSealService } from './electronic-seal.service';

class RequestSealUseDto {
  @IsUUID()
  sealId!: string;

  @IsUUID()
  signableInstrumentBindingId!: string;

  @IsUUID()
  documentVersionId!: string;

  @IsString()
  documentHash!: string;

  @IsString()
  instrumentType!: string;

  @IsUUID()
  functionAuthorityRecordId!: string;

  @IsUUID()
  officeholderId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsDateString()
  expirationAt!: string;
}

class ApproveSealUseDto {
  @IsUUID()
  authorizationId!: string;

  @IsUUID()
  custodyAssignmentId!: string;

  @IsUUID()
  approverOfficeholderId!: string;

  @IsOptional()
  @IsString()
  sealImageReference?: string;
}

@ApiTags('decisions-issuance-seal')
@Controller('decisions-issuance/seal')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ElectronicSealController {
  constructor(private readonly sealService: ElectronicSealService) {}

  @Post('use/request')
  @ApiOperation({ summary: 'Request institutional seal application (prepare)' })
  requestSealUse(@CurrentSession() session: SessionContextDto, @Body() dto: RequestSealUseDto) {
    return this.sealService.requestSealUse({
      sealId: dto.sealId,
      signableInstrumentBindingId: dto.signableInstrumentBindingId,
      documentVersionId: dto.documentVersionId,
      documentHash: dto.documentHash,
      instrumentType: dto.instrumentType,
      preparerIdentityId: session.identityId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      officeholderId: dto.officeholderId,
      appointmentId: dto.appointmentId,
      expirationAt: new Date(dto.expirationAt),
    });
  }

  @Post('use/approve')
  @ApiOperation({ summary: 'Approve and apply institutional seal (dual control)' })
  approveSealUse(@CurrentSession() session: SessionContextDto, @Body() dto: ApproveSealUseDto) {
    return this.sealService.approveAndApplySeal({
      authorizationId: dto.authorizationId,
      approverIdentityId: session.identityId,
      approverOfficeholderId: dto.approverOfficeholderId,
      custodyAssignmentId: dto.custodyAssignmentId,
      sealImageReference: dto.sealImageReference,
    });
  }
}

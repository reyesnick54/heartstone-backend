import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorityActionType, ProfessionalAttestationSource } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class EvaluateAuthorityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiProperty({ enum: AuthorityActionType })
  @IsEnum(AuthorityActionType)
  action!: AuthorityActionType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  officeholderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delegationId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceProvided?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualificationCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  transactionAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSecondApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasConsultation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSupervision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasLiaison?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSelfApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isConflicted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecused?: boolean;

  @ApiPropertyOptional({ enum: AuthorityActionType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AuthorityActionType, { each: true })
  priorActions?: AuthorityActionType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  externalDataAccessOnly?: boolean;

  @ApiPropertyOptional({ enum: ProfessionalAttestationSource })
  @IsOptional()
  @IsEnum(ProfessionalAttestationSource)
  attestationSource?: ProfessionalAttestationSource;
}

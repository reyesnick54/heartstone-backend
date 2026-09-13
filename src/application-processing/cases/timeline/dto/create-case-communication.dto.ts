import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CaseCommunicationChannel,
  CaseCommunicationType,
  CaseEventPublicVisibility,
  CaseRecipientType,
  CaseRecordClassification,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCaseCommunicationDto {
  @ApiProperty({ enum: CaseCommunicationType })
  @IsEnum(CaseCommunicationType)
  communicationType!: CaseCommunicationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  senderIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  senderOfficeholderId?: string;

  @ApiProperty({ enum: CaseRecipientType })
  @IsEnum(CaseRecipientType)
  recipientType!: CaseRecipientType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientReference?: string;

  @ApiProperty({ enum: CaseCommunicationChannel })
  @IsEnum(CaseCommunicationChannel)
  channel!: CaseCommunicationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateVersion?: string;

  @ApiPropertyOptional({ enum: CaseRecordClassification })
  @IsOptional()
  @IsEnum(CaseRecordClassification)
  classification?: CaseRecordClassification;

  @ApiPropertyOptional({ enum: CaseEventPublicVisibility })
  @IsOptional()
  @IsEnum(CaseEventPublicVisibility)
  publicVisibility?: CaseEventPublicVisibility;
}

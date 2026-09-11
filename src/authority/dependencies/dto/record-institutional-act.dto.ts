import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionalActType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RecordInstitutionalActDto {
  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  externalAuthorityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorIdentityId?: string;

  @ApiProperty({ enum: InstitutionalActType })
  @IsEnum(InstitutionalActType)
  actType!: InstitutionalActType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  decisionOrAction!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidenceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  legalEffect?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  performedAt?: Date;
}

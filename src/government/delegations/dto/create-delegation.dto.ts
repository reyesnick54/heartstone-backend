import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDelegationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delegatorOfficeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delegatorOfficeholderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipientOfficeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipientOfficeholderId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  scopeDescription!: string;

  @ApiPropertyOptional({ enum: DelegationStatus, default: DelegationStatus.PENDING })
  @IsOptional()
  @IsEnum(DelegationStatus)
  status?: DelegationStatus;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

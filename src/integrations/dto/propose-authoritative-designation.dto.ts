import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthoritativeSourceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ProposeAuthoritativeDesignationDto {
  @ApiProperty({ enum: AuthoritativeSourceStatus })
  @IsEnum(AuthoritativeSourceStatus)
  sourceStatus!: AuthoritativeSourceStatus;

  @ApiProperty({ description: 'Actor role for authority boundary checks' })
  @IsString()
  @MaxLength(128)
  actorRole!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designatingAuthorityIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designatingOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  acceptanceRecordId?: string;
}

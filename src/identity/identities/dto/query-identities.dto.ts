import { ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryIdentitiesDto {
  @ApiPropertyOptional({ enum: IdentityType })
  @IsOptional()
  @IsEnum(IdentityType)
  type?: IdentityType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userAccountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  personId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

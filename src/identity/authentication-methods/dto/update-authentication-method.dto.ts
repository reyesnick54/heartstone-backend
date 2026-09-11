import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAuthenticationMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: AssuranceLevel })
  @IsOptional()
  @IsEnum(AssuranceLevel)
  assuranceLevel?: AssuranceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oidcIssuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcAudience?: string;
}

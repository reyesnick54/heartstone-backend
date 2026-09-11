import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryServiceStartPackageDto {
  @ApiPropertyOptional({ description: 'Pin to a specific published service version id' })
  @IsOptional()
  @IsUUID()
  serviceVersionId?: string;

  @ApiPropertyOptional({ description: 'Previously issued configuration fingerprint for version pinning' })
  @IsOptional()
  @IsString()
  configurationFingerprint?: string;
}

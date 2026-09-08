import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DelegationTargetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeholderId?: string;
}

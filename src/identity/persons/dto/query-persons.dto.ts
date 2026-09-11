import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryPersonsDto {
  @ApiPropertyOptional({ description: 'Filter by family name (exact match)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  familyName?: string;
}

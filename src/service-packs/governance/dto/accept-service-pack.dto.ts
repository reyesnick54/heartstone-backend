import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class AcceptServicePackDto {
  @ApiProperty()
  @IsUUID()
  servicePackVersionId!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  acceptedScope?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  acceptanceConditions?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  unresolvedAcceptedRisks?: unknown[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityMaturityAssessmentDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RecordMaturityDecisionDto {
  @ApiProperty({ enum: CapabilityMaturityAssessmentDecision })
  @IsEnum(CapabilityMaturityAssessmentDecision)
  decision!: CapabilityMaturityAssessmentDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorRoleMarker?: string;
}

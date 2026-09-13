import { ApiProperty } from '@nestjs/swagger';
import { GovernmentDecisionOutcome } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGovernmentDecisionDto {
  @ApiProperty()
  @IsUUID()
  caseId!: string;

  @ApiProperty()
  @IsString()
  decisionTypeCode!: string;

  @ApiProperty()
  @IsUUID()
  decisionMakerOfficeholderId!: string;

  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiProperty({ required: false, enum: GovernmentDecisionOutcome })
  @IsOptional()
  @IsEnum(GovernmentDecisionOutcome)
  outcome?: GovernmentDecisionOutcome;
}

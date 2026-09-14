import { AIHumanDispositionType } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

class AiToolCallDto {
  @IsString()
  toolReference!: string;

  @IsString()
  action!: string;
}

export class RecordAiExecutionDto {
  @IsUUID()
  aiUseCaseVersionId!: string;

  @IsUUID()
  aiModelVersionId!: string;

  @IsOptional()
  @IsUUID()
  aiAgentVersionId?: string;

  @IsOptional()
  @IsUUID()
  aiOutputContractId?: string;

  @IsOptional()
  @IsUUID()
  aiPromptPolicyId?: string;

  @IsUUID()
  actorIdentityId!: string;

  @IsOptional()
  @IsUUID()
  humanReviewerIdentityId?: string;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  promptPolicyVersion?: string;

  @IsOptional()
  @IsString()
  policyReference?: string;

  @IsOptional()
  @IsString()
  promptContent?: string;

  @IsOptional()
  @IsArray()
  inputSourceReferences?: string[];

  @IsOptional()
  @IsArray()
  untrustedDocumentContents?: string[];

  @IsOptional()
  @IsArray()
  toolsCalled?: AiToolCallDto[];

  @IsOptional()
  @IsArray()
  retrievedRecordReferences?: string[];

  @IsString()
  outputSummary!: string;

  @IsOptional()
  @IsString()
  outputReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @IsOptional()
  @IsArray()
  limitations?: string[];

  @IsOptional()
  @IsString()
  humanChangesSummary?: string;

  @IsOptional()
  @IsString()
  decisionAffectedReference?: string;

  @IsOptional()
  @IsString()
  requestedCaseReference?: string;

  @IsOptional()
  @IsString()
  permittedCaseReference?: string;
}

export class RecordAiHumanDispositionDto {
  @IsUUID()
  aiExecutionRecordId!: string;

  @IsUUID()
  recorderIdentityId!: string;

  @IsEnum(AIHumanDispositionType)
  disposition!: AIHumanDispositionType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  revisedOutputReference?: string;
}

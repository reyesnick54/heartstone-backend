import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityActionType,
  DecisionEffectiveDateRule,
  DecisionMakerActorType,
  DecisionOutcomeCode,
  DecisionPublicationStatus,
  DecisionRequirementElementType,
  DecisionSignatureTiming,
  EvidencePacketPurpose,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DecisionRequirementElementDto {
  @ApiProperty({ enum: DecisionRequirementElementType })
  @IsEnum(DecisionRequirementElementType)
  elementType!: DecisionRequirementElementType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: EvidencePacketPurpose })
  @IsOptional()
  @IsEnum(EvidencePacketPurpose)
  evidencePacketPurpose?: EvidencePacketPurpose;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  consultationInstitutionId?: string;
}

export class CreateDecisionTypeVersionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiProperty({ enum: AuthorityActionType, example: AuthorityActionType.DECIDE })
  @IsEnum(AuthorityActionType)
  requiredAuthorityAction!: AuthorityActionType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  governmentServiceVersionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  governingSourceId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  decisionStandardDescription!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  matterScopeDescription!: string;

  @ApiPropertyOptional()
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  effectiveUntil?: Date;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresFrozenEvidencePacket?: boolean;

  @ApiPropertyOptional({ enum: EvidencePacketPurpose })
  @IsOptional()
  @IsEnum(EvidencePacketPurpose)
  requiredEvidencePacketPurpose?: EvidencePacketPurpose;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresIndependentReviewer?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresConflictCheck?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresProfessionalReview?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresGovernmentConsultation?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresConcurrence?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresDualControl?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresPanelOrQuorum?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresReasons?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresNotice?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresSeal?: boolean;

  @ApiPropertyOptional({ enum: DecisionSignatureTiming })
  @IsOptional()
  @IsEnum(DecisionSignatureTiming)
  signatureTiming?: DecisionSignatureTiming;

  @ApiPropertyOptional({ enum: DecisionEffectiveDateRule })
  @IsOptional()
  @IsEnum(DecisionEffectiveDateRule)
  effectiveDateRule?: DecisionEffectiveDateRule;

  @ApiPropertyOptional({ enum: DecisionPublicationStatus })
  @IsOptional()
  @IsEnum(DecisionPublicationStatus)
  publicationStatus?: DecisionPublicationStatus;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  reviewOrAppealConfiguration?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  instrumentIssuanceExpected?: boolean;

  @ApiPropertyOptional({
    enum: DecisionMakerActorType,
    default: DecisionMakerActorType.OFFICEHOLDER,
  })
  @IsOptional()
  @IsEnum(DecisionMakerActorType)
  authorizedDecisionMakerType?: DecisionMakerActorType;

  @ApiProperty({ enum: DecisionOutcomeCode, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DecisionOutcomeCode, { each: true })
  permissibleOutcomeCodes!: DecisionOutcomeCode[];

  @ApiPropertyOptional({ type: [DecisionRequirementElementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecisionRequirementElementDto)
  requirementElements?: DecisionRequirementElementDto[];
}

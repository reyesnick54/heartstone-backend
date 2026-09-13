import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityActionType,
  DecisionEffectiveDateRule,
  DecisionMakerActorType,
  DecisionOutcomeCode,
  DecisionPublicationStatus,
  DecisionRequirementElementType,
  DecisionSignatureTiming,
  DecisionTypeLifecycleStatus,
  EvidencePacketPurpose,
} from '@prisma/client';

export class DecisionRequirementElementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: DecisionRequirementElementType })
  elementType!: DecisionRequirementElementType;

  @ApiProperty()
  isRequired!: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  configuration?: Record<string, unknown> | null;

  @ApiPropertyOptional({ enum: EvidencePacketPurpose })
  evidencePacketPurpose?: EvidencePacketPurpose | null;

  @ApiPropertyOptional({ format: 'uuid' })
  consultationInstitutionId?: string | null;
}

export class DecisionTypeVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  decisionTypeDefinitionId!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'uuid' })
  functionAuthorityRecordId!: string;

  @ApiProperty({ enum: AuthorityActionType })
  requiredAuthorityAction!: AuthorityActionType;

  @ApiPropertyOptional({ format: 'uuid' })
  governmentServiceVersionId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  governingSourceId?: string | null;

  @ApiProperty()
  decisionStandardDescription!: string;

  @ApiProperty()
  matterScopeDescription!: string;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: DecisionTypeLifecycleStatus })
  status!: DecisionTypeLifecycleStatus;

  @ApiProperty()
  requiresFrozenEvidencePacket!: boolean;

  @ApiPropertyOptional({ enum: EvidencePacketPurpose })
  requiredEvidencePacketPurpose?: EvidencePacketPurpose | null;

  @ApiProperty()
  requiresIndependentReviewer!: boolean;

  @ApiProperty()
  requiresConflictCheck!: boolean;

  @ApiProperty()
  requiresProfessionalReview!: boolean;

  @ApiProperty()
  requiresGovernmentConsultation!: boolean;

  @ApiProperty()
  requiresConcurrence!: boolean;

  @ApiProperty()
  requiresDualControl!: boolean;

  @ApiProperty()
  requiresPanelOrQuorum!: boolean;

  @ApiProperty()
  requiresReasons!: boolean;

  @ApiProperty()
  requiresNotice!: boolean;

  @ApiProperty()
  requiresSignature!: boolean;

  @ApiProperty()
  requiresSeal!: boolean;

  @ApiPropertyOptional({ enum: DecisionSignatureTiming })
  signatureTiming?: DecisionSignatureTiming | null;

  @ApiPropertyOptional({ enum: DecisionEffectiveDateRule })
  effectiveDateRule?: DecisionEffectiveDateRule | null;

  @ApiProperty({ enum: DecisionPublicationStatus })
  publicationStatus!: DecisionPublicationStatus;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  reviewOrAppealConfiguration?: Record<string, unknown> | null;

  @ApiProperty()
  instrumentIssuanceExpected!: boolean;

  @ApiProperty({ enum: DecisionMakerActorType })
  authorizedDecisionMakerType!: DecisionMakerActorType;

  @ApiPropertyOptional({ format: 'uuid' })
  supersededByVersionId?: string | null;

  @ApiPropertyOptional()
  institutionallyAcceptedAt?: Date | null;

  @ApiPropertyOptional()
  operationallyActivatedAt?: Date | null;

  @ApiProperty({ enum: DecisionOutcomeCode, isArray: true })
  permissibleOutcomeCodes!: DecisionOutcomeCode[];

  @ApiProperty({ type: [DecisionRequirementElementResponseDto] })
  requirementElements!: DecisionRequirementElementResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  EvidenceQualityExpectation,
  ServiceRequirementMandatoryStatus,
  ServiceRequirementType,
} from '@prisma/client';

import { type RequirementSatisfactionMechanism } from '../../services.constants';

export class GoverningSourceReferenceDto {
  @ApiProperty()
  governingSourceId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  sourceReference!: string;
}

export class ChecklistRequirementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  publicDescription?: string | null;

  @ApiProperty({ enum: ServiceRequirementType })
  requirementType!: ServiceRequirementType;

  @ApiProperty({ enum: ServiceRequirementMandatoryStatus })
  mandatoryStatus!: ServiceRequirementMandatoryStatus;

  @ApiProperty({ enum: EvidenceQualityExpectation, required: false })
  evidenceQualityExpectation?: EvidenceQualityExpectation | null;

  @ApiProperty()
  verificationRequired!: boolean;

  @ApiProperty({ required: false })
  sourceReference?: string | null;

  @ApiProperty({ required: false })
  governingSourceId?: string | null;

  @ApiProperty({ required: false })
  formFieldId?: string | null;

  @ApiProperty({ required: false })
  declarationDefinitionVersionId?: string | null;

  @ApiProperty()
  satisfactionMechanism!: RequirementSatisfactionMechanism;

  @ApiProperty({
    description: 'Informational only. Document submission does not imply verification.',
  })
  evidenceStatus!: 'NOT_SUBMITTED' | 'SUBMITTED_NOT_VERIFIED';

  @ApiProperty({ type: [String] })
  explanationCodes!: string[];
}

export class ServiceChecklistResponseDto {
  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty()
  versionLabel!: string;

  @ApiProperty({ type: [ChecklistRequirementDto] })
  applicableRequirements!: ChecklistRequirementDto[];

  @ApiProperty({ type: [ChecklistRequirementDto] })
  mandatoryRequirements!: ChecklistRequirementDto[];

  @ApiProperty({ type: [ChecklistRequirementDto] })
  conditionalRequirementsTriggered!: ChecklistRequirementDto[];

  @ApiProperty({ type: [ChecklistRequirementDto] })
  requirementsNotApplicable!: ChecklistRequirementDto[];

  @ApiProperty({ type: [ChecklistRequirementDto] })
  unresolvedRequirements!: ChecklistRequirementDto[];

  @ApiProperty({ type: [GoverningSourceReferenceDto] })
  governingSourceReferences!: GoverningSourceReferenceDto[];

  @ApiProperty({ type: [String] })
  explanationCodes!: string[];

  @ApiProperty({
    description:
      'Informational completeness only. Does not imply eligibility, approval, or verified evidence.',
  })
  checklistComplete!: boolean;
}

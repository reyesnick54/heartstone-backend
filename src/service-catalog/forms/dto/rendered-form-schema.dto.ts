import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FormConditionalAction,
  FormConditionalLogic,
  FormConditionalOperator,
  FormDataClassification,
  FormFieldType,
  FormVersionStatus,
} from '@prisma/client';

/*
 * OpenAPI contracts mirroring the RenderedFormSchema family in
 * ../types/form-engine.types.ts. Localized text is a map keyed by locale code.
 */

const LOCALIZED_TEXT = {
  type: 'object',
  additionalProperties: { type: 'string' },
  description: 'Localized text keyed by locale code',
} as const;

export class FormConditionClauseSchemaDto {
  @ApiProperty()
  fieldKey!: string;

  @ApiProperty({ enum: FormConditionalOperator })
  operator!: FormConditionalOperator;

  @ApiPropertyOptional({ description: 'Comparison value (any JSON value)' })
  value?: unknown;
}

export class FormConditionalRuleSchemaDto {
  @ApiProperty({ enum: FormConditionalAction })
  action!: FormConditionalAction;

  @ApiProperty({ type: () => [FormConditionClauseSchemaDto] })
  conditions!: FormConditionClauseSchemaDto[];

  @ApiProperty({ enum: FormConditionalLogic })
  logic!: FormConditionalLogic;
}

export class FormFieldOptionSchemaDto {
  @ApiProperty()
  value!: string;

  @ApiProperty(LOCALIZED_TEXT)
  label!: Record<string, string>;
}

export class FormDeclarationOptionsDto {
  @ApiProperty()
  declarationVersion!: string;

  @ApiProperty(LOCALIZED_TEXT)
  declarationText!: Record<string, string>;
}

export class FormValidationSchemaDto {
  @ApiPropertyOptional()
  minLength?: number;

  @ApiPropertyOptional()
  maxLength?: number;

  @ApiPropertyOptional()
  min?: number;

  @ApiPropertyOptional()
  max?: number;

  @ApiPropertyOptional()
  minDate?: string;

  @ApiPropertyOptional()
  maxDate?: string;

  @ApiPropertyOptional({ type: [String] })
  allowedValues?: string[];

  @ApiPropertyOptional()
  pattern?: string;

  @ApiPropertyOptional({ enum: ['ALPHANUMERIC', 'NUMERIC', 'POSTAL_CODE'] })
  patternPreset?: 'ALPHANUMERIC' | 'NUMERIC' | 'POSTAL_CODE';

  @ApiPropertyOptional()
  equalsField?: string;

  @ApiPropertyOptional()
  notEqualsField?: string;

  @ApiPropertyOptional()
  countryCode?: boolean;
}

export class RenderedFormFieldSchemaDto {
  @ApiProperty()
  fieldKey!: string;

  @ApiProperty(LOCALIZED_TEXT)
  label!: Record<string, string>;

  @ApiPropertyOptional(LOCALIZED_TEXT)
  description?: Record<string, string>;

  @ApiProperty({ enum: FormFieldType })
  fieldType!: FormFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiProperty()
  displayOrder!: number;

  @ApiPropertyOptional({ description: 'Default value (any JSON value)' })
  defaultValue?: unknown;

  @ApiPropertyOptional(LOCALIZED_TEXT)
  placeholder?: Record<string, string>;

  @ApiProperty({ enum: FormDataClassification })
  dataClassification!: FormDataClassification;

  @ApiProperty({ type: () => FormValidationSchemaDto })
  validation!: FormValidationSchemaDto;

  @ApiPropertyOptional({ type: () => [FormFieldOptionSchemaDto] })
  options?: FormFieldOptionSchemaDto[];

  @ApiPropertyOptional({ type: () => FormDeclarationOptionsDto })
  declaration?: FormDeclarationOptionsDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  sourceMetadata?: Record<string, unknown>;

  @ApiProperty({ type: () => [FormConditionalRuleSchemaDto] })
  conditionalRules!: FormConditionalRuleSchemaDto[];
}

export class RenderedFormSectionSchemaDto {
  @ApiProperty()
  sectionKey!: string;

  @ApiProperty(LOCALIZED_TEXT)
  title!: Record<string, string>;

  @ApiPropertyOptional(LOCALIZED_TEXT)
  description?: Record<string, string>;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty({ type: () => [RenderedFormFieldSchemaDto] })
  fields!: RenderedFormFieldSchemaDto[];
}

export class RenderedFormSchemaDto {
  @ApiProperty()
  formVersionId!: string;

  @ApiProperty()
  formDefinitionId!: string;

  @ApiProperty()
  formDefinitionCode!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty(LOCALIZED_TEXT)
  title!: Record<string, string>;

  @ApiPropertyOptional(LOCALIZED_TEXT)
  instructions?: Record<string, string>;

  @ApiProperty({ enum: FormVersionStatus })
  status!: FormVersionStatus;

  @ApiPropertyOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  effectiveUntil?: string;

  @ApiProperty({ type: () => [RenderedFormSectionSchemaDto] })
  sections!: RenderedFormSectionSchemaDto[];
}

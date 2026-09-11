import {
  type FormConditionalAction,
  type FormConditionalLogic,
  type FormConditionalOperator,
  type FormDataClassification,
  type FormFieldType,
  type FormVersionStatus,
} from '@prisma/client';

export interface FormConditionClause {
  fieldKey: string;
  operator: FormConditionalOperator;
  value?: unknown;
}

export interface FormConditionalRuleDefinition {
  action: FormConditionalAction;
  conditions: FormConditionClause[];
  logic: FormConditionalLogic;
}

export interface FormFieldOptionDefinition {
  value: string;
  label: Record<string, string>;
}

export interface FormDeclarationOptions {
  declarationVersion: string;
  declarationText: Record<string, string>;
}

export interface FormValidationDefinition {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  allowedValues?: string[];
  pattern?: string;
  patternPreset?: 'ALPHANUMERIC' | 'NUMERIC' | 'POSTAL_CODE';
  equalsField?: string;
  notEqualsField?: string;
  countryCode?: boolean;
}

export interface RenderedFormFieldSchema {
  fieldKey: string;
  label: Record<string, string>;
  description?: Record<string, string>;
  fieldType: FormFieldType;
  required: boolean;
  displayOrder: number;
  defaultValue?: unknown;
  placeholder?: Record<string, string>;
  dataClassification: FormDataClassification;
  validation: FormValidationDefinition;
  options?: FormFieldOptionDefinition[];
  declaration?: FormDeclarationOptions;
  sourceMetadata?: Record<string, unknown>;
  conditionalRules: FormConditionalRuleDefinition[];
}

export interface RenderedFormSectionSchema {
  sectionKey: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  displayOrder: number;
  fields: RenderedFormFieldSchema[];
}

export interface RenderedFormSchema {
  formVersionId: string;
  formDefinitionId: string;
  formDefinitionCode: string;
  version: number;
  title: Record<string, string>;
  instructions?: Record<string, string>;
  status: FormVersionStatus;
  effectiveFrom?: string;
  effectiveUntil?: string;
  sections: RenderedFormSectionSchema[];
}

export interface FormFieldValidationError {
  fieldKey: string;
  code: string;
  message: string;
}

export interface FormResponseValidationResult {
  outcome: 'VALID' | 'INVALID';
  formVersionId: string;
  formDefinitionId: string;
  version: number;
  fieldErrors: FormFieldValidationError[];
  missingRequiredFields: string[];
  unknownFields: string[];
}

export type FormAnswers = Record<string, unknown>;

export interface LoadedFormField {
  id: string;
  fieldKey: string;
  fieldType: FormFieldType;
  required: boolean;
  displayOrder: number;
  defaultValue: unknown;
  validationDefinition: FormValidationDefinition;
  options: unknown;
  conditionalRules: FormConditionalRuleDefinition[];
  sectionKey: string;
}

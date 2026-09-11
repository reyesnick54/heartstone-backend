export const SERVICE_REQUIREMENT_TYPES = [
  'INFORMATION',
  'FORM_FIELD',
  'IDENTITY',
  'REPRESENTATION',
  'DOCUMENT',
  'EVIDENCE',
  'DECLARATION',
  'FEE',
  'PREREQUISITE',
  'PROFESSIONAL_DOCUMENT',
  'EXTERNAL_DETERMINATION',
  'OTHER_STRUCTURED_REQUIREMENT',
] as const;

export const SERVICE_MODEL_NAMES = [
  'GovernmentService',
  'GovernmentServiceVersion',
  'FormDefinition',
  'FormVersion',
  'FormField',
  'DeclarationDefinition',
  'DeclarationDefinitionVersion',
  'StructuredApplicabilityRule',
  'ServiceRequirement',
] as const;

export const EVIDENCE_QUALITY_EXPECTATIONS = [
  'SUBMITTED',
  'ORIGINAL_REQUIRED',
  'CERTIFIED_COPY_REQUIRED',
  'VERIFICATION_REQUIRED',
  'PROFESSIONAL_VALIDATION_REQUIRED',
  'EXTERNAL_CONFIRMATION_REQUIRED',
] as const;

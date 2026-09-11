import type { FormVersionStatus } from '@prisma/client';

export interface FormDefinitionBody {
  id: string;
}

export interface FormVersionBody {
  id: string;
  version: number;
  status: FormVersionStatus;
}

export interface FormSchemaBody {
  sections: {
    fields: {
      fieldKey: string;
      declaration?: {
        declarationVersion: string;
        declarationText: Record<string, string>;
      };
    }[];
  }[];
}

export interface FormValidationResultBody {
  outcome: 'VALID' | 'INVALID';
  unknownFields: string[];
}

export interface FormReconstructBody {
  version: number;
  sections: {
    fields: unknown[];
  }[];
}

export function asFormDefinitionBody(body: unknown): FormDefinitionBody {
  return body as FormDefinitionBody;
}

export function asFormVersionBody(body: unknown): FormVersionBody {
  return body as FormVersionBody;
}

export function asFormSchemaBody(body: unknown): FormSchemaBody {
  return body as FormSchemaBody;
}

export function asFormValidationResultBody(body: unknown): FormValidationResultBody {
  return body as FormValidationResultBody;
}

export function asFormReconstructBody(body: unknown): FormReconstructBody {
  return body as FormReconstructBody;
}

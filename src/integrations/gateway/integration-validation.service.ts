import { Injectable } from '@nestjs/common';
import {
  IntegrationExchangeStatus,
  IntegrationSignatureValidationResult,
  IntegrationValidationOverallStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type IntegrationAdapterResponse } from '../ports/integration-adapter.port';

export interface ResponseValidationInput {
  exchangeId: string;
  adapterResponse: IntegrationAdapterResponse;
  expectedSchemaVersion: string;
  permittedFields: string[];
  schemaRequiredFields: string[];
  endpointReference?: string;
}

export interface ResponseValidationOutcome {
  isValidated: boolean;
  exchangeStatus: IntegrationExchangeStatus;
  checks: Record<string, boolean>;
  failureReasons: string[];
  missingFields: string[];
}

@Injectable()
export class IntegrationValidationService {
  constructor(private readonly prisma: PrismaService) {}

  validateResponse(input: ResponseValidationInput): ResponseValidationOutcome {
    const checks: Record<string, boolean> = {};
    const failureReasons: string[] = [];
    const data = input.adapterResponse.data ?? {};

    checks.sourceVerified = Boolean(input.adapterResponse.sourceReference);
    if (!checks.sourceVerified) {
      failureReasons.push('source_not_verified');
    }

    checks.endpointVerified = Boolean(
      input.adapterResponse.endpointReference ?? input.endpointReference,
    );
    if (!checks.endpointVerified) {
      failureReasons.push('endpoint_not_verified');
    }

    const signatureResult =
      input.adapterResponse.signatureValid === true
        ? IntegrationSignatureValidationResult.VALID
        : input.adapterResponse.signatureValid === false
          ? IntegrationSignatureValidationResult.INVALID
          : IntegrationSignatureValidationResult.NOT_APPLICABLE;
    checks.signatureValid = signatureResult === IntegrationSignatureValidationResult.VALID;
    if (signatureResult === IntegrationSignatureValidationResult.INVALID) {
      failureReasons.push('invalid_signature');
    }

    checks.schemaValid = this.validateSchema(data, input.permittedFields);
    if (!checks.schemaValid) {
      failureReasons.push('schema_validation_failed');
    }

    checks.versionValid =
      input.adapterResponse.schemaVersion === input.expectedSchemaVersion ||
      input.adapterResponse.schemaVersion === undefined;
    if (!checks.versionValid) {
      failureReasons.push('version_mismatch');
    }

    const missingFields: string[] = [];
    for (const field of input.schemaRequiredFields) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        missingFields.push(field);
      }
    }
    checks.requiredFieldsPresent = missingFields.length === 0;
    if (!checks.requiredFieldsPresent) {
      failureReasons.push('missing_required_fields');
    }

    checks.httpSuccessAlone =
      input.adapterResponse.httpStatusCode === 200 && input.adapterResponse.success;
    checks.notValidatedByHttpAlone = true;

    const allPassed =
      checks.sourceVerified &&
      checks.endpointVerified &&
      (signatureResult !== IntegrationSignatureValidationResult.INVALID) &&
      checks.schemaValid &&
      checks.versionValid &&
      checks.requiredFieldsPresent &&
      input.adapterResponse.success &&
      !input.adapterResponse.timedOut;

    return {
      isValidated: allPassed,
      exchangeStatus: allPassed
        ? IntegrationExchangeStatus.VALIDATED
        : IntegrationExchangeStatus.RECONCILIATION_REQUIRED,
      checks,
      failureReasons,
      missingFields,
    };
  }

  async persistResponseValidation(
    input: ResponseValidationInput,
    outcome: ResponseValidationOutcome,
    responseHash: string,
    structuredSummary: Record<string, unknown>,
  ) {
    const signatureResult =
      input.adapterResponse.signatureValid === true
        ? IntegrationSignatureValidationResult.VALID
        : input.adapterResponse.signatureValid === false
          ? IntegrationSignatureValidationResult.INVALID
          : IntegrationSignatureValidationResult.NOT_APPLICABLE;

    const responseRecord = await this.prisma.integrationResponseRecord.create({
      data: {
        exchangeId: input.exchangeId,
        sourceVerified: outcome.checks.sourceVerified ?? false,
        endpointVerified: outcome.checks.endpointVerified ?? false,
        signatureResult,
        schemaValid: outcome.checks.schemaValid ?? false,
        versionValid: outcome.checks.versionValid ?? false,
        httpStatusCode: input.adapterResponse.httpStatusCode,
        responseHash,
        structuredSummary: structuredSummary as Prisma.InputJsonValue,
        isValidated: outcome.isValidated,
        validatedAt: outcome.isValidated ? new Date() : null,
      },
    });

    await this.prisma.integrationValidationResult.create({
      data: {
        exchangeId: input.exchangeId,
        responseRecordId: responseRecord.id,
        overallStatus: outcome.isValidated
          ? IntegrationValidationOverallStatus.PASSED
          : IntegrationValidationOverallStatus.FAILED,
        checks: outcome.checks,
        failureReasons: outcome.failureReasons,
      },
    });

    return responseRecord;
  }

  private validateSchema(
    data: Record<string, unknown>,
    permittedFields: string[],
  ): boolean {
    if (permittedFields.length === 0) {
      return true;
    }
    return Object.keys(data).every((key) => permittedFields.includes(key));
  }
}

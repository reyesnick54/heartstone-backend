import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { hashIntegrationPayload } from '../common/integration-hash.util';

export interface TransformationInput {
  exchangeId: string;
  sourceSchema: string;
  destinationSchema: string;
  mappingVersion: string;
  transformationVersion: string;
  input: Record<string, unknown>;
  fieldMapping: Record<string, string>;
}

export interface TransformationOutcome {
  output: Record<string, unknown>;
  lossyFields: string[];
  warnings: string[];
  inputHash: string;
  outputHash: string;
}

@Injectable()
export class IntegrationTransformationService {
  constructor(private readonly prisma: PrismaService) {}

  transform(input: TransformationInput): TransformationOutcome {
    const output: Record<string, unknown> = {};
    const lossyFields: string[] = [];
    const warnings: string[] = [];

    for (const [sourceField, destField] of Object.entries(input.fieldMapping)) {
      if (sourceField in input.input) {
        output[destField] = input.input[sourceField];
      } else {
        lossyFields.push(sourceField);
        warnings.push(`Source field "${sourceField}" not present; not invented`);
      }
    }

    const unmappedInputFields = Object.keys(input.input).filter(
      (key) => !Object.keys(input.fieldMapping).includes(key),
    );
    for (const field of unmappedInputFields) {
      lossyFields.push(field);
      warnings.push(`Input field "${field}" not mapped; excluded from output`);
    }

    const inputHash = hashIntegrationPayload(input.input);
    const outputHash = hashIntegrationPayload(output);

    return { output, lossyFields, warnings, inputHash, outputHash };
  }

  async recordTransformation(
    input: TransformationInput,
    outcome: TransformationOutcome,
  ) {
    return this.prisma.integrationDataTransformation.create({
      data: {
        exchangeId: input.exchangeId,
        sourceSchema: input.sourceSchema,
        destinationSchema: input.destinationSchema,
        mappingVersion: input.mappingVersion,
        transformationVersion: input.transformationVersion,
        inputHash: outcome.inputHash,
        outputHash: outcome.outputHash,
        lossyFields: outcome.lossyFields,
        warnings: outcome.warnings,
      },
    });
  }
}

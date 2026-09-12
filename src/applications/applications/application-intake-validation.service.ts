import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InformationOnlyNotStartableException } from '../../service-catalog/common/information-only-not-startable.exception';
import {
  APPLICATION_STARTABLE_AVAILABILITY,
} from '../../service-catalog/common/public-discovery.constants';
import { isApplicationCapableAvailability } from '../../service-catalog/common/public-service.mapper';
import { buildServiceConfigurationFingerprint } from '../../service-catalog/common/service-configuration-hash.util';
import { VersionSupersededException } from '../../service-catalog/common/version-superseded.exception';
import { FormResponseValidationService } from '../../service-catalog/forms/form-response-validation.service';

const serviceVersionInclude = {
  fees: true,
  eligibilityRules: true,
  checklistItems: true,
  formVersion: true,
  functionMappings: {
    orderBy: { sequenceOrder: 'asc' as const },
    include: {
      functionAuthorityRecord: {
        select: { name: true },
      },
    },
  },
  governmentService: {
    select: {
      id: true,
      publicName: true,
      slug: true,
    },
  },
} satisfies Prisma.GovernmentServiceVersionInclude;

export type ValidatedServiceVersion = Prisma.GovernmentServiceVersionGetPayload<{
  include: typeof serviceVersionInclude;
}>;

export interface PinnedConfiguration {
  checklistItemIds: string[];
  feeDefinitionIds: string[];
  eligibilityRuleIds: string[];
}

@Injectable()
export class ApplicationIntakeValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formValidation: FormResponseValidationService,
  ) {}

  async validateServiceVersionForSubmission(
    serviceVersionId: string,
    configurationFingerprint: string,
    formVersionId: string,
  ): Promise<{
    serviceVersion: ValidatedServiceVersion;
    pinnedConfiguration: PinnedConfiguration;
    configurationFingerprint: string;
  }> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: serviceVersionId },
      include: serviceVersionInclude,
    });

    if (!serviceVersion) {
      throw new NotFoundException(`Government service version "${serviceVersionId}" was not found`);
    }

    if (serviceVersion.supersededAt) {
      throw new VersionSupersededException();
    }

    if (
      serviceVersion.publicAvailability === GovernmentServicePublicAvailability.INFORMATION_ONLY
    ) {
      throw new InformationOnlyNotStartableException();
    }

    if (!isApplicationCapableAvailability(serviceVersion.publicAvailability)) {
      throw new BadRequestException('Service is not currently startable for applications');
    }

    if (!APPLICATION_STARTABLE_AVAILABILITY.includes(serviceVersion.publicAvailability)) {
      throw new BadRequestException('Service is not currently startable for applications');
    }

    if (serviceVersion.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE) {
      throw new BadRequestException('Service version is not active for submissions');
    }

    if (!serviceVersion.formVersionId || serviceVersion.formVersionId !== formVersionId) {
      throw new VersionSupersededException(
        'The requested form version does not match the pinned service configuration',
      );
    }

    const formVersion = await this.prisma.formVersion.findUnique({
      where: { id: formVersionId },
    });

    if (!formVersion) {
      throw new NotFoundException(`Form version "${formVersionId}" was not found`);
    }

    if (formVersion.status !== FormVersionStatus.PUBLISHED) {
      throw new BadRequestException('Form version must be published for submission');
    }

    const pinnedConfiguration: PinnedConfiguration = {
      checklistItemIds: serviceVersion.checklistItems.map((item) => item.id),
      feeDefinitionIds: serviceVersion.fees.map((fee) => fee.id),
      eligibilityRuleIds: serviceVersion.eligibilityRules.map((rule) => rule.id),
    };

    const computedFingerprint = buildServiceConfigurationFingerprint({
      serviceVersionId: serviceVersion.id,
      formVersionId: serviceVersion.formVersionId,
      feeDefinitionIds: pinnedConfiguration.feeDefinitionIds,
      eligibilityRuleIds: pinnedConfiguration.eligibilityRuleIds,
      checklistItemIds: pinnedConfiguration.checklistItemIds,
    });

    if (configurationFingerprint !== computedFingerprint) {
      throw new VersionSupersededException();
    }

    return {
      serviceVersion,
      pinnedConfiguration,
      configurationFingerprint: computedFingerprint,
    };
  }

  async validateFormAnswers(
    formVersionId: string,
    answers: Record<string, unknown>,
  ): Promise<void> {
    const result = await this.formValidation.validateResponse(
      formVersionId,
      answers,
    );

    if (result.outcome !== 'VALID') {
      throw new BadRequestException({
        statusCode: 400,
        error: 'FORM_VALIDATION_FAILED',
        message: 'Form response validation failed',
        fieldErrors: result.fieldErrors,
        missingRequiredFields: result.missingRequiredFields,
        unknownFields: result.unknownFields,
      });
    }
  }

  resolveNextExpectedStage(serviceVersion: ValidatedServiceVersion): string {
    const firstMapping = serviceVersion.functionMappings[0];
    if (!firstMapping) {
      return 'Intake review';
    }

    return firstMapping.publicStageLabel ?? firstMapping.functionAuthorityRecord.name;
  }
}

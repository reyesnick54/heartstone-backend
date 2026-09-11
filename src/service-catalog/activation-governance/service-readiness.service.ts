import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogServiceType,
  FormVersionStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  ServiceFunctionMappingStatus,
  ServiceReadinessCheckOutcome,
  ServiceReadinessLevel,
  ServiceTestReadinessStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { isEffectiveAt } from '../../authority/common/effective-period.util';
import { PrismaService } from '../../database/prisma.service';
import {
  SERVICE_READINESS_CHECK_CODES,
  type ServiceReadinessCheckCode,
} from './service-catalog-governance.constants';
import {
  type ServiceReadinessAssessment,
  type ServiceReadinessCheckResult,
} from './service-readiness.types';

@Injectable()
export class ServiceReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async assessReadiness(
    governmentServiceVersionId: string,
    at: Date = new Date(),
  ): Promise<ServiceReadinessAssessment> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: governmentServiceVersionId },
      include: {
        governmentService: {
          include: {
            responsibleInstitution: true,
            responsibleDepartment: true,
            ownerOfficeholder: true,
          },
        },
        functionMappings: {
          include: { functionAuthorityRecord: true },
        },
        formVersion: true,
        checklistItems: true,
        fees: true,
        outputs: true,
        redressRoutes: true,
      },
    });

    if (!version) {
      throw new NotFoundException(
        `GovernmentServiceVersion "${governmentServiceVersionId}" was not found`,
      );
    }

    const checks: ServiceReadinessCheckResult[] = [];
    const service = version.governmentService;
    const isApplicationCapable = service.catalogServiceType === CatalogServiceType.APPLICATION;

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.STABLE_SERVICE_EXISTS,
        version.maturityStatus !== GovernmentServiceMaturityStatus.DRAFT
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Government service version must be configured beyond raw draft',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.RESPONSIBLE_INSTITUTION_EXISTS,
        service.responsibleInstitution.status === StructuralLifecycleStatus.ACTIVE
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Responsible institution must exist and be active',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.RESPONSIBLE_DEPARTMENT_EXISTS,
        service.responsibleDepartment.status === StructuralLifecycleStatus.ACTIVE
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Responsible department must exist and be active',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.SERVICE_OWNER_CONFIGURED,
        service.ownerOfficeholderId
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Service owner must be configured',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.AUTHORITY_FUNCTION_MAPPINGS_EXIST,
        version.functionMappings.length > 0
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.REQUIRES_CONFIGURATION,
        'At least one authority-function mapping is required',
      ),
    );

    const consequentialMappings = version.functionMappings.filter(
      (mapping) => mapping.isConsequential,
    );
    const consequentialValid =
      consequentialMappings.length === 0 ||
      consequentialMappings.every(
        (mapping) =>
          mapping.status === ServiceFunctionMappingStatus.ACTIVE &&
          mapping.functionAuthorityRecord.lifecycleStatus ===
            FunctionAuthorityLifecycleStatus.ACTIVE,
      );
    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.CONSEQUENTIAL_FUNCTIONS_VALID,
        consequentialValid ? ServiceReadinessCheckOutcome.PASS : ServiceReadinessCheckOutcome.FAIL,
        'Consequential mapped functions must be active and current',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.GOVERNING_SOURCE_LINKAGE,
        version.internalGoverningSourceMaterial?.trim()
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Governing-source linkage or material is required',
      ),
    );

    if (isApplicationCapable) {
      const hasActiveForm = version.formVersion?.status === FormVersionStatus.PUBLISHED;
      checks.push(
        this.check(
          SERVICE_READINESS_CHECK_CODES.PUBLISHED_FORM_EXISTS,
          hasActiveForm ? ServiceReadinessCheckOutcome.PASS : ServiceReadinessCheckOutcome.FAIL,
          'An active published form version is required for application-capable services',
        ),
      );
    }

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.CURRENT_REQUIREMENTS_EXIST,
        version.checklistItems.length > 0
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Current checklist requirements must exist',
      ),
    );

    if (service.catalogServiceType === CatalogServiceType.LICENCE) {
      checks.push(
        this.check(
          SERVICE_READINESS_CHECK_CODES.FEE_SCHEDULE_VALID,
          version.fees.length > 0
            ? ServiceReadinessCheckOutcome.PASS
            : ServiceReadinessCheckOutcome.FAIL,
          'Fee schedule must be valid where applicable',
        ),
      );
    }

    const dependenciesDeclared = Array.isArray(version.majorDependencies)
      ? version.majorDependencies.length > 0
      : false;
    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.DEPENDENCIES_DECLARED,
        dependenciesDeclared
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Service dependencies must be declared',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.EXPECTED_OUTPUT_DEFINED,
        version.outputs.length > 0
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Expected service output must be defined',
      ),
    );

    if (isApplicationCapable) {
      checks.push(
        this.check(
          SERVICE_READINESS_CHECK_CODES.REDRESS_ROUTE_DEFINED,
          version.redressRoutes.length > 0
            ? ServiceReadinessCheckOutcome.PASS
            : ServiceReadinessCheckOutcome.FAIL,
          'Redress route must be defined where applicable',
        ),
      );
    }

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.PUBLIC_DESCRIPTION_COMPLETE,
        version.publicDescription?.trim() && service.publicName.trim()
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.FAIL,
        'Public description must be complete',
      ),
    );

    const versionEffective =
      version.effectiveFrom !== null &&
      isEffectiveAt(
        { effectiveFrom: version.effectiveFrom, effectiveUntil: version.effectiveUntil },
        at,
      );
    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.SERVICE_VERSION_EFFECTIVE,
        versionEffective ? ServiceReadinessCheckOutcome.PASS : ServiceReadinessCheckOutcome.FAIL,
        'Service version must be within its effective period',
      ),
    );

    const testReadinessPassed =
      version.testReadinessStatus === ServiceTestReadinessStatus.TECHNICAL_TESTS_PASSED ||
      version.testReadinessStatus === ServiceTestReadinessStatus.INSTITUTIONAL_REVIEW_PENDING ||
      version.testReadinessStatus === ServiceTestReadinessStatus.INSTITUTIONAL_REVIEW_PASSED;
    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.TEST_READINESS_SUFFICIENT,
        testReadinessPassed ? ServiceReadinessCheckOutcome.PASS : ServiceReadinessCheckOutcome.FAIL,
        'Technical test/readiness status must be sufficient',
      ),
    );

    checks.push(
      this.check(
        SERVICE_READINESS_CHECK_CODES.ACTIVATION_AUTHORITY_CONFIGURED,
        version.activationFunctionAuthorityRecordId
          ? ServiceReadinessCheckOutcome.PASS
          : ServiceReadinessCheckOutcome.REQUIRES_CONFIGURATION,
        'Activation authority FunctionAuthorityRecord must be configured',
      ),
    );

    const technicalCheckCodes: ServiceReadinessCheckCode[] = [
      SERVICE_READINESS_CHECK_CODES.STABLE_SERVICE_EXISTS,
      SERVICE_READINESS_CHECK_CODES.RESPONSIBLE_INSTITUTION_EXISTS,
      SERVICE_READINESS_CHECK_CODES.RESPONSIBLE_DEPARTMENT_EXISTS,
      SERVICE_READINESS_CHECK_CODES.SERVICE_OWNER_CONFIGURED,
      SERVICE_READINESS_CHECK_CODES.AUTHORITY_FUNCTION_MAPPINGS_EXIST,
      SERVICE_READINESS_CHECK_CODES.CONSEQUENTIAL_FUNCTIONS_VALID,
      SERVICE_READINESS_CHECK_CODES.GOVERNING_SOURCE_LINKAGE,
      SERVICE_READINESS_CHECK_CODES.PUBLISHED_FORM_EXISTS,
      SERVICE_READINESS_CHECK_CODES.CURRENT_REQUIREMENTS_EXIST,
      SERVICE_READINESS_CHECK_CODES.FEE_SCHEDULE_VALID,
      SERVICE_READINESS_CHECK_CODES.DEPENDENCIES_DECLARED,
      SERVICE_READINESS_CHECK_CODES.EXPECTED_OUTPUT_DEFINED,
      SERVICE_READINESS_CHECK_CODES.REDRESS_ROUTE_DEFINED,
      SERVICE_READINESS_CHECK_CODES.PUBLIC_DESCRIPTION_COMPLETE,
      SERVICE_READINESS_CHECK_CODES.SERVICE_VERSION_EFFECTIVE,
      SERVICE_READINESS_CHECK_CODES.TEST_READINESS_SUFFICIENT,
    ];
    const technicalChecks = checks.filter((item) => technicalCheckCodes.includes(item.code));
    const technicallyReady = technicalChecks.every(
      (item) => item.outcome === ServiceReadinessCheckOutcome.PASS,
    );
    const institutionallyAccepted = version.institutionallyAccepted;
    const operationallyActive =
      version.maturityStatus === GovernmentServiceMaturityStatus.ACTIVE &&
      version.publicAvailability === 'ACTIVE';

    let achievedLevel: ServiceReadinessLevel = ServiceReadinessLevel.NOT_READY;
    if (technicallyReady) {
      achievedLevel = ServiceReadinessLevel.TECHNICALLY_READY;
    }
    if (technicallyReady && institutionallyAccepted) {
      achievedLevel = ServiceReadinessLevel.INSTITUTIONALLY_ACCEPTED;
    }
    if (technicallyReady && institutionallyAccepted && operationallyActive) {
      achievedLevel = ServiceReadinessLevel.OPERATIONALLY_ACTIVE;
    }

    const blockingIssues = checks
      .filter((item) => item.outcome !== ServiceReadinessCheckOutcome.PASS)
      .map((item) => `${item.code}: ${item.message}`);

    return {
      governmentServiceVersionId,
      assessedAt: at,
      achievedLevel,
      technicallyReady,
      institutionallyAccepted,
      operationallyActive,
      checks,
      blockingIssues,
    };
  }

  private check(
    code: ServiceReadinessCheckCode,
    outcome: ServiceReadinessCheckOutcome,
    message: string,
  ): ServiceReadinessCheckResult {
    return { code, outcome, message };
  }
}

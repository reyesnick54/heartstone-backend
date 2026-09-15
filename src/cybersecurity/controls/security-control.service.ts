import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SecurityControlDomain,
  SecurityControlImplementationStatus,
  SecurityExceptionStatus,
  SecurityFindingSeverity,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { generateCybersecurityReference } from '../common/reference-number.util';
import {
  SECURITY_ASSESSMENT_NUMBER_PREFIX,
  SECURITY_ASSET_CODE_PREFIX,
  SECURITY_CONTROL_CODE_PREFIX,
  SECURITY_EXCEPTION_NUMBER_PREFIX,
  SECURITY_FINDING_NUMBER_PREFIX,
  SECURITY_IMPLEMENTATION_CODE_PREFIX,
} from '../cybersecurity.constants';
import { ApproveSecurityExceptionDto } from '../dto/approve-security-exception.dto';
import { CreateSecurityAssetDto } from '../dto/create-security-asset.dto';
import { CreateSecurityControlAssessmentDto } from '../dto/create-security-control-assessment.dto';
import { CreateSecurityControlDefinitionDto } from '../dto/create-security-control-definition.dto';
import { CreateSecurityControlImplementationDto } from '../dto/create-security-control-implementation.dto';
import { CreateSecurityExceptionDto } from '../dto/create-security-exception.dto';
import { CreateSecurityFindingDto } from '../dto/create-security-finding.dto';

@Injectable()
export class SecurityControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
  ) {}

  async createAsset(dto: CreateSecurityAssetDto) {
    return this.prisma.securityAsset.create({
      data: {
        assetCode: dto.assetCode ?? generateCybersecurityReference(SECURITY_ASSET_CODE_PREFIX),
        name: dto.name,
        description: dto.description,
        assetType: dto.assetType,
        environment: dto.environment,
        ownerIdentityId: dto.ownerIdentityId,
        criticality: dto.criticality ?? SecurityFindingSeverity.MODERATE,
        isProductionConsequential: dto.isProductionConsequential ?? false,
      },
    });
  }

  async createControlDefinition(dto: CreateSecurityControlDefinitionDto) {
    return this.prisma.securityControlDefinition.create({
      data: {
        controlCode:
          dto.controlCode ?? generateCybersecurityReference(SECURITY_CONTROL_CODE_PREFIX),
        title: dto.title,
        description: dto.description,
        domain: dto.domain,
        requirementSource: dto.requirementSource,
        ownerIdentityId: dto.ownerIdentityId,
        isMandatory: dto.isMandatory ?? true,
      },
    });
  }

  async createImplementation(dto: CreateSecurityControlImplementationDto) {
    await this.ensureAssetExists(dto.assetId);
    await this.ensureControlDefinitionExists(dto.controlDefinitionId);

    return this.prisma.securityControlImplementation.create({
      data: {
        implementationCode:
          dto.implementationCode ??
          generateCybersecurityReference(SECURITY_IMPLEMENTATION_CODE_PREFIX),
        controlDefinitionId: dto.controlDefinitionId,
        assetId: dto.assetId,
        ownerIdentityId: dto.ownerIdentityId,
        requirementSource: dto.requirementSource,
        implementationDescription: dto.implementationDescription,
        environment: dto.environment,
        evidenceReference: dto.evidenceReference,
        testMethod: dto.testMethod,
        status: dto.status ?? SecurityControlImplementationStatus.PLANNED,
        lastTestedAt: dto.lastTestedAt,
        nextReviewAt: dto.nextReviewAt,
      },
    });
  }

  async recordAssessment(dto: CreateSecurityControlAssessmentDto) {
    await this.ensureImplementationExists(dto.implementationId);

    return this.prisma.securityControlAssessment.create({
      data: {
        assessmentNumber:
          dto.assessmentNumber ?? generateCybersecurityReference(SECURITY_ASSESSMENT_NUMBER_PREFIX),
        implementationId: dto.implementationId,
        assessorIdentityId: dto.assessorIdentityId,
        result: dto.result,
        findingsSummary: dto.findingsSummary,
        evidenceReference: dto.evidenceReference,
        assessedAt: dto.assessedAt ?? new Date(),
      },
    });
  }

  async recordFinding(dto: CreateSecurityFindingDto) {
    this.boundary.assertSeverityDoesNotAcceptRisk(dto.severity, dto.riskAccepted ?? false);

    return this.prisma.securityFinding.create({
      data: {
        findingNumber:
          dto.findingNumber ?? generateCybersecurityReference(SECURITY_FINDING_NUMBER_PREFIX),
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        domain: dto.domain,
        implementationId: dto.implementationId,
        assessmentId: dto.assessmentId,
        ownerIdentityId: dto.ownerIdentityId,
        riskAccepted: dto.riskAccepted ?? false,
        isOpen: dto.isOpen ?? true,
        identifiedAt: dto.identifiedAt ?? new Date(),
      },
    });
  }

  async requestException(dto: CreateSecurityExceptionDto, clientPayload: Record<string, unknown>) {
    this.boundary.rejectClientProtectedSecurityExceptionFields(clientPayload);
    await this.ensureControlDefinitionExists(dto.controlDefinitionId);

    if (dto.isPermanent) {
      throw new BadRequestException('No permanent exception by default');
    }

    return this.prisma.securityException.create({
      data: {
        exceptionNumber:
          dto.exceptionNumber ?? generateCybersecurityReference(SECURITY_EXCEPTION_NUMBER_PREFIX),
        controlDefinitionId: dto.controlDefinitionId,
        implementationId: dto.implementationId,
        businessJustification: dto.businessJustification,
        scopeDescription: dto.scopeDescription,
        compensatingControls: dto.compensatingControls,
        riskDescription: dto.riskDescription,
        ownerIdentityId: dto.ownerIdentityId,
        severity: dto.severity,
        isPermanent: false,
        expiresAt: dto.expiresAt,
        reviewDate: dto.reviewDate,
        status: SecurityExceptionStatus.REQUESTED,
      },
    });
  }

  async approveException(id: string, dto: ApproveSecurityExceptionDto) {
    const exception = await this.prisma.securityException.findUnique({ where: { id } });
    if (!exception) {
      throw new NotFoundException(`Security exception "${id}" was not found`);
    }

    this.boundary.assertSecurityExceptionEffective({
      status: exception.status,
      expiresAt: exception.expiresAt,
      isPermanent: exception.isPermanent,
      severity: exception.severity,
    });

    if (
      exception.severity === SecurityFindingSeverity.CRITICAL &&
      !dto.institutionalRiskAcceptanceReference?.trim()
    ) {
      throw new BadRequestException(
        'Critical exceptions require institutional/security risk acceptance according to configured governance',
      );
    }

    return this.prisma.securityException.update({
      where: { id },
      data: {
        status: SecurityExceptionStatus.APPROVED,
        approverIdentityId: dto.approverIdentityId,
        approvedAt: new Date(),
      },
    });
  }

  async enforceExceptionExpiration(now = new Date()) {
    const expired = await this.prisma.securityException.findMany({
      where: {
        status: SecurityExceptionStatus.APPROVED,
        expiresAt: { lte: now },
      },
    });

    if (expired.length === 0) {
      return { expiredCount: 0 };
    }

    await this.prisma.securityException.updateMany({
      where: { id: { in: expired.map((item) => item.id) } },
      data: { status: SecurityExceptionStatus.EXPIRED },
    });

    return { expiredCount: expired.length };
  }

  async listOpenCriticalFindings(domain?: SecurityControlDomain) {
    return this.prisma.securityFinding.findMany({
      where: {
        isOpen: true,
        severity: SecurityFindingSeverity.CRITICAL,
        ...(domain ? { domain } : {}),
      },
      orderBy: { identifiedAt: 'desc' },
    });
  }

  private async ensureAssetExists(id: string): Promise<void> {
    const asset = await this.prisma.securityAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Security asset "${id}" was not found`);
    }
  }

  private async ensureControlDefinitionExists(id: string): Promise<void> {
    const definition = await this.prisma.securityControlDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`Security control definition "${id}" was not found`);
    }
  }

  private async ensureImplementationExists(id: string): Promise<void> {
    const implementation = await this.prisma.securityControlImplementation.findUnique({
      where: { id },
    });
    if (!implementation) {
      throw new NotFoundException(`Security control implementation "${id}" was not found`);
    }
  }
}

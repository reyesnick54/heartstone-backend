import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CybersecurityBoundaryService } from './common/cybersecurity-boundary.service';
import { SecurityControlService } from './controls/security-control.service';
import { CryptographicService } from './cryptography/cryptographic.service';
import { ApproveSecurityExceptionDto } from './dto/approve-security-exception.dto';
import { CreateSecurityAssetDto } from './dto/create-security-asset.dto';
import { CreateSecurityControlAssessmentDto } from './dto/create-security-control-assessment.dto';
import { CreateSecurityControlDefinitionDto } from './dto/create-security-control-definition.dto';
import { CreateSecurityControlImplementationDto } from './dto/create-security-control-implementation.dto';
import { CreateSecurityExceptionDto } from './dto/create-security-exception.dto';
import { CreateSecurityFindingDto } from './dto/create-security-finding.dto';
import {
  CreateCertificateReferenceDto,
  CreateCryptographicAgilityAssessmentDto,
  CreateCryptographicAssetDto,
  CreateCryptographicKeyReferenceDto,
  CreateCryptographicPolicyDto,
  CreatePostQuantumMigrationItemDto,
  RotateCryptographicAssetDto,
} from './dto/cryptography.dto';
import {
  ActivateBreakGlassAccessDto,
  CreateBreakGlassAccessEventDto,
  CreateCredentialRotationRecordDto,
  CreatePrivilegedAccessReviewDto,
  CreateServiceIdentityReviewDto,
} from './dto/privileged-access.dto';
import { RecordSecurityTestExecutionDto } from './dto/record-security-test-execution.dto';
import {
  ApproveReleaseAttestationDto,
  CreateBuildProvenanceRecordDto,
  CreateDependencyVulnerabilityRecordDto,
  CreateReleaseArtifactAttestationDto,
  CreateSoftwareBillOfMaterialsRecordDto,
  CreateSoftwareComponentRecordDto,
  CreateVendorSecurityAssessmentDto,
  RecordDependencyChangeDto,
} from './dto/supply-chain.dto';
import {
  CreateSecurityAssuranceReviewDto,
  CreateVulnerabilityFindingDto,
  CreateVulnerabilityRemediationDto,
} from './dto/vulnerability.dto';
import { PrivilegedAccessService } from './privileged-access/privileged-access.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';
import { SupplyChainService } from './supply-chain/supply-chain.service';
import { SecurityTestingService } from './testing/security-testing.service';
import { VulnerabilityService } from './vulnerability/vulnerability.service';

@ApiTags('cybersecurity')
@Controller('cybersecurity')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CybersecurityController {
  constructor(
    private readonly boundary: CybersecurityBoundaryService,
    private readonly securityControls: SecurityControlService,
    private readonly vulnerability: VulnerabilityService,
    private readonly cryptographic: CryptographicService,
    private readonly supplyChain: SupplyChainService,
    private readonly privilegedAccess: PrivilegedAccessService,
    private readonly securityTesting: SecurityTestingService,
    private readonly productionReadiness: ProductionReadinessService,
  ) {}

  @Get('production-readiness')
  evaluateProductionReadiness() {
    return this.productionReadiness.evaluateProductionReadinessGate();
  }

  @Get('security-test-categories')
  listSecurityTestCategories() {
    return this.securityTesting.listSupportedCategories();
  }

  @Post('assets')
  createAsset(@Body() dto: CreateSecurityAssetDto) {
    return this.securityControls.createAsset(dto);
  }

  @Post('control-definitions')
  createControlDefinition(@Body() dto: CreateSecurityControlDefinitionDto) {
    return this.securityControls.createControlDefinition(dto);
  }

  @Post('control-implementations')
  createImplementation(@Body() dto: CreateSecurityControlImplementationDto) {
    return this.securityControls.createImplementation(dto);
  }

  @Post('control-assessments')
  recordAssessment(@Body() dto: CreateSecurityControlAssessmentDto) {
    return this.securityControls.recordAssessment(dto);
  }

  @Post('findings')
  recordFinding(@Body() dto: CreateSecurityFindingDto) {
    return this.securityControls.recordFinding(dto);
  }

  @Post('exceptions')
  requestException(@Body() dto: CreateSecurityExceptionDto) {
    return this.securityControls.requestException(dto, dto as unknown as Record<string, unknown>);
  }

  @Post('exceptions/:id/approve')
  approveException(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSecurityExceptionDto,
  ) {
    return this.securityControls.approveException(id, dto);
  }

  @Post('exceptions/enforce-expiration')
  enforceExceptionExpiration() {
    return this.securityControls.enforceExceptionExpiration();
  }

  @Post('vulnerability-findings')
  recordVulnerabilityFinding(@Body() dto: CreateVulnerabilityFindingDto) {
    return this.vulnerability.recordFinding(dto);
  }

  @Post('vulnerability-remediations')
  planVulnerabilityRemediation(@Body() dto: CreateVulnerabilityRemediationDto) {
    return this.vulnerability.planRemediation(dto);
  }

  @Post('assurance-reviews')
  scheduleAssuranceReview(@Body() dto: CreateSecurityAssuranceReviewDto) {
    return this.vulnerability.scheduleAssuranceReview(dto);
  }

  @Post('crypto/key-references')
  registerKeyReference(@Body() dto: CreateCryptographicKeyReferenceDto) {
    return this.cryptographic.registerKeyReference(dto);
  }

  @Post('crypto/certificate-references')
  registerCertificateReference(@Body() dto: CreateCertificateReferenceDto) {
    return this.cryptographic.registerCertificateReference(dto);
  }

  @Post('crypto/assets')
  registerCryptographicAsset(@Body() dto: CreateCryptographicAssetDto) {
    return this.cryptographic.registerAsset(dto, dto as unknown as Record<string, unknown>);
  }

  @Post('crypto/policies')
  createCryptographicPolicy(@Body() dto: CreateCryptographicPolicyDto) {
    return this.cryptographic.createPolicy(dto);
  }

  @Post('crypto/agility-assessments')
  assessCryptographicAgility(@Body() dto: CreateCryptographicAgilityAssessmentDto) {
    return this.cryptographic.assessAgility(dto);
  }

  @Post('crypto/post-quantum-items')
  registerPostQuantumItem(@Body() dto: CreatePostQuantumMigrationItemDto) {
    return this.cryptographic.registerPostQuantumItem(dto);
  }

  @Post('crypto/assets/:id/rotate')
  rotateCryptographicAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RotateCryptographicAssetDto,
  ) {
    return this.cryptographic.rotateAsset(id, dto);
  }

  @Post('supply-chain/components')
  registerComponent(@Body() dto: CreateSoftwareComponentRecordDto) {
    return this.supplyChain.registerComponent(dto);
  }

  @Post('supply-chain/sbom')
  generateSbom(@Body() dto: CreateSoftwareBillOfMaterialsRecordDto) {
    return this.supplyChain.generateSbom(dto);
  }

  @Post('supply-chain/dependency-vulnerabilities')
  recordDependencyVulnerability(@Body() dto: CreateDependencyVulnerabilityRecordDto) {
    return this.supplyChain.recordDependencyVulnerability(dto);
  }

  @Post('supply-chain/build-provenance')
  recordBuildProvenance(@Body() dto: CreateBuildProvenanceRecordDto) {
    return this.supplyChain.recordBuildProvenance(dto);
  }

  @Post('supply-chain/release-attestations')
  createReleaseAttestation(@Body() dto: CreateReleaseArtifactAttestationDto) {
    return this.supplyChain.createReleaseAttestation(
      dto,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Post('supply-chain/release-attestations/:id/approve')
  approveReleaseAttestation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReleaseAttestationDto,
  ) {
    return this.supplyChain.approveReleaseAttestation(id, dto);
  }

  @Post('supply-chain/vendor-assessments')
  assessVendor(@Body() dto: CreateVendorSecurityAssessmentDto) {
    return this.supplyChain.assessVendor(dto);
  }

  @Post('supply-chain/dependency-changes')
  recordDependencyChange(@Body() dto: RecordDependencyChangeDto) {
    return this.supplyChain.recordDependencyChange(dto);
  }

  @Post('privileged-access/reviews')
  schedulePrivilegedAccessReview(@Body() dto: CreatePrivilegedAccessReviewDto) {
    return this.privilegedAccess.schedulePrivilegedAccessReview(dto);
  }

  @Post('privileged-access/break-glass')
  requestBreakGlass(@Body() dto: CreateBreakGlassAccessEventDto) {
    return this.privilegedAccess.requestBreakGlass(dto, dto as unknown as Record<string, unknown>);
  }

  @Post('privileged-access/break-glass/:id/activate')
  activateBreakGlass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateBreakGlassAccessDto,
  ) {
    return this.privilegedAccess.activateBreakGlass(id, dto);
  }

  @Post('privileged-access/break-glass/enforce-expiration')
  enforceBreakGlassExpiration() {
    return this.privilegedAccess.enforceBreakGlassExpiration();
  }

  @Post('service-identities/reviews')
  scheduleServiceIdentityReview(@Body() dto: CreateServiceIdentityReviewDto) {
    return this.privilegedAccess.scheduleServiceIdentityReview(dto);
  }

  @Post('credentials/rotations')
  scheduleCredentialRotation(@Body() dto: CreateCredentialRotationRecordDto) {
    return this.privilegedAccess.scheduleCredentialRotation(dto);
  }

  @Post('security-tests/executions')
  recordSecurityTestExecution(@Body() dto: RecordSecurityTestExecutionDto) {
    return this.securityTesting.recordExecution(dto);
  }

  @Post('sanitize-response')
  sanitizeResponse(@Body() payload: Record<string, unknown>) {
    return this.boundary.blockSecretResponseLeakage(payload);
  }
}

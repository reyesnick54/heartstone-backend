import { Injectable } from '@nestjs/common';
import { SecurityExceptionStatus, SecurityFindingSeverity } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { SupplyChainService } from '../supply-chain/supply-chain.service';
import { VulnerabilityService } from '../vulnerability/vulnerability.service';

@Injectable()
export class ProductionReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
    private readonly vulnerabilityService: VulnerabilityService,
    private readonly supplyChainService: SupplyChainService,
  ) {}

  async evaluateProductionReadinessGate() {
    const [
      criticalUndispositionedVulnerabilities,
      unsignedReleaseArtifacts,
      unverifiableProvenanceRecords,
      expiredExceptions,
      openCriticalFindings,
    ] = await Promise.all([
      this.vulnerabilityService.countCriticalUndispositionedVulnerabilities(),
      this.supplyChainService.countUnsignedReleaseArtifacts(),
      this.supplyChainService.countUnverifiableProvenanceRecords(),
      this.prisma.securityException.count({
        where: {
          OR: [
            { status: SecurityExceptionStatus.EXPIRED },
            {
              status: SecurityExceptionStatus.APPROVED,
              expiresAt: { lte: new Date() },
            },
          ],
        },
      }),
      this.prisma.securityFinding.count({
        where: {
          isOpen: true,
          severity: SecurityFindingSeverity.CRITICAL,
          riskAccepted: false,
        },
      }),
    ]);

    return this.boundary.evaluateProductionReadiness({
      criticalUndispositionedVulnerabilities,
      unsignedReleaseArtifacts,
      unverifiableProvenanceRecords,
      expiredExceptions,
      openCriticalFindings,
    });
  }
}

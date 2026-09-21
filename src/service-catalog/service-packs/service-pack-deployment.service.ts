import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  type Prisma,
  ServicePackDeploymentAuditEventType,
  ServicePackDeploymentBindingDomain,
  ServicePackDeploymentStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { buildServicePackConfigurationFingerprintFromManifest } from './service-pack-configuration-fingerprint.util';
import { SERVICE_PACK_DEPLOYMENT_REASON_CODES } from './service-pack-deployment.constants';
import {
  type ServicePackAcceptVersionRequest,
  type ServicePackCreateDeploymentRequest,
  type ServicePackDeploymentResult,
  type ServicePackDeployRequest,
  type ServicePackManifest,
  type ServicePackVersionResult,
} from './service-pack-deployment.types';
import { ServicePackDeploymentAuditService } from './service-pack-deployment-audit.service';

@Injectable()
export class ServicePackDeploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: ServicePackDeploymentAuditService,
  ) {}

  async acceptServicePackVersion(
    request: ServicePackAcceptVersionRequest,
  ): Promise<ServicePackVersionResult> {
    const version = await this.loadServicePackVersion(request.servicePackVersionId);

    if (version.status !== ServicePackVersionStatus.COMPILED) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.VERSION_NOT_COMPILED);
    }

    const acceptedAt = new Date();
    await this.prisma.servicePackVersion.update({
      where: { id: version.id },
      data: {
        status: ServicePackVersionStatus.ACCEPTED,
        acceptedAt,
      },
    });

    return {
      servicePackVersionId: version.id,
      priorStatus: ServicePackVersionStatus.COMPILED,
      newStatus: ServicePackVersionStatus.ACCEPTED,
      message: 'Service pack version accepted for governed deployment',
    };
  }

  async createDeployment(
    request: ServicePackCreateDeploymentRequest,
  ): Promise<ServicePackDeploymentResult> {
    const version = await this.loadServicePackVersion(request.servicePackVersionId);

    if (version.status !== ServicePackVersionStatus.ACCEPTED) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.VERSION_NOT_ACCEPTED);
    }

    const deployment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.servicePackDeployment.create({
        data: {
          servicePackVersionId: version.id,
          deploymentReference: request.deploymentReference,
          status: ServicePackDeploymentStatus.DEPLOYMENT_READY,
          actorIdentityId: request.actor.identityId,
          reason: request.reason,
        },
      });

      await this.auditService.recordEvent(
        {
          deploymentId: created.id,
          eventType: ServicePackDeploymentAuditEventType.DEPLOYMENT_READY,
          actorIdentityId: request.actor.identityId,
          priorStatus: null,
          newStatus: ServicePackDeploymentStatus.DEPLOYMENT_READY,
          reason: request.reason,
          metadata: {
            servicePackVersionId: version.id,
            servicePackVersionLabel: version.version,
          },
        },
        tx,
      );

      return created;
    });

    return {
      deploymentId: deployment.id,
      servicePackVersionId: version.id,
      priorStatus: null,
      newStatus: ServicePackDeploymentStatus.DEPLOYMENT_READY,
      message: 'Service pack deployment marked deployment-ready without activation',
    };
  }

  async deploy(request: ServicePackDeployRequest): Promise<ServicePackDeploymentResult> {
    const deployment = await this.loadDeployment(request.deploymentId);
    const version = await this.loadServicePackVersion(deployment.servicePackVersionId);
    const manifest = this.parseManifest(version.manifest, version.id, version.version);

    if (deployment.status !== ServicePackDeploymentStatus.DEPLOYMENT_READY) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.DEPLOYMENT_NOT_READY);
    }

    if (version.status !== ServicePackVersionStatus.ACCEPTED) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.VERSION_NOT_ACCEPTED);
    }

    await this.assertNoSilentOverwrite(manifest);

    const configurationFingerprint = buildServicePackConfigurationFingerprintFromManifest(manifest);
    const deployedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.servicePackDeploymentBinding.createMany({
        data: manifest.entries.map((entry) => ({
          servicePackDeploymentId: deployment.id,
          domain: entry.domain,
          domainEntityId: entry.entityId,
          domainEntityVersion: entry.entityVersion,
          bindingSnapshot: (entry.snapshot ?? {}) as Prisma.InputJsonValue,
          isReversible: true,
          isActivated: false,
        })),
      });

      const deployedRecord = await tx.servicePackDeployment.update({
        where: { id: deployment.id },
        data: {
          status: ServicePackDeploymentStatus.DEPLOYED,
          configurationFingerprint,
          deployedAt,
        },
      });

      await this.auditService.recordEvent(
        {
          deploymentId: deployment.id,
          eventType: ServicePackDeploymentAuditEventType.DEPLOYED,
          actorIdentityId: request.actor.identityId,
          priorStatus: ServicePackDeploymentStatus.DEPLOYMENT_READY,
          newStatus: ServicePackDeploymentStatus.DEPLOYED,
          reason: request.reason,
          metadata: {
            servicePackVersionId: version.id,
            servicePackVersionLabel: version.version,
            configurationFingerprint,
            bindingCount: manifest.entries.length,
          },
        },
        tx,
      );

      await this.auditService.recordEvent(
        {
          deploymentId: deployment.id,
          eventType: ServicePackDeploymentAuditEventType.FINGERPRINT_RECORDED,
          actorIdentityId: request.actor.identityId,
          priorStatus: ServicePackDeploymentStatus.DEPLOYED,
          newStatus: ServicePackDeploymentStatus.DEPLOYED,
          metadata: {
            configurationFingerprint,
            servicePackVersionId: version.id,
          },
        },
        tx,
      );

      return deployedRecord;
    });

    return {
      deploymentId: updated.id,
      servicePackVersionId: version.id,
      priorStatus: ServicePackDeploymentStatus.DEPLOYMENT_READY,
      newStatus: ServicePackDeploymentStatus.DEPLOYED,
      configurationFingerprint,
      message:
        'Service pack deployed into configuration without activating included government services',
    };
  }

  async getDeployment(deploymentId: string) {
    return this.loadDeployment(deploymentId);
  }

  private async assertNoSilentOverwrite(manifest: ServicePackManifest): Promise<void> {
    const serviceEntries = manifest.entries.filter(
      (entry) => entry.domain === ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
    );

    for (const entry of serviceEntries) {
      const version = await this.prisma.governmentServiceVersion.findUnique({
        where: { id: entry.entityId },
      });
      if (!version) {
        continue;
      }

      if (
        version.maturityStatus === GovernmentServiceMaturityStatus.ACTIVE &&
        entry.entityVersion &&
        entry.entityVersion !== version.version
      ) {
        throw new ForbiddenException(
          SERVICE_PACK_DEPLOYMENT_REASON_CODES.ACTIVE_SERVICE_SILENT_OVERWRITE,
        );
      }
    }
  }

  private parseManifest(
    manifestValue: unknown,
    servicePackVersionId: string,
    servicePackVersionLabel: string,
  ): ServicePackManifest {
    if (!manifestValue || typeof manifestValue !== 'object') {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.MANIFEST_INVALID);
    }

    const manifest = manifestValue as Partial<ServicePackManifest>;
    if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.MANIFEST_INVALID);
    }

    return {
      servicePackVersionId: manifest.servicePackVersionId ?? servicePackVersionId,
      servicePackVersionLabel: manifest.servicePackVersionLabel ?? servicePackVersionLabel,
      compilationFingerprint:
        typeof manifest.compilationFingerprint === 'string' ? manifest.compilationFingerprint : '',
      entries: manifest.entries.map((entry) => this.parseManifestEntry(entry)),
    };
  }

  private parseManifestEntry(entry: unknown): ServicePackManifest['entries'][number] {
    if (!entry || typeof entry !== 'object') {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.MANIFEST_INVALID);
    }

    const candidate = entry as Partial<ServicePackManifest['entries'][number]>;
    if (!candidate.domain || !candidate.entityId) {
      throw new BadRequestException(SERVICE_PACK_DEPLOYMENT_REASON_CODES.MANIFEST_INVALID);
    }

    return {
      domain: candidate.domain,
      entityId: candidate.entityId,
      entityVersion: candidate.entityVersion,
      snapshot: candidate.snapshot,
    };
  }

  private async loadServicePackVersion(servicePackVersionId: string) {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: servicePackVersionId },
    });
    if (!version) {
      throw new NotFoundException(`ServicePackVersion "${servicePackVersionId}" was not found`);
    }
    return version;
  }

  private async loadDeployment(deploymentId: string) {
    const deployment = await this.prisma.servicePackDeployment.findUnique({
      where: { id: deploymentId },
      include: {
        bindings: true,
        servicePackVersion: true,
      },
    });
    if (!deployment) {
      throw new NotFoundException(`ServicePackDeployment "${deploymentId}" was not found`);
    }
    return deployment;
  }
}

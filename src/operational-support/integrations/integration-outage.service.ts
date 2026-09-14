import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IntegrationFallbackStatus,
  IntegrationOutage,
  IntegrationOutageStatus,
  IntegrationRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_RECOVERY_PROBE_LIMIT,
} from '../operational-support.constants';

interface CircuitState {
  consecutiveFailures: number;
  recoveryProbes: number;
  open: boolean;
}

@Injectable()
export class IntegrationOutageService {
  private readonly circuitStates = new Map<string, CircuitState>();

  constructor(private readonly prisma: PrismaService) {}

  async assertExchangeAllowed(integrationDefinitionId: string): Promise<void> {
    const activeOutage = await this.prisma.integrationOutage.findFirst({
      where: {
        integrationDefinitionId,
        status: {
          in: [
            IntegrationOutageStatus.DETECTED,
            IntegrationOutageStatus.CONFIRMED,
            IntegrationOutageStatus.RECOVERING,
          ],
        },
      },
      include: {
        fallbackActivations: {
          where: { status: IntegrationFallbackStatus.IN_USE },
        },
      },
    });

    if (activeOutage?.status === IntegrationOutageStatus.CONFIRMED) {
      const fallback = activeOutage.fallbackActivations[0];
      if (fallback) {
        throw new BadRequestException(
          `Integration is in confirmed outage with fallback mode "${fallback.fallbackMode}"; fabricated live responses are not permitted`,
        );
      }
    }

    const circuit = this.getCircuitState(integrationDefinitionId);
    if (circuit.open) {
      throw new BadRequestException(
        'Integration circuit breaker is open; outbound exchange is blocked until recovery',
      );
    }
  }

  async recordFailedExchange(integrationDefinitionId: string, reason: string): Promise<void> {
    const circuit = this.getCircuitState(integrationDefinitionId);
    circuit.consecutiveFailures += 1;

    if (circuit.consecutiveFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      circuit.open = true;
      await this.openOutage(integrationDefinitionId, reason);
    }
  }

  async recordSuccessfulExchange(integrationDefinitionId: string): Promise<void> {
    const circuit = this.getCircuitState(integrationDefinitionId);
    circuit.consecutiveFailures = 0;

    if (circuit.open) {
      circuit.recoveryProbes += 1;
      if (circuit.recoveryProbes >= CIRCUIT_BREAKER_RECOVERY_PROBE_LIMIT) {
        circuit.open = false;
        circuit.recoveryProbes = 0;
        await this.resolveActiveOutage(integrationDefinitionId);
      }
    }
  }

  async activateFallback(
    integrationDefinitionId: string,
    fallbackMode: string,
    impactSummary?: string,
  ): Promise<IntegrationOutage> {
    const outage = await this.openOutage(
      integrationDefinitionId,
      impactSummary ?? 'Integration outage detected',
      IntegrationOutageStatus.CONFIRMED,
    );

    await this.prisma.integrationFallbackActivation.create({
      data: {
        integrationOutageId: outage.id,
        integrationDefinitionId,
        fallbackMode,
        status: IntegrationFallbackStatus.IN_USE,
      },
    });

    return outage;
  }

  async recordRecoveryEvent(
    integrationOutageId: string,
    recoveryAction: string,
    verifiedByIdentityId?: string,
    notes?: string,
  ): Promise<IntegrationOutage> {
    const outage = await this.prisma.integrationOutage.findUnique({
      where: { id: integrationOutageId },
    });

    if (!outage) {
      throw new BadRequestException(`IntegrationOutage ${integrationOutageId} not found`);
    }

    await this.prisma.integrationRecoveryEvent.create({
      data: {
        integrationOutageId,
        recoveryAction,
        verifiedByIdentityId,
        notes,
      },
    });

    await this.prisma.integrationFallbackActivation.updateMany({
      where: {
        integrationOutageId,
        status: IntegrationFallbackStatus.IN_USE,
      },
      data: {
        status: IntegrationFallbackStatus.DEACTIVATED,
        deactivatedAt: new Date(),
      },
    });

    return this.prisma.integrationOutage.update({
      where: { id: integrationOutageId },
      data: {
        status: IntegrationOutageStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  async safeHaltPendingRequests(integrationDefinitionId: string, reason: string): Promise<number> {
    const result = await this.prisma.integrationRequest.updateMany({
      where: {
        integrationVersion: { integrationDefinitionId },
        status: {
          in: [IntegrationRequestStatus.PENDING, IntegrationRequestStatus.IN_PROGRESS],
        },
      },
      data: { status: IntegrationRequestStatus.SAFE_HALTED },
    });

    await this.openOutage(integrationDefinitionId, reason, IntegrationOutageStatus.CONFIRMED);
    return result.count;
  }

  private getCircuitState(integrationDefinitionId: string): CircuitState {
    const existing = this.circuitStates.get(integrationDefinitionId);
    if (existing) {
      return existing;
    }

    const initial: CircuitState = {
      consecutiveFailures: 0,
      recoveryProbes: 0,
      open: false,
    };
    this.circuitStates.set(integrationDefinitionId, initial);
    return initial;
  }

  private async openOutage(
    integrationDefinitionId: string,
    impactSummary: string,
    status: IntegrationOutageStatus = IntegrationOutageStatus.DETECTED,
  ): Promise<IntegrationOutage> {
    const existing = await this.prisma.integrationOutage.findFirst({
      where: {
        integrationDefinitionId,
        status: {
          in: [
            IntegrationOutageStatus.DETECTED,
            IntegrationOutageStatus.CONFIRMED,
            IntegrationOutageStatus.RECOVERING,
          ],
        },
      },
    });

    if (existing) {
      return this.prisma.integrationOutage.update({
        where: { id: existing.id },
        data: {
          status,
          impactSummary,
          confirmedAt: status === IntegrationOutageStatus.CONFIRMED ? new Date() : undefined,
        },
      });
    }

    return this.prisma.integrationOutage.create({
      data: {
        integrationDefinitionId,
        status,
        impactSummary,
        confirmedAt: status === IntegrationOutageStatus.CONFIRMED ? new Date() : undefined,
      },
    });
  }

  private async resolveActiveOutage(integrationDefinitionId: string): Promise<void> {
    await this.prisma.integrationOutage.updateMany({
      where: {
        integrationDefinitionId,
        status: IntegrationOutageStatus.RECOVERING,
      },
      data: {
        status: IntegrationOutageStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.integrationOutage.updateMany({
      where: {
        integrationDefinitionId,
        status: IntegrationOutageStatus.DETECTED,
      },
      data: { status: IntegrationOutageStatus.RECOVERING },
    });
  }
}

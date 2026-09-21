import { Injectable } from '@nestjs/common';
import { IntelligenceAlertStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { OfficialAlertsResponseDto } from '../dto/official-alerts-response.dto';
import { type ResolvedOfficialContext } from '../types/official-context.types';

@Injectable()
export class OfficialAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAlerts(context: ResolvedOfficialContext): Promise<OfficialAlertsResponseDto> {
    const alerts = await this.prisma.intelligenceMonitoringAlert.findMany({
      where: {
        responsibleRecipientIdentityId: context.identityId,
        status: {
          in: [
            IntelligenceAlertStatus.GENERATED,
            IntelligenceAlertStatus.UNDER_REVIEW,
            IntelligenceAlertStatus.VERIFIED_EVENT,
          ],
        },
      },
      orderBy: { observedAt: 'desc' },
      take: 100,
    });

    return {
      generatedAt: new Date().toISOString(),
      items: alerts.map((alert) => ({
        alertId: alert.id,
        alertNumber: alert.alertNumber,
        observedCondition: alert.observedCondition,
        observedAt: alert.observedAt.toISOString(),
        status: alert.status,
        recommendedReview: alert.recommendedReview,
        isEmergency: alert.isEmergency,
        isEnforcement: alert.isEnforcement,
        actionRoute: `/api/v1/intelligence/monitoring/alerts/${alert.id}`,
      })),
      totalCount: alerts.length,
    };
  }
}

import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { OperationalAlertService } from './alerts/operational-alert.service';
import { CapacityService } from './capacity/capacity.service';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { CorrelationIdService } from './common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from './common/production-reliability-boundary.service';
import { ServiceHealthService } from './health/service-health.service';
import { ObservabilityService } from './observability/observability.service';
import { OperationalHealthEventService } from './observability/operational-health-event.service';
import { PerformanceTestService } from './performance/performance-test.service';
import { ProductionReliabilityController } from './production-reliability.controller';
import { RateLimitService } from './rate-limiting/rate-limit.service';
import { ServiceReliabilityService } from './reliability/service-reliability.service';
import { OperationalRunbookService } from './runbooks/operational-runbook.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [ProductionReliabilityController],
  providers: [
    ProductionReliabilityBoundaryService,
    CorrelationIdService,
    CorrelationIdMiddleware,
    ServiceHealthService,
    ServiceReliabilityService,
    CapacityService,
    PerformanceTestService,
    ObservabilityService,
    OperationalHealthEventService,
    OperationalAlertService,
    OperationalRunbookService,
    RateLimitService,
  ],
  exports: [
    ProductionReliabilityBoundaryService,
    CorrelationIdService,
    ServiceHealthService,
    ServiceReliabilityService,
    CapacityService,
    PerformanceTestService,
    ObservabilityService,
    OperationalHealthEventService,
    OperationalAlertService,
    OperationalRunbookService,
    RateLimitService,
  ],
})
export class ProductionReliabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

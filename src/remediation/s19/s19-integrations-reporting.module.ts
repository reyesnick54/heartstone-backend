import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../database/database.module';
import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { ServiceRuntimeGateService } from './activation/service-runtime-gate.service';
import { IntegrationCredentialResolverService } from './integrations/integration-credential-resolver.service';
import { OperationalDurableRetryService } from './integrations/operational-durable-retry.service';
import { OperationalSecurityTelemetryService } from './observability/operational-security-telemetry.service';
import { TraceCorrelationService } from './observability/trace-correlation.service';
import { OperationalProvidersModule } from './providers/operational-providers.module';
import { AppendixGReportService } from './reporting/appendix-g-report.service';
import { ComputedMetricService } from './reporting/computed-metric.service';
import { ExecutiveReportScopeService } from './reporting/executive-report-scope.service';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, IdentityCommonModule, OperationalProvidersModule],
  providers: [
    IntegrationCredentialResolverService,
    OperationalDurableRetryService,
    ComputedMetricService,
    ExecutiveReportScopeService,
    AppendixGReportService,
    ServiceRuntimeGateService,
    TraceCorrelationService,
    OperationalSecurityTelemetryService,
  ],
  exports: [
    IntegrationCredentialResolverService,
    OperationalDurableRetryService,
    ComputedMetricService,
    ExecutiveReportScopeService,
    AppendixGReportService,
    ServiceRuntimeGateService,
    TraceCorrelationService,
    OperationalSecurityTelemetryService,
    OperationalProvidersModule,
  ],
})
export class S19IntegrationsReportingModule {}

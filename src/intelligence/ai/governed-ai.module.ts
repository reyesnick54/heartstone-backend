import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditGovernanceModule } from '../../audit-governance/audit-governance.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../identity/auth/auth.module';
import { DeterministicGovernedAiAdapter } from './adapters/deterministic-governed-ai.adapter';
import { UnavailableExternalAiAdapter } from './adapters/unavailable-external-ai.adapter';
import governedAiConfig from './config/governed-ai.config';
import { GovernedAiController } from './governed-ai.controller';
import { AI_MODEL_PORT } from './ports/ai-model.port';
import { AiCallAuditService } from './services/ai-call-audit.service';
import { AiCallRuntimeService } from './services/ai-call-runtime.service';
import { AiConsequentialDefenseService } from './services/ai-consequential-defense.service';
import { AiDataBoundaryService } from './services/ai-data-boundary.service';
import { AiGovernanceSuspensionService } from './services/ai-governance-suspension.service';
import { AiGovernedRegistryService } from './services/ai-governed-registry.service';
import { AiPolicyGateService } from './services/ai-policy-gate.service';
import { AiToolAuthorizationService } from './services/ai-tool-authorization.service';
import { AiUserOutputGateService } from './services/ai-user-output-gate.service';
import { GovernedAiProductionGateService } from './services/governed-ai-production-gate.service';

@Module({
  imports: [ConfigModule.forFeature(governedAiConfig), DatabaseModule, AuditGovernanceModule, AuthModule],
  controllers: [GovernedAiController],
  providers: [
    DeterministicGovernedAiAdapter,
    UnavailableExternalAiAdapter,
    AiGovernanceSuspensionService,
    AiDataBoundaryService,
    AiPolicyGateService,
    AiCallAuditService,
    AiToolAuthorizationService,
    AiConsequentialDefenseService,
    AiUserOutputGateService,
    GovernedAiProductionGateService,
    AiGovernedRegistryService,
    AiCallRuntimeService,
    {
      provide: AI_MODEL_PORT,
      useExisting: DeterministicGovernedAiAdapter,
    },
  ],
  exports: [
    AiCallRuntimeService,
    AiPolicyGateService,
    AiGovernedRegistryService,
    AiConsequentialDefenseService,
    GovernedAiProductionGateService,
    AI_MODEL_PORT,
  ],
})
export class GovernedAiModule {}

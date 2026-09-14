import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AutomationChallengeService } from './automation/automation-challenge.service';
import { AutomationExplanationService } from './automation/automation-explanation.service';
import { ClarificationService } from './clarification/clarification.service';
import { ClarificationBoundaryService } from './clarification/clarification-boundary.service';
import { AdministrativeCorrectionService } from './correction/administrative-correction.service';
import { AdministrativeCorrectionBoundaryService } from './correction/administrative-correction-boundary.service';
import { RedressController } from './redress.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, EvidenceModule],
  controllers: [RedressController],
  providers: [
    AdministrativeCorrectionBoundaryService,
    AdministrativeCorrectionService,
    ClarificationBoundaryService,
    ClarificationService,
    AutomationExplanationService,
    AutomationChallengeService,
  ],
  exports: [
    AdministrativeCorrectionBoundaryService,
    AdministrativeCorrectionService,
    ClarificationBoundaryService,
    ClarificationService,
    AutomationExplanationService,
    AutomationChallengeService,
  ],
})
export class RedressModule {}

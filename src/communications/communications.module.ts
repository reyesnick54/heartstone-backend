import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AccessibilityAccommodationService } from './accessibility/accessibility-accommodation.service';
import { CommunicationsBoundaryService } from './common/communications-boundary.service';
import { CommunicationsController } from './communications.controller';
import {
  DeterministicEmailNotificationAdapter,
  DeterministicPortalNotificationAdapter,
  DeterministicPushNotificationAdapter,
  DeterministicSmsNotificationAdapter,
} from './delivery/adapters/deterministic-notification.adapters';
import { CommunicationDeliveryService } from './delivery/communication-delivery.service';
import { CommunicationFailureService } from './failure/communication-failure.service';
import { CommunicationMafIndexService } from './maf/communication-maf-index.service';
import { MandatoryCommunicationRuleService } from './mandatory/mandatory-communication-rule.service';
import { CommunicationMessageService } from './messages/communication-message.service';
import { CommunicationPreferenceService } from './preferences/communication-preference.service';
import { CommunicationReceiptService } from './receipt/communication-receipt.service';
import { CommunicationRecipientService } from './recipients/communication-recipient.service';
import { CommunicationTemplateService } from './templates/communication-template.service';
import { TranslationRecordService } from './translation/translation-record.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsBoundaryService,
    CommunicationTemplateService,
    CommunicationMessageService,
    CommunicationRecipientService,
    CommunicationDeliveryService,
    CommunicationReceiptService,
    CommunicationPreferenceService,
    MandatoryCommunicationRuleService,
    TranslationRecordService,
    AccessibilityAccommodationService,
    CommunicationFailureService,
    CommunicationMafIndexService,
    DeterministicEmailNotificationAdapter,
    DeterministicSmsNotificationAdapter,
    DeterministicPushNotificationAdapter,
    DeterministicPortalNotificationAdapter,
  ],
  exports: [
    CommunicationsBoundaryService,
    CommunicationTemplateService,
    CommunicationMessageService,
    CommunicationRecipientService,
    CommunicationDeliveryService,
    CommunicationReceiptService,
    CommunicationPreferenceService,
    MandatoryCommunicationRuleService,
    TranslationRecordService,
    AccessibilityAccommodationService,
    CommunicationFailureService,
    CommunicationMafIndexService,
  ],
})
export class CommunicationsModule {}

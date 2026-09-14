import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CommunicationDeliveryService } from './delivery/communication-delivery.service';
import { MandatoryCommunicationRuleService } from './mandatory/mandatory-communication-rule.service';
import { CommunicationMessageService } from './messages/communication-message.service';
import { CommunicationPreferenceService } from './preferences/communication-preference.service';
import { CommunicationReceiptService } from './receipt/communication-receipt.service';
import { CommunicationRecipientService } from './recipients/communication-recipient.service';
import { CommunicationTemplateService } from './templates/communication-template.service';
import { TranslationRecordService } from './translation/translation-record.service';

@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly templates: CommunicationTemplateService,
    private readonly messages: CommunicationMessageService,
    private readonly recipients: CommunicationRecipientService,
    private readonly deliveries: CommunicationDeliveryService,
    private readonly receipts: CommunicationReceiptService,
    private readonly preferences: CommunicationPreferenceService,
    private readonly mandatoryRules: MandatoryCommunicationRuleService,
    private readonly translations: TranslationRecordService,
  ) {}

  @Post('templates')
  createTemplate(@Body() body: Parameters<CommunicationTemplateService['createTemplate']>[0]) {
    return this.templates.createTemplate(body);
  }

  @Post('templates/versions')
  createTemplateVersion(
    @Body() body: Parameters<CommunicationTemplateService['createVersion']>[0],
  ) {
    return this.templates.createVersion(body);
  }

  @Post('templates/versions/:versionId/activate')
  activateTemplateVersion(
    @Param('versionId') versionId: string,
    @Body('activatedByIdentityId') activatedByIdentityId: string,
  ) {
    return this.templates.activateVersion(versionId, activatedByIdentityId);
  }

  @Post('messages')
  prepareMessage(@Body() body: Parameters<CommunicationMessageService['prepareMessage']>[0]) {
    return this.messages.prepareMessage(body);
  }

  @Post('messages/:messageId/approve')
  approveMessage(
    @Param('messageId') messageId: string,
    @Body('approvedByIdentityId') approvedByIdentityId: string,
  ) {
    return this.messages.approveMessage({ messageId, approvedByIdentityId });
  }

  @Post('recipients')
  addRecipient(@Body() body: Parameters<CommunicationRecipientService['addRecipient']>[0]) {
    return this.recipients.addRecipient(body);
  }

  @Post('deliveries')
  prepareDelivery(@Body() body: Parameters<CommunicationDeliveryService['prepareDelivery']>[0]) {
    return this.deliveries.prepareDelivery(body);
  }

  @Post('deliveries/:deliveryId/send')
  sendDelivery(@Param('deliveryId') deliveryId: string) {
    return this.deliveries.sendDelivery(deliveryId);
  }

  @Post('receipts')
  recordReceipt(@Body() body: Parameters<CommunicationReceiptService['recordReceipt']>[0]) {
    return this.receipts.recordReceipt(body);
  }

  @Post('preferences')
  upsertPreference(
    @Body() body: Parameters<CommunicationPreferenceService['upsertPreference']>[0],
  ) {
    return this.preferences.upsertPreference(body);
  }

  @Post('mandatory-rules')
  createMandatoryRule(
    @Body() body: Parameters<MandatoryCommunicationRuleService['createRule']>[0],
  ) {
    return this.mandatoryRules.createRule(body);
  }

  @Get('mandatory-rules')
  listMandatoryRules() {
    return this.mandatoryRules.listRules();
  }

  @Post('translations')
  createTranslation(@Body() body: Parameters<TranslationRecordService['createTranslation']>[0]) {
    return this.translations.createTranslation(body);
  }
}

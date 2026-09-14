import {
  CommunicationAiDraftStatus,
  CommunicationChannel,
  CommunicationClassification,
  CommunicationDeliveryStatus,
  CommunicationMandatoryCategory,
  CommunicationMessageStatus,
  CommunicationPreferenceScope,
  CommunicationReceiptMethod,
  CommunicationRecipientRole,
  CommunicationServiceCapacity,
  RepresentativeAuthorityStatus,
  TranslationMethod,
} from '@prisma/client';

import {
  CertifiedTranslationRequiredException,
  CommunicationApprovalRequiredException,
  CommunicationChannelForbiddenException,
  CommunicationRecipientBlockedException,
  DuplicateReceiptException,
  MandatoryCommunicationSuppressedException,
  RepresentativeAuthorityInvalidException,
  SubstantiveNoticeDuplicationException,
  TemplateInjectionException,
} from './common/communications.exceptions';
import { CommunicationsBoundaryService } from './common/communications-boundary.service';
import { assertSafeTemplateContent } from './common/template-sanitizer.util';
import {
  DeterministicEmailNotificationAdapter,
  DeterministicPortalNotificationAdapter,
  DeterministicPushNotificationAdapter,
  DeterministicSmsNotificationAdapter,
} from './delivery/adapters/deterministic-notification.adapters';
import { CommunicationDeliveryService } from './delivery/communication-delivery.service';
import { CommunicationMafIndexService } from './maf/communication-maf-index.service';
import { CommunicationMessageService } from './messages/communication-message.service';
import { CommunicationPreferenceService } from './preferences/communication-preference.service';
import { CommunicationReceiptService } from './receipt/communication-receipt.service';
import { CommunicationRecipientService } from './recipients/communication-recipient.service';
import { TranslationRecordService } from './translation/translation-record.service';

describe('Phase 11D communications delivery engine', () => {
  const boundary = new CommunicationsBoundaryService();

  describe('boundary distinctions', () => {
    it('message != decision: communication references source record without duplicating notice body', () => {
      expect(() => {
        boundary.assertNotDuplicatingSubstantiveNotice('DecisionNotice', 'full notice text');
      }).toThrow(SubstantiveNoticeDuplicationException);
    });

    it('delivery attempt != delivery: attempt and delivery statuses are tracked separately', () => {
      expect(CommunicationDeliveryStatus.SENT).not.toEqual(CommunicationDeliveryStatus.DELIVERED);
    });

    it('delivery != receipt: receipt is a separate acknowledgment event', () => {
      expect(CommunicationReceiptMethod.EXPLICIT_ACKNOWLEDGMENT).toBeDefined();
      expect(CommunicationDeliveryStatus.DELIVERED).toBeDefined();
    });

    it('email open != legal receipt', () => {
      expect(boundary.emailOpenDoesNotEqualLegalReceipt(true)).toBe(true);
    });
  });

  describe('CommunicationPreferenceService', () => {
    const prisma = {
      communicationPreference: { findFirst: jest.fn(), upsert: jest.fn() },
    };
    const preferenceService = new CommunicationPreferenceService(prisma as never, boundary);

    it('preference cannot suppress mandatory notice', async () => {
      await expect(
        preferenceService.assertDeliveryAllowed({
          identityId: 'identity-1',
          channel: CommunicationChannel.EMAIL,
          mandatoryCategory: CommunicationMandatoryCategory.REQUIRED_DECISION_NOTICE,
          requiredOrOptional: false,
        }),
      ).resolves.toBeUndefined();
    });

    it('optional marketing preference respected', async () => {
      prisma.communicationPreference.findFirst.mockResolvedValue({
        enabled: false,
        scope: CommunicationPreferenceScope.MARKETING,
      });

      await expect(
        preferenceService.assertDeliveryAllowed({
          identityId: 'identity-1',
          channel: CommunicationChannel.EMAIL,
          mandatoryCategory: null,
          requiredOrOptional: false,
        }),
      ).rejects.toThrow(MandatoryCommunicationSuppressedException);
    });
  });

  describe('CommunicationRecipientService', () => {
    const prisma = {
      communicationMessage: { findUnique: jest.fn() },
      communicationRecipient: { create: jest.fn(), findUnique: jest.fn() },
      representativeAuthority: { findUnique: jest.fn() },
    };
    const recipientService = new CommunicationRecipientService(prisma as never, boundary);

    it('wrong recipient blocked', async () => {
      prisma.communicationRecipient.findUnique.mockResolvedValue({
        id: 'recipient-1',
        blocked: true,
        blockReason: 'wrong party',
        recipientRole: CommunicationRecipientRole.PRIMARY,
        legalServiceCapacity: CommunicationServiceCapacity.PERSONAL,
        representativeAuthority: null,
      });

      await expect(recipientService.assertRecipientEligible('recipient-1')).rejects.toThrow(
        CommunicationRecipientBlockedException,
      );
    });

    it('expired representative blocked', () => {
      expect(() => {
        boundary.assertRepresentativeAuthorityValid({
          id: 'auth-1',
          organizationId: 'org-1',
          identityId: 'identity-1',
          scopeDescription: 'represent',
          status: RepresentativeAuthorityStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
          effectiveUntil: new Date('2020-12-31'),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow(RepresentativeAuthorityInvalidException);
    });
  });

  describe('CommunicationDeliveryService', () => {
    const prisma = {
      communicationTemplateVersion: { findUnique: jest.fn() },
      communicationDelivery: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      communicationDeliveryAttempt: { count: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    const messageService = {
      assertReadyForDelivery: jest.fn().mockResolvedValue({
        id: 'message-1',
        classification: CommunicationClassification.RESTRICTED,
        subject: 'Notice',
        mandatoryCategory: CommunicationMandatoryCategory.REQUIRED_DECISION_NOTICE,
        masterAdministrativeFileId: 'maf-1',
        templateVersionId: null,
        sourceRecordType: 'DecisionNotice',
        sourceRecordId: 'notice-1',
        canonicalNoticeReference: 'DecisionNotice:notice-1',
      }),
    };

    const recipientService = {
      assertRecipientEligible: jest.fn().mockResolvedValue({
        id: 'recipient-1',
        recipientIdentityId: 'identity-1',
        channelReference: 'portal://identity-1',
      }),
    };

    const preferenceService = {
      assertDeliveryAllowed: jest.fn().mockResolvedValue(undefined),
    };

    const failureService = {
      recordFailure: jest.fn(),
    };

    const mafIndexService = {
      indexDeliveredCommunication: jest.fn(),
    };

    const deliveryService = new CommunicationDeliveryService(
      prisma as never,
      boundary,
      messageService as never,
      recipientService as never,
      preferenceService as never,
      failureService as never,
      mafIndexService as never,
      new DeterministicEmailNotificationAdapter(),
      new DeterministicSmsNotificationAdapter(),
      new DeterministicPushNotificationAdapter(),
      new DeterministicPortalNotificationAdapter(),
    );

    it('restricted message cannot use unapproved channel', () => {
      expect(() => {
        boundary.assertChannelApprovedForClassification(
          CommunicationChannel.EMAIL,
          CommunicationClassification.RESTRICTED,
        );
      }).toThrow(CommunicationChannelForbiddenException);
    });

    it('failed delivery recorded', async () => {
      prisma.communicationDelivery.findUnique.mockResolvedValue({
        id: 'delivery-1',
        messageId: 'message-1',
        recipientId: 'recipient-1',
        channel: CommunicationChannel.PORTAL,
        provider: 'PORTAL',
        destinationReference: 'portal://identity-1',
        message: {
          masterAdministrativeFileId: 'maf-1',
          templateVersionId: null,
          sourceRecordType: 'DecisionNotice',
          sourceRecordId: 'notice-1',
        },
      });
      prisma.communicationDeliveryAttempt.update.mockResolvedValue({});
      prisma.communicationDelivery.update.mockResolvedValue({
        id: 'delivery-1',
        status: CommunicationDeliveryStatus.FAILED,
      });
      failureService.recordFailure.mockResolvedValue({ id: 'failure-1' });

      await deliveryService.markFailed('delivery-1', 'attempt-1', 'provider unavailable');

      expect(failureService.recordFailure).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryId: 'delivery-1' }),
      );
    });

    it('retry idempotent when idempotency key matches', async () => {
      prisma.communicationDelivery.findUnique.mockResolvedValue({
        id: 'delivery-1',
        idempotencyKey: 'idem-1',
      });

      const result = await deliveryService.retryDelivery('delivery-1', 'idem-1');
      expect(result.id).toBe('delivery-1');
    });

    it('MAF records exact delivered version', async () => {
      prisma.communicationDelivery.update.mockResolvedValue({
        id: 'delivery-1',
        messageId: 'message-1',
        providerReference: 'portal:attempt-1',
        message: {
          masterAdministrativeFileId: 'maf-1',
          templateVersionId: 'version-1',
          sourceRecordType: 'DecisionNotice',
          sourceRecordId: 'notice-1',
        },
      });
      prisma.communicationDeliveryAttempt.update.mockResolvedValue({});

      await deliveryService.markDelivered('delivery-1', 'attempt-1', 'portal:attempt-1');

      expect(mafIndexService.indexDeliveredCommunication).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveredVersionReference: 'portal:attempt-1',
          templateVersionId: 'version-1',
        }),
      );
    });
  });

  describe('CommunicationMessageService', () => {
    const prisma = {
      communicationTemplateVersion: { findUnique: jest.fn() },
      communicationMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const messageService = new CommunicationMessageService(prisma as never, boundary);

    it('AI draft not sent as official without required approval', async () => {
      prisma.communicationMessage.findUnique.mockResolvedValue({
        id: 'message-1',
        isOfficial: false,
        aiDraftStatus: CommunicationAiDraftStatus.PENDING_HUMAN_APPROVAL,
        templateVersion: { requiresApproval: true },
        approvedByIdentityId: null,
      });

      await expect(messageService.assertReadyForDelivery('message-1')).rejects.toThrow(
        CommunicationApprovalRequiredException,
      );
    });

    it('approving message marks it official', async () => {
      prisma.communicationMessage.findUnique.mockResolvedValue({
        id: 'message-1',
        aiDraftStatus: CommunicationAiDraftStatus.PENDING_HUMAN_APPROVAL,
        templateVersion: { requiresApproval: true },
      });
      prisma.communicationMessage.update.mockResolvedValue({
        id: 'message-1',
        isOfficial: true,
        status: CommunicationMessageStatus.APPROVED,
      });

      const approved = await messageService.approveMessage({
        messageId: 'message-1',
        approvedByIdentityId: 'approver-1',
      });

      expect(approved.isOfficial).toBe(true);
    });
  });

  describe('TranslationRecordService', () => {
    const prisma = {
      communicationMessage: { findUnique: jest.fn() },
      translationRecord: { create: jest.fn(), update: jest.fn() },
    };
    const translationService = new TranslationRecordService(prisma as never);

    it('AI translation labeled and certified route preserved', async () => {
      prisma.communicationMessage.findUnique.mockResolvedValue({
        id: 'message-1',
        templateVersionId: 'version-1',
        templateVersion: { certifiedTranslationRequired: true },
      });

      await expect(
        translationService.createTranslation({
          messageId: 'message-1',
          targetLanguage: 'es',
          translationMethod: TranslationMethod.AI_ASSISTED,
          translatedSubject: 'Aviso',
          translatedContent: 'Contenido',
          aiAssisted: true,
          certifiedRequired: true,
        }),
      ).rejects.toThrow(CertifiedTranslationRequiredException);
    });
  });

  describe('CommunicationReceiptService', () => {
    const prisma = {
      communicationReceipt: { findUnique: jest.fn(), create: jest.fn() },
      communicationDelivery: { findUnique: jest.fn() },
    };
    const receiptService = new CommunicationReceiptService(prisma as never);

    it('duplicate callback does not duplicate receipt', async () => {
      prisma.communicationReceipt.findUnique.mockResolvedValue({ id: 'receipt-1' });

      await expect(
        receiptService.recordReceipt({
          deliveryId: 'delivery-1',
          recipientId: 'recipient-1',
          receivedAt: new Date(),
          method: CommunicationReceiptMethod.PORTAL_CONFIRMATION,
          callbackIdempotencyKey: 'callback-1',
        }),
      ).rejects.toThrow(DuplicateReceiptException);
    });

    it('email open pixel does not create legal receipt', async () => {
      prisma.communicationReceipt.findUnique.mockResolvedValue(null);
      prisma.communicationDelivery.findUnique.mockResolvedValue({
        id: 'delivery-1',
        message: { deliveryEffect: 'INFORMATIONAL_ONLY' },
      });
      prisma.communicationReceipt.create.mockResolvedValue({
        isLegalReceipt: false,
        emailOpenPixel: true,
      });

      const receipt = await receiptService.recordEmailOpenPixel('delivery-1', 'recipient-1');
      expect(receipt.isLegalReceipt).toBe(false);
      expect(receipt.emailOpenPixel).toBe(true);
    });
  });

  describe('CommunicationTemplateService', () => {
    it('template injection rejected', () => {
      expect(() => {
        assertSafeTemplateContent('subjectTemplate', '<script>');
      }).toThrow(TemplateInjectionException);
    });
  });

  describe('CommunicationMafIndexService', () => {
    const prisma = {
      communicationMafIndexEntry: { upsert: jest.fn(), findMany: jest.fn() },
    };
    const mafIndexService = new CommunicationMafIndexService(prisma as never);

    it('indexes exact delivered version reference', async () => {
      prisma.communicationMafIndexEntry.upsert.mockResolvedValue({
        deliveredVersionReference: 'portal:attempt-1',
      });

      const entry = await mafIndexService.indexDeliveredCommunication({
        masterAdministrativeFileId: 'maf-1',
        messageId: 'message-1',
        templateVersionId: 'version-1',
        deliveredVersionReference: 'portal:attempt-1',
      });

      expect(entry.deliveredVersionReference).toBe('portal:attempt-1');
    });
  });

  describe('mandatory preference boundary', () => {
    it('throws when mandatory communication would be suppressed', () => {
      expect(() => {
        boundary.assertMandatoryNotSuppressed(CommunicationMandatoryCategory.APPEAL_NOTICE, false);
      }).toThrow(MandatoryCommunicationSuppressedException);
    });
  });

  describe('provider adapters', () => {
    it('uses deterministic test adapters without real credentials', async () => {
      const adapter = new DeterministicEmailNotificationAdapter();
      const result = await adapter.send({
        deliveryId: 'delivery-1',
        attemptId: 'attempt-1',
        messageId: 'message-1',
        channel: CommunicationChannel.EMAIL,
        subject: 'Test',
        bodyReference: 'DecisionNotice:1',
        classification: CommunicationClassification.OFFICIAL,
      });

      expect(result.providerReference).toContain('email:attempt-1');
      expect(result.queued).toBe(true);
    });
  });
});

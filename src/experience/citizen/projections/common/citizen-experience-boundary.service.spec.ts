import {
  CommunicationChannelType,
  CommunicationMessageStatus,
  DocumentSecurityClassification,
  MalwareScanStatus,
} from '@prisma/client';

import { CitizenExperienceBoundaryService } from './citizen-experience-boundary.service';

describe('CitizenExperienceBoundaryService', () => {
  const service = new CitizenExperienceBoundaryService();

  it('excludes restricted document classifications', () => {
    expect(
      service.isDocumentClassificationCitizenVisible(DocumentSecurityClassification.PUBLIC),
    ).toBe(true);
    expect(
      service.isDocumentClassificationCitizenVisible(DocumentSecurityClassification.RESTRICTED),
    ).toBe(false);
  });

  it('excludes blocked malware scan statuses', () => {
    expect(service.isMalwareStatusCitizenVisible(MalwareScanStatus.CLEAN)).toBe(true);
    expect(service.isMalwareStatusCitizenVisible(MalwareScanStatus.MALICIOUS)).toBe(false);
  });

  it('permits portal acknowledgment only for delivered portal messages', () => {
    expect(
      service.isMessageAcknowledgable({
        status: CommunicationMessageStatus.DELIVERED,
        channelType: CommunicationChannelType.PORTAL,
        recipientMatches: true,
        alreadyAcknowledged: false,
      }),
    ).toBe(true);

    expect(
      service.isMessageAcknowledgable({
        status: CommunicationMessageStatus.APPROVED,
        channelType: CommunicationChannelType.PORTAL,
        recipientMatches: true,
        alreadyAcknowledged: false,
      }),
    ).toBe(false);
  });
});

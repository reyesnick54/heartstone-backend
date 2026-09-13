import {
  type CaseCommunicationChannel,
  type CaseCommunicationDeliveryStatus,
  type CaseCommunicationType,
  type CaseEventPublicVisibility,
  type CaseMilestoneStatus,
  type CaseRecipientType,
  type CaseRecordClassification,
} from '@prisma/client';

export interface CreateCaseCommunicationInput {
  caseId: string;
  communicationType: CaseCommunicationType;
  senderIdentityId?: string;
  senderOfficeholderId?: string;
  recipientType: CaseRecipientType;
  recipientReference?: string;
  channel: CaseCommunicationChannel;
  subject?: string;
  body: string;
  templateReference?: string;
  templateVersion?: string;
  sentAt?: Date;
  receivedAt?: Date;
  deliveryStatus?: CaseCommunicationDeliveryStatus;
  classification?: CaseRecordClassification;
  publicVisibility?: CaseEventPublicVisibility;
}

export interface CreateCaseMilestoneInput {
  caseId: string;
  name: string;
  targetDate?: Date;
  actualDate?: Date;
  status?: CaseMilestoneStatus;
  responsiblePartyRef?: string;
  sourceSlaReference?: string;
  dependencyReference?: string;
}

export interface UpdateCaseMilestoneInput {
  targetDate?: Date;
  actualDate?: Date;
  status?: CaseMilestoneStatus;
  responsiblePartyRef?: string;
}

import { CaseStatus, CommunicationChannelType, GovernmentDecisionStatus } from '@prisma/client';

/** Channels a citizen may configure. Internal channels (in person, secure messaging) are not. */
export const CITIZEN_CONFIGURABLE_CHANNELS = [
  CommunicationChannelType.EMAIL,
  CommunicationChannelType.SMS,
  CommunicationChannelType.PORTAL,
  CommunicationChannelType.POSTAL,
] as const;

export type CitizenConfigurableChannel = (typeof CITIZEN_CONFIGURABLE_CHANNELS)[number];

/** File types a citizen may upload to an application. */
export const CITIZEN_UPLOAD_CONTENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** Largest decoded upload accepted from a citizen (bytes). */
export const CITIZEN_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Case statuses in which a citizen may add documents to a submitted application. Before
 * submission (application DRAFT) uploads are always allowed; after submission only while the
 * case is waiting for the applicant, mirroring the corrections rule.
 */
export const CITIZEN_UPLOAD_OPEN_CASE_STATUSES: readonly CaseStatus[] = [
  CaseStatus.WAITING_APPLICANT,
];

/** Decision statuses a citizen may ask to have reviewed: decided, not yet superseded/set aside. */
export const CITIZEN_REVIEWABLE_DECISION_STATUSES: readonly GovernmentDecisionStatus[] = [
  GovernmentDecisionStatus.FINALIZED,
  GovernmentDecisionStatus.RECORDED,
  GovernmentDecisionStatus.CONDITIONS_PRECEDENT_PENDING,
  GovernmentDecisionStatus.EFFECTIVE,
];

/** Fields of the citizen's Person record a correction request may propose to change. */
export const CITIZEN_PROFILE_CORRECTABLE_FIELDS = [
  'givenName',
  'familyName',
  'displayName',
] as const;

export type CitizenProfileCorrectableField = (typeof CITIZEN_PROFILE_CORRECTABLE_FIELDS)[number];

export const CITIZEN_PROFILE_CORRECTION_TARGET = 'Person';

export const CITIZEN_SELF_SERVICE_ERROR_CODES = {
  APPLICATION_CLOSED_FOR_UPLOADS: 'APPLICATION_CLOSED_FOR_UPLOADS',
  UPLOAD_TOO_LARGE: 'UPLOAD_TOO_LARGE',
  UPLOAD_EMPTY: 'UPLOAD_EMPTY',
  DECISION_NOT_REVIEWABLE: 'DECISION_NOT_REVIEWABLE',
  REVIEW_ROUTE_NOT_AVAILABLE: 'REVIEW_ROUTE_NOT_AVAILABLE',
  REVIEW_ALREADY_REQUESTED: 'REVIEW_ALREADY_REQUESTED',
  PERSON_RECORD_NOT_LINKED: 'PERSON_RECORD_NOT_LINKED',
  NO_CHANGE_REQUESTED: 'NO_CHANGE_REQUESTED',
  MESSAGE_NOT_ADDRESSED_TO_CITIZEN: 'MESSAGE_NOT_ADDRESSED_TO_CITIZEN',
} as const;

export const CITIZEN_REVIEW_REQUEST_DISCLAIMER =
  'A request for review records your challenge for an authorized reviewer. It does not change, suspend or reverse the decision unless the review route itself provides for that.';

export const CITIZEN_PROFILE_CORRECTION_DISCLAIMER =
  'A correction request is reviewed by an authorized official. Your record is not changed until a correction is approved and implemented, and the original is kept.';

export const CITIZEN_COMMUNICATION_PREFERENCES_DISCLAIMER =
  'Preferences apply to optional communications. Notices the law requires are delivered regardless of these settings.';

export const CITIZEN_DOCUMENT_UPLOAD_DISCLAIMER =
  'Uploading a document records receipt only. It is not verification of the document or acceptance of anything it claims.';

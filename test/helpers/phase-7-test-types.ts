import { type Phase6FixtureContext } from './phase-6-test-fixtures';

export interface MasterFileBody {
  id: string;
  fileReference: string;
  caseId: string;
  status: string;
}

export interface EvidenceBody {
  id: string;
  evidenceReference: string;
  status: string;
}

export interface PacketBody {
  id: string;
  packetReference: string;
  status: string;
  sealedAt?: string | null;
}

export interface CompletenessBody {
  outcome: string;
  requiredEvidenceCount: number;
  satisfiedEvidenceCount: number;
}

export interface Phase7FixtureContext extends Phase6FixtureContext {
  caseId: string;
  applicationId: string;
  submissionId: string;
  masterFileId: string;
  masterFileReference: string;
  documentId: string;
  documentReference: string;
  evidenceId: string;
  evidenceReference: string;
  requirementCodes: string[];
}

export function asMasterFileBody(body: unknown): MasterFileBody {
  return body as MasterFileBody;
}

export function asEvidenceBody(body: unknown): EvidenceBody {
  return body as EvidenceBody;
}

export function asPacketBody(body: unknown): PacketBody {
  return body as PacketBody;
}

export function asCompletenessBody(body: unknown): CompletenessBody {
  return body as CompletenessBody;
}

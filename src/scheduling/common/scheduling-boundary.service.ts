import { BadRequestException, Injectable } from '@nestjs/common';

const FORBIDDEN_CLIENT_PARTICIPANT_FIELDS = [
  'identityId',
  'participantIdentityId',
  'participants',
] as const;

@Injectable()
export class SchedulingBoundaryService {
  rejectClientParticipantIdentityOverride(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PARTICIPANT_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(
          'Participant identity is assigned server-side and cannot be supplied by the client',
        );
      }
    }
  }

  rejectInstrumentIssuanceAttempt(): never {
    throw new BadRequestException(
      'Service appointments cannot issue official instruments or regulatory decisions',
    );
  }
}

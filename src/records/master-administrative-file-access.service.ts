import { Injectable } from '@nestjs/common';
import {
  CaseEventPublicVisibility,
  CaseRecordClassification,
  IdentityType,
  type MasterAdministrativeFile,
  MasterAdministrativeFileSectionType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { MasterFileAccessDeniedException } from './common/records.exceptions';
import { RESTRICTED_MASTER_FILE_SECTION_TYPES } from './records.constants';

export type MasterFileAccessLevel = 'APPLICANT' | 'OFFICIAL' | 'CUSTODIAN';

export interface MasterFileAccessContext {
  identityId: string;
  identityType: IdentityType;
  officeholderId?: string;
  linkedOfficeIds?: string[];
}

@Injectable()
export class MasterAdministrativeFileAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccessLevel(
    file: MasterAdministrativeFile,
    context: MasterFileAccessContext,
  ): Promise<MasterFileAccessLevel> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: file.caseId },
      select: { applicantIdentityId: true },
    });

    if (!caseRecord) {
      throw new MasterFileAccessDeniedException();
    }

    if (caseRecord.applicantIdentityId === context.identityId) {
      return 'APPLICANT';
    }

    if (context.identityType === IdentityType.SERVICE) {
      throw new MasterFileAccessDeniedException(
        'Service identities cannot access Master Administrative Files',
      );
    }

    const linkedOfficeIds = context.linkedOfficeIds ?? [];
    if (linkedOfficeIds.includes(file.recordsCustodianOfficeId)) {
      return 'CUSTODIAN';
    }

    if (context.officeholderId) {
      return 'OFFICIAL';
    }

    throw new MasterFileAccessDeniedException();
  }

  filterSectionTypes(
    accessLevel: MasterFileAccessLevel,
    sectionTypes: MasterAdministrativeFileSectionType[],
  ): MasterAdministrativeFileSectionType[] {
    if (accessLevel === 'CUSTODIAN') {
      return sectionTypes;
    }

    const restricted = new Set<string>(RESTRICTED_MASTER_FILE_SECTION_TYPES);

    return sectionTypes.filter((sectionType) => {
      if (accessLevel === 'APPLICANT') {
        return !restricted.has(sectionType);
      }

      if (sectionType === 'RECOMMENDATION_AND_DECISION' || sectionType === 'ISSUANCE') {
        return false;
      }

      return true;
    });
  }

  filterCommunications<
    T extends {
      classification?: CaseRecordClassification | null;
      publicVisibility?: CaseEventPublicVisibility;
    },
  >(accessLevel: MasterFileAccessLevel, communications: T[]): T[] {
    if (accessLevel === 'CUSTODIAN') {
      return communications;
    }

    return communications.filter((communication) => {
      if (communication.classification === CaseRecordClassification.PRIVILEGED) {
        return false;
      }

      if (accessLevel === 'APPLICANT') {
        return (
          communication.publicVisibility === CaseEventPublicVisibility.APPLICANT_VISIBLE ||
          communication.classification === CaseRecordClassification.PUBLIC ||
          communication.classification === CaseRecordClassification.OFFICIAL
        );
      }

      return true;
    });
  }

  sanitizeFileView<T extends MasterAdministrativeFile>(
    accessLevel: MasterFileAccessLevel,
    file: T,
  ): T {
    if (accessLevel === 'CUSTODIAN') {
      return file;
    }

    if (accessLevel === 'APPLICANT') {
      return {
        ...file,
        archiveLocationReference: null,
        retentionCategoryCode: null,
      };
    }

    return file;
  }
}

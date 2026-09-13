import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type SignableInstrumentBinding, SignableInstrumentSigningState } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateSignableInstrumentBindingInput {
  documentRecordId: string;
  documentVersionId: string;
  instrumentType: string;
  functionAuthorityRecordId?: string;
  decisionReference?: string;
}

@Injectable()
export class SignableInstrumentBindingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBinding(
    input: CreateSignableInstrumentBindingInput,
  ): Promise<SignableInstrumentBinding> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: input.documentVersionId },
    });
    if (version?.documentRecordId !== input.documentRecordId) {
      throw new NotFoundException('Document version not found for record');
    }

    return this.prisma.signableInstrumentBinding.create({
      data: {
        documentRecordId: input.documentRecordId,
        documentVersionId: input.documentVersionId,
        instrumentType: input.instrumentType,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        decisionReference: input.decisionReference,
        signingState: SignableInstrumentSigningState.SIGNING_AUTHORIZED,
      },
    });
  }

  async assertSigningPermitted(documentVersionId: string, instrumentType: string) {
    const binding = await this.prisma.signableInstrumentBinding.findUnique({
      where: {
        documentVersionId_instrumentType: {
          documentVersionId,
          instrumentType,
        },
      },
    });

    if (!binding) {
      throw new NotFoundException('No signable instrument binding for document version');
    }

    const permittedStates: SignableInstrumentSigningState[] = [
      SignableInstrumentSigningState.PENDING_SIGNATURE,
      SignableInstrumentSigningState.SIGNING_AUTHORIZED,
    ];

    if (!permittedStates.includes(binding.signingState)) {
      throw new BadRequestException('Decision state does not permit signing');
    }

    return binding;
  }

  async markSigned(documentVersionId: string, instrumentType: string) {
    return this.prisma.signableInstrumentBinding.update({
      where: {
        documentVersionId_instrumentType: {
          documentVersionId,
          instrumentType,
        },
      },
      data: { signingState: SignableInstrumentSigningState.SIGNED },
    });
  }

  async markSealed(documentVersionId: string, instrumentType: string) {
    return this.prisma.signableInstrumentBinding.update({
      where: {
        documentVersionId_instrumentType: {
          documentVersionId,
          instrumentType,
        },
      },
      data: { signingState: SignableInstrumentSigningState.SEALED },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { CredentialStatus, CredentialType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { verifySecret } from '../../common/crypto.util';
import {
  type CredentialVerificationContext,
  type CredentialVerifier,
} from '../interfaces/credential-verifier.interface';

@Injectable()
export class PasswordCredentialVerifier implements CredentialVerifier {
  readonly method = 'password';

  constructor(private readonly prisma: PrismaService) {}

  async verify(context: CredentialVerificationContext): Promise<boolean> {
    const passwordCredential = await this.prisma.credential.findFirst({
      where: {
        identityId: context.identityId,
        type: CredentialType.PASSWORD,
        status: CredentialStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!passwordCredential?.secretHash) {
      return false;
    }

    const valid = await verifySecret(context.credential, passwordCredential.secretHash);

    if (valid) {
      await this.prisma.credential.update({
        where: { id: passwordCredential.id },
        data: { lastUsedAt: new Date() },
      });
    }

    return valid;
  }
}

export const CREDENTIAL_VERIFIER = Symbol('CREDENTIAL_VERIFIER');

export interface CredentialVerificationContext {
  identityId: string;
  userAccountId: string;
  credential: string;
}

export interface CredentialVerifier {
  readonly method: string;
  verify(context: CredentialVerificationContext): Promise<boolean>;
}

import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { DeterministicTestDigitalSignatureProvider } from './signature-seal/adapters/deterministic-test-digital-signature-provider.adapter';
import { ElectronicSealController } from './signature-seal/electronic-seal.controller';
import { ElectronicSealService } from './signature-seal/electronic-seal.service';
import { ElectronicSignatureController } from './signature-seal/electronic-signature.controller';
import { ElectronicSignatureAuthorizationService } from './signature-seal/electronic-signature-authorization.service';
import { ElectronicSignatureCredentialService } from './signature-seal/electronic-signature-credential.service';
import { ElectronicSignatureValidationService } from './signature-seal/electronic-signature-validation.service';
import { ElectronicSigningService } from './signature-seal/electronic-signing.service';
import { DIGITAL_SIGNATURE_PROVIDER_PORT } from './signature-seal/ports/digital-signature-provider.port';
import { SignableInstrumentBindingService } from './signature-seal/signable-instrument-binding.service';

@Module({
  imports: [AuthorityModule, SessionsModule],
  controllers: [ElectronicSignatureController, ElectronicSealController],
  providers: [
    SessionAuthGuard,
    ElectronicSignatureCredentialService,
    ElectronicSignatureAuthorizationService,
    ElectronicSigningService,
    ElectronicSignatureValidationService,
    ElectronicSealService,
    SignableInstrumentBindingService,
    DeterministicTestDigitalSignatureProvider,
    {
      provide: DIGITAL_SIGNATURE_PROVIDER_PORT,
      useExisting: DeterministicTestDigitalSignatureProvider,
    },
  ],
  exports: [
    ElectronicSignatureCredentialService,
    ElectronicSignatureAuthorizationService,
    ElectronicSigningService,
    ElectronicSignatureValidationService,
    ElectronicSealService,
    SignableInstrumentBindingService,
    DeterministicTestDigitalSignatureProvider,
    DIGITAL_SIGNATURE_PROVIDER_PORT,
import { CasesModule } from '../application-processing/cases/cases.module';
import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { InstrumentCatalogService } from './catalog/instrument-catalog.service';
import { InstrumentNumberingService } from './catalog/instrument-numbering.service';
import { IssuanceController } from './controllers/issuance.controller';
import { IssuanceService } from './issuance/issuance.service';
import { IssuanceReadinessService } from './issuance/issuance-readiness.service';

@Module({
  imports: [SessionsModule, AuthorityModule, CasesModule],
  controllers: [IssuanceController],
  providers: [
    SessionAuthGuard,
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
  ],
  exports: [
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
  ],
})
export class DecisionsIssuanceModule {}

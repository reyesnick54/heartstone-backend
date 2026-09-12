import { forwardRef, Module } from '@nestjs/common';

import { SessionsModule } from '../../identity/sessions/sessions.module';
import { FormsModule } from '../../service-catalog/forms/forms.module';
import { CasesModule } from '../cases/cases.module';
import { ApplicationProcessingCommonModule } from '../common/application-processing-common.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [
    ApplicationProcessingCommonModule,
    FormsModule,
    SessionsModule,
    forwardRef(() => CasesModule),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

import { Module } from '@nestjs/common';

import { FormConditionalLogicService } from './form-conditional-logic.service';
import { FormDefinitionsService } from './form-definitions.service';
import { FormRenderService } from './form-render.service';
import { FormResponseValidationService } from './form-response-validation.service';
import { FormVersionsService } from './form-versions.service';
import { FormsController } from './forms.controller';

@Module({
  controllers: [FormsController],
  providers: [
    FormDefinitionsService,
    FormVersionsService,
    FormRenderService,
    FormResponseValidationService,
    FormConditionalLogicService,
  ],
  exports: [
    FormDefinitionsService,
    FormVersionsService,
    FormRenderService,
    FormResponseValidationService,
    FormConditionalLogicService,
  ],
})
export class FormsModule {}

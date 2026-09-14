import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { IntelligenceController } from './intelligence.controller';
import { SimulationService } from './simulation/simulation.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceBoundaryService,
    DigitalTwinService,
    SimulationService,
    ConsequentialUseService,
  ],
  exports: [
    IntelligenceBoundaryService,
    DigitalTwinService,
    SimulationService,
    ConsequentialUseService,
  ],
})
export class IntelligenceModule {}

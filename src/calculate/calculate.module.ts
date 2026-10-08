import { Module } from '@nestjs/common';
import { CalculateService } from './calculate.service.js';
import { CalculateController } from './calculate.controller.js';

@Module({
  controllers: [CalculateController],
  providers: [CalculateService],
})
export class CalculateModule {}

import { Controller } from '@nestjs/common';
import { CalculateService } from './calculate.service.js';

@Controller('calculate')
export class CalculateController {
  constructor(private readonly calculateService: CalculateService) {}
}

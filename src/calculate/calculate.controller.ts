import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { CalculateService } from './calculate.service.js';
import { CalculateTax } from "./dto/calculate.dto.js";

@Controller('tax')
export class CalculateController {
  constructor(private readonly calculateService: CalculateService) {}

  @Get()
  CalculateTax(@Query(new ValidationPipe({ transform: true })) query: CalculateTax){
    return this.calculateService.CalculateSalesTax(query) //ini itu ngambil dari *.service.ts. Mulai dari class baru functionnya.
  }
}

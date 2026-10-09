import { Injectable } from '@nestjs/common';
import { CalculateTax } from './dto/calculate.dto.js';

@Injectable()
export class CalculateService {
    CalculateSalesTax(dto: CalculateTax){
        let tax = dto.amount * (dto.rate / 100)
        return{
            "success": true,
            "message": "Tax calculated",
            "data": {
                "amount": dto.amount,
                "rate": dto.rate,
                "inclusive": dto.inclusive,
                "tax": tax,
                "net": dto.inclusive ? dto.amount - tax : dto.amount,
                "gross": dto.inclusive ? dto.amount : dto.amount + tax
            }
        }
    }
}

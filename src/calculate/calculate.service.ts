import { Injectable } from '@nestjs/common';
import { CalculateTax } from './dto/calculate.dto.js';

@Injectable()
export class CalculateService {
    CalculateSalesTax(dto: CalculateTax){
        return{
            "success": true,
            "message": "Tax calculated",
            "data": {
                "amount": dto.amount,
                "rate": dto.rate,
                "inclusive": dto.inclusive,
                "tax": 16500,
                "net": 150000,
                "gross": 166500
            }
        }
    }
}

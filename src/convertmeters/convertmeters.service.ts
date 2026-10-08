import { Injectable } from '@nestjs/common';
import { ConvertMetersDto } from "./dto/convertmeters.dto.js";
@Injectable()
export class ConvertmetersService {
    convertMetersTo(dto: ConvertMetersDto){
        return{
            "success": true,
            "message": "Length converted",
            "data": {
                "meters": dto.meters,
                "kilometers": dto.meters / 1000,
                "centimeters": dto.meters * 100,
                "miles": (dto.meters / 1609.344).toFixed(3),
        }
    }
}
}

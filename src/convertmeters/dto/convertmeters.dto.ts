import {IsNumber, IsNotEmpty, Min, Max} from "class-validator"
import { Type } from "class-transformer";
export class ConvertMetersDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(1000000)
    meters:number

}
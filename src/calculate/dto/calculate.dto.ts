import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";

export class CalculateTax {
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount:number

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    rate:number

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' ? true : false)
    inclusive?:boolean=false
}
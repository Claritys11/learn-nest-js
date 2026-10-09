import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";

export class CalculateTax {
    @Type(() => Number) 
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount:number

    @Type(() => Number) 
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    rate:number

    @IsOptional()
    // @Transform(({ value }) => value === 'true' ? true : false)
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    inclusive?:boolean=false
}
import { Controller, Get, Param } from '@nestjs/common';
import { ConvertmetersService } from './convertmeters.service.js';
import { ConvertMetersDto } from "./dto/convertmeters.dto.js";

@Controller('convert')
export class ConvertmetersController {
  constructor(private readonly convertmetersService: ConvertmetersService) {}
  
  @Get('length/:meters')
  ConvertmetersController(@Param() dto: ConvertMetersDto){
    return this.convertmetersService.convertMetersTo(dto)
  }
}

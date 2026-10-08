import { Module } from '@nestjs/common';
import { ConvertmetersService } from './convertmeters.service.js';
import { ConvertmetersController } from './convertmeters.controller.js';

@Module({
  controllers: [ConvertmetersController],
  providers: [ConvertmetersService],
})
export class ConvertmetersModule {}

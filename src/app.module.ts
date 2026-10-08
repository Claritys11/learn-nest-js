import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConvertmetersModule } from './convertmeters/convertmeters.module.js';
import { CoffeeOrdersModule } from './coffee-orders/coffee-orders.module.js';
import { CalculateModule } from './calculate/calculate.module.js';

@Module({
  imports: [ConvertmetersModule, CoffeeOrdersModule, CalculateModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

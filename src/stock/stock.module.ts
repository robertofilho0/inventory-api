import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module.js';
import { ProductsModule } from '../products/products.module.js';
import { StockController } from './stock.controller.js';
import { StockService } from './stock.service.js';

@Module({
  imports: [ProductsModule, MessagingModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}

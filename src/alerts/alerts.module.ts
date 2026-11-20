import { Module } from '@nestjs/common';
import { AlertsConsumer } from './alerts.consumer.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

@Module({
  controllers: [AlertsController, AlertsConsumer],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

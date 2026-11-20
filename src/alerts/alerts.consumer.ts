import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  type RmqContext,
} from '@nestjs/microservices';
import { STOCK_LOW, type StockLowEvent } from '../messaging/events.js';
import { AlertsService } from './alerts.service.js';

/** Consumer RabbitMQ: confirma (ack) só depois de gravar o alerta. */
@Controller()
export class AlertsConsumer {
  private readonly logger = new Logger(AlertsConsumer.name);

  constructor(private readonly alerts: AlertsService) {}

  @EventPattern<string>(STOCK_LOW)
  async onStockLow(
    @Payload() event: StockLowEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      await this.alerts.registerLowStock(event);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Falha ao processar ${STOCK_LOW}: ${(error as Error).message}`,
      );
      channel.nack(message, false, false); // descarta (ou envia para a DLQ, se configurada)
    }
  }
}

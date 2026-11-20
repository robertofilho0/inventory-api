import { Logger } from '@nestjs/common';
import type { AlertsService } from '../alerts/alerts.service.js';
import { EventPublisher } from './event-publisher.js';
import { STOCK_LOW, type StockLowEvent } from './events.js';

/** Usado quando RABBITMQ_URL não está definido: entrega o evento direto ao handler. */
export class InMemoryPublisher extends EventPublisher {
  private readonly logger = new Logger(InMemoryPublisher.name);

  constructor(private readonly alerts: AlertsService) {
    super();
  }

  async publish(pattern: string, payload: object): Promise<void> {
    if (pattern === STOCK_LOW)
      await this.alerts.registerLowStock(payload as StockLowEvent);
    else this.logger.warn(`Evento sem handler em memória: ${pattern}`);
  }
}

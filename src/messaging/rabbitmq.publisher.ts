import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { EventPublisher } from './event-publisher.js';

export class RabbitMqPublisher
  extends EventPublisher
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitMqPublisher.name);

  constructor(private readonly client: ClientProxy) {
    super();
  }

  async publish(pattern: string, payload: object): Promise<void> {
    try {
      await lastValueFrom(this.client.emit(pattern, payload));
    } catch (error) {
      // A movimentação já foi gravada: uma falha no broker não deve desfazê-la
      this.logger.error(
        `Falha ao publicar "${pattern}": ${(error as Error).message}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}

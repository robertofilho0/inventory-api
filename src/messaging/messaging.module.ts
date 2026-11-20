import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { AlertsModule } from '../alerts/alerts.module.js';
import { AlertsService } from '../alerts/alerts.service.js';
import type { Env } from '../config/env.js';
import { EventPublisher } from './event-publisher.js';
import { InMemoryPublisher } from './in-memory.publisher.js';
import { RabbitMqPublisher } from './rabbitmq.publisher.js';
import { rmqClientOptions } from './rmq-options.js';

@Module({
  imports: [AlertsModule],
  providers: [
    {
      provide: EventPublisher,
      inject: [ConfigService, AlertsService],
      useFactory: (config: ConfigService<Env, true>, alerts: AlertsService) => {
        const url = config.get('RABBITMQ_URL', { infer: true });
        if (!url) return new InMemoryPublisher(alerts);
        const queue = config.get('RABBITMQ_QUEUE', { infer: true });
        return new RabbitMqPublisher(
          ClientProxyFactory.create(rmqClientOptions(url, queue)),
        );
      },
    },
  ],
  exports: [EventPublisher],
})
export class MessagingModule {}

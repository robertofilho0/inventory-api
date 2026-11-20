import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { rmqOptions } from './rmq-options.js';

/** Conecta o consumer RabbitMQ à aplicação HTTP (app híbrida), se configurado. */
export async function connectBroker(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService<Env, true>);
  const url = config.get('RABBITMQ_URL', { infer: true });
  if (!url) {
    Logger.warn(
      'RABBITMQ_URL não definido: eventos processados em memória',
      'Messaging',
    );
    return;
  }
  app.connectMicroservice(
    rmqOptions(url, config.get('RABBITMQ_QUEUE', { infer: true })),
  );
  await app.startAllMicroservices();
  Logger.log('Consumer RabbitMQ conectado', 'Messaging');
}

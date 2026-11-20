import { Transport, type RmqOptions } from '@nestjs/microservices';

const base = (url: string, queue: string) => ({
  urls: [url],
  queue,
  queueOptions: { durable: true },
});

/** Publisher (ClientProxy): mensagens persistentes. */
export const rmqClientOptions = (url: string, queue: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: { ...base(url, queue), persistent: true },
});

/** Consumer (microservice): ack manual e no máximo 10 mensagens em processamento. */
export const rmqConsumerOptions = (url: string, queue: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: { ...base(url, queue), noAck: false, prefetchCount: 10 },
});

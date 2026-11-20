import { Transport, type RmqOptions } from '@nestjs/microservices';

/** Opções compartilhadas entre o publisher (client) e o consumer (microservice). */
export const rmqOptions = (url: string, queue: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [url],
    queue,
    queueOptions: { durable: true },
    persistent: true,
    noAck: false,
    prefetchCount: 10,
  },
});

/** Porta de saída para eventos de domínio (RabbitMQ em produção, memória nos testes locais). */
export abstract class EventPublisher {
  abstract publish(pattern: string, payload: object): Promise<void>;
}

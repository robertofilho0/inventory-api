import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate } from '../common/schemas.js';
import { EventPublisher } from '../messaging/event-publisher.js';
import { STOCK_LOW, type StockLowEvent } from '../messaging/events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from '../products/products.service.js';
import type { MovementInput, MovementsQuery } from './stock.schemas.js';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Registra entrada, saída ou ajuste de forma atômica.
   * A linha do produto é travada (SELECT ... FOR UPDATE) durante a transação,
   * então saídas simultâneas nunca deixam o saldo negativo.
   */
  async move(productId: string, { type, quantity, reason }: MovementInput) {
    const { movement, product } = await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ quantity: number }[]>`
        SELECT quantity FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
      if (!locked) throw new NotFoundException('Produto não encontrado');

      const previous = locked.quantity;
      const next =
        type === 'IN'
          ? previous + quantity
          : type === 'OUT'
            ? previous - quantity
            : quantity;
      if (next < 0) {
        throw new ConflictException(
          `Estoque insuficiente: disponível ${previous}, solicitado ${quantity}`,
        );
      }

      const product = await tx.product.update({
        where: { id: productId },
        data: { quantity: next },
      });
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          previousQuantity: previous,
          newQuantity: next,
          reason,
        },
      });
      return { movement, product };
    });

    // Publica o evento só quando o produto cruza o estoque mínimo, para não gerar alertas repetidos
    const crossed =
      movement.previousQuantity > product.minStock &&
      movement.newQuantity <= product.minStock;
    if (crossed && product.active) {
      const event: StockLowEvent = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: product.quantity,
        minStock: product.minStock,
        occurredAt: new Date().toISOString(),
      };
      await this.events.publish(STOCK_LOW, event);
    }

    return { product: await this.products.findOne(productId), movement };
  }

  async history(productId: string, { page, limit }: MovementsQuery) {
    await this.products.findOne(productId);
    const where = { productId };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginate(data, total, page, limit);
  }
}

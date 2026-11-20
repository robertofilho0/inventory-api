import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { paginate } from '../common/schemas.js';
import type { StockLowEvent } from '../messaging/events.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Handler do evento `stock.low`: registra o alerta de reposição. */
  async registerLowStock(event: StockLowEvent) {
    const exists = await this.prisma.product.findUnique({
      where: { id: event.productId },
      select: { id: true },
    });
    if (!exists) return null; // produto removido antes do processamento

    const alert = await this.prisma.stockAlert.create({
      data: {
        productId: event.productId,
        quantity: event.quantity,
        minStock: event.minStock,
      },
    });
    this.logger.warn(
      `Estoque baixo: ${event.sku} (${event.quantity}/${event.minStock})`,
    );
    return alert;
  }

  async list({
    pending,
    page,
    limit,
  }: {
    pending?: boolean;
    page: number;
    limit: number;
  }) {
    const where =
      pending === undefined
        ? {}
        : { acknowledgedAt: pending ? null : { not: null } };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.stockAlert.count({ where }),
      this.prisma.stockAlert.findMany({
        where,
        include: {
          product: { select: { sku: true, name: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginate(data, total, page, limit);
  }

  async acknowledge(id: string) {
    const alert = await this.prisma.stockAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta não encontrado');
    return this.prisma.stockAlert.update({
      where: { id },
      data: { acknowledgedAt: alert.acknowledgedAt ?? new Date() },
    });
  }
}

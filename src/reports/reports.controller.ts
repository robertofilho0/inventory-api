import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { fromCents } from '../common/schemas.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toProductResponse } from '../products/product.mapper.js';

interface SummaryRow {
  products: number;
  units: number;
  value_cents: bigint;
  low_stock: number;
  out_of_stock: number;
}

interface CategoryRow {
  category: string;
  products: number;
  units: number;
  value_cents: bigint;
}

@ApiTags('Relatórios')
@Controller('reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Valor total do estoque, unidades, alertas e totais por categoria (produtos ativos). */
  @Get('summary')
  async summary() {
    const [totals] = await this.prisma.$queryRaw<SummaryRow[]>`
      SELECT COUNT(*)::int                                          AS products,
             COALESCE(SUM(quantity), 0)::int                        AS units,
             COALESCE(SUM(price_cents::bigint * quantity), 0)::bigint AS value_cents,
             COUNT(*) FILTER (WHERE quantity <= min_stock)::int     AS low_stock,
             COUNT(*) FILTER (WHERE quantity = 0)::int              AS out_of_stock
      FROM products WHERE active`;

    const byCategory = await this.prisma.$queryRaw<CategoryRow[]>`
      SELECT c.name AS category, COUNT(p.id)::int AS products,
             SUM(p.quantity)::int AS units, SUM(p.price_cents::bigint * p.quantity)::bigint AS value_cents
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.active
      GROUP BY c.name
      ORDER BY value_cents DESC, c.name`;

    return {
      products: totals.products,
      units: totals.units,
      inventoryValue: fromCents(Number(totals.value_cents)),
      lowStock: totals.low_stock,
      outOfStock: totals.out_of_stock,
      byCategory: byCategory.map((r) => ({
        category: r.category,
        products: r.products,
        units: r.units,
        inventoryValue: fromCents(Number(r.value_cents)),
      })),
    };
  }

  @Get('low-stock')
  async lowStock() {
    const products = await this.prisma.product.findMany({
      where: {
        active: true,
        quantity: { lte: this.prisma.product.fields.minStock },
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { quantity: 'asc' },
    });
    return products.map(toProductResponse);
  }
}

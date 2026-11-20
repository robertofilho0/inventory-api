import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate, toCents } from '../common/schemas.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toProductResponse } from './product.mapper.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from './products.schemas.js';

const withCategory = {
  category: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCategory(categoryId?: string) {
    if (
      categoryId &&
      !(await this.prisma.category.findUnique({ where: { id: categoryId } }))
    ) {
      throw new BadRequestException('Categoria informada não existe');
    }
  }

  private async ensureSkuAvailable(sku?: string, ignoreId?: string) {
    if (!sku) return;
    const other = await this.prisma.product.findUnique({ where: { sku } });
    if (other && other.id !== ignoreId)
      throw new ConflictException('Já existe um produto com este SKU');
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: withCategory,
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return toProductResponse(product);
  }

  async list(q: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {};
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.active !== undefined) where.active = q.active;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { sku: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.priceCents = {
        ...(q.minPrice !== undefined && { gte: toCents(q.minPrice) }),
        ...(q.maxPrice !== undefined && { lte: toCents(q.maxPrice) }),
      };
    }
    if (q.lowStock !== undefined) {
      // Comparação entre colunas (quantity <= min_stock)
      const field = this.prisma.product.fields.minStock;
      where.quantity = q.lowStock ? { lte: field } : { gt: field };
    }

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: withCategory,
        orderBy: [{ [q.sortBy]: q.order }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);
    return paginate(products.map(toProductResponse), total, q.page, q.limit);
  }

  async create({ price, quantity = 0, ...data }: CreateProductInput) {
    await this.ensureCategory(data.categoryId);
    await this.ensureSkuAvailable(data.sku);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...data, priceCents: toCents(price), quantity },
      });
      if (quantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: 'IN',
            quantity,
            previousQuantity: 0,
            newQuantity: quantity,
            reason: 'Estoque inicial',
          },
        });
      }
      return created;
    });
    return this.findOne(product.id);
  }

  async update(id: string, { price, ...data }: UpdateProductInput) {
    await this.findOne(id);
    await this.ensureCategory(data.categoryId);
    await this.ensureSkuAvailable(data.sku, id);
    await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(price !== undefined && { priceCents: toCents(price) }),
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }
}

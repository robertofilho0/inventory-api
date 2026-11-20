import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories.schemas.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return categories.map(({ _count, ...c }) => ({
      ...c,
      productCount: _count.products,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async create(data: CreateCategoryInput) {
    if (await this.prisma.category.findUnique({ where: { name: data.name } })) {
      throw new ConflictException('Já existe uma categoria com este nome');
    }
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: UpdateCategoryInput) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    if (await this.prisma.product.count({ where: { categoryId: id } })) {
      throw new ConflictException(
        'Não é possível remover uma categoria que possui produtos',
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }
}

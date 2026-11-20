import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '../common/schemas.js';
import {
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
  type CreateProductInput,
  type ListProductsQuery,
  type UpdateProductInput,
} from './products.schemas.js';
import { ProductsService } from './products.service.js';

@ApiTags('Produtos')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query({ schema: listProductsSchema }) query: ListProductsQuery) {
    return this.products.list(query);
  }

  @Get(':id')
  findOne(@Param('id', { schema: uuidSchema }) id: string) {
    return this.products.findOne(id);
  }

  @Post()
  create(@Body({ schema: createProductSchema }) body: CreateProductInput) {
    return this.products.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: updateProductSchema }) body: UpdateProductInput,
  ) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: uuidSchema }) id: string) {
    return this.products.remove(id);
  }
}

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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '../common/schemas.js';
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './categories.schemas.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('Categorias')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Get(':id')
  findOne(@Param('id', { schema: uuidSchema }) id: string) {
    return this.categories.findOne(id);
  }

  @Post()
  create(@Body({ schema: createCategorySchema }) body: CreateCategoryInput) {
    return this.categories.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: updateCategorySchema }) body: UpdateCategoryInput,
  ) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: uuidSchema }) id: string) {
    return this.categories.remove(id);
  }
}

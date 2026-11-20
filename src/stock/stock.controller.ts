import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '../common/schemas.js';
import {
  movementSchema,
  movementsQuerySchema,
  type MovementInput,
  type MovementsQuery,
} from './stock.schemas.js';
import { StockService } from './stock.service.js';

@ApiTags('Estoque')
@Controller('products/:id/movements')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  history(
    @Param('id', { schema: uuidSchema }) id: string,
    @Query({ schema: movementsQuerySchema }) query: MovementsQuery,
  ) {
    return this.stock.history(id, query);
  }

  @Post()
  move(
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: movementSchema }) body: MovementInput,
  ) {
    return this.stock.move(id, body);
  }
}

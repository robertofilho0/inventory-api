import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { pagination, uuidSchema } from '../common/schemas.js';
import { AlertsService } from './alerts.service.js';

const listSchema = z.object({
  pending: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  ...pagination,
});

@ApiTags('Alertas')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Query({ schema: listSchema }) query: z.infer<typeof listSchema>) {
    return this.alerts.list(query);
  }

  @Patch(':id/ack')
  acknowledge(@Param('id', { schema: uuidSchema }) id: string) {
    return this.alerts.acknowledge(id);
  }
}

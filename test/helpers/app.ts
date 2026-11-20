import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { connectBroker } from '../../src/messaging/broker.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { setupApp } from '../../src/setup-app.js';

export async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication = setupApp(moduleRef.createNestApplication());
  await connectBroker(app);
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

/** Limpa todas as tabelas entre os testes. */
export async function resetDb(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "stock_alerts", "stock_movements", "products", "categories" CASCADE',
  );
}

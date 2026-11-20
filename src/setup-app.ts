import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { validationPipe } from './common/validation.js';
import type { Env } from './config/env.js';

/** Configuração compartilhada entre o main.ts e os testes e2e. */
export function setupApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService<Env, true>);
  const origin = config.get('CORS_ORIGIN', { infer: true });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: origin === '*' ? '*' : origin.split(',') });
  app.useGlobalPipes(validationPipe());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Inventory API')
      .setDescription(
        'Controle de estoque com movimentações atômicas, histórico, relatórios e alertas de estoque baixo via RabbitMQ.',
      )
      .setVersion('3.0.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  return app;
}

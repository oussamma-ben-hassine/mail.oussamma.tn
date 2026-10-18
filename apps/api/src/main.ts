import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité des entêtes HTTP avec Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Configuré via le reverse proxy / frontend
    })
  );

  // Configuration CORS stricte pour l'écosystème oussamma.tn
  app.enableCors({
    origin: [
      'https://mail.oussamma.tn',
      'https://oussamma.tn',
      'https://messenger.oussamma.tn',
      'https://drive.oussamma.tn',
      'https://cv.oussamma.tn',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key'],
  });

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Documentation interactive Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Mail.oussamma.tn — API de Messagerie & Mailing Transactionnel')
    .setDescription(
      'Spécification OpenAPI versionnée v1 pour l’accès Webmail et le service de mailing transactionnel machine-to-machine de l’écosystème oussamma.tn.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Jeton utilisateur SSO OIDC émis par sso-a.oussamma.tn',
      },
      'BearerAuth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'Clé secrète applicative machine-to-machine (ex: mk_live_...)',
      },
      'ApiKeyAuth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT_API || process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Mail API] Démarrée sur le port ${port}. Documentation OpenAPI: http://localhost:${port}/api/docs`);
}

bootstrap();

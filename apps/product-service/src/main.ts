import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '').split(',');
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : '*',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Product Service API')
    .setDescription('Product and Menu Management Service for Restaurant POS System')
    .setVersion('1.0.0')
    .addTag('Service Info', 'Service information and health check')
    .addTag('Categories', 'Menu category management')
    .addTag('Products', 'Product management')
    .addTag('Modifiers', 'Product modifier management')
    .addTag('Allergens', 'Allergen management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PRODUCT_SERVICE_PORT', 3004);

  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║  🍽️  Product Service is running!                     ║
║                                                       ║
║  📍 URL: http://localhost:${port}                       ║
║  📚 Docs: http://localhost:${port}/api/docs             ║
║  🏥 Health: http://localhost:${port}/health             ║
║                                                       ║
║  Environment: ${configService.get('NODE_ENV', 'development').toUpperCase().padEnd(11)}                       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
}

bootstrap();

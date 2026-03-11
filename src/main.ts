import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Habilitamos las llamadas a nuestra API desde el frontend
  // Tiene que ir al principio para que se aplique a todas las rutas, incluyendo Swagger

  app.enableCors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Our Distance API')
    .setDescription('API para la app de pareja Our Distance')
    .setVersion('1.0')
    .addBearerAuth() // 👈 habilita el botón de autenticación
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // 👈 disponible en /api

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  //Habilitamos las llamadas a nuestra API desde el frontend

  app.enableCors({
    origin: ['http://localhost:4200', 'https://our-distance-app.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
bootstrap();

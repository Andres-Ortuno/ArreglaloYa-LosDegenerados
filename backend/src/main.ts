import { NestFactory } from '@nestjs/core';
import { Post, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { METHODS } from 'http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas empiezan con /api (ej.: /api/health)
  app.setGlobalPrefix('api');

  // Valida los datos que llegan y descarta campos que no existen en el DTO
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Permite que el frontend de Angular (otro puerto) llame a la API
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });

  // Documentación interactiva en http://localhost:3000/api/docs
  // Para el login: 
  //El login mismo da error: si pruebas con los trabajadores de ejemplo, el correo es carlos.demo@arreglaloya.test y la contraseña Demo12345. Eso solo existe si en tu .env tienes SEED_DEMO=true.
  //La contraseña de todas es Demo12345.
  //Administrador: admin@arreglaloya.test.
  //Los demás correos son nombre.apellido@ejemplo.test. Por ejemplo, el cliente laura.vargas@ejemplo.test tiene una solicitud pendiente con 3 postulaciones. El trabajador roberto.medina@ejemplo.test tiene un pedido aprobado con un cambio de monto por responder.
  const config = new DocumentBuilder()
    .setTitle('ArreglaloYa API')
    .setDescription('API de la plataforma ArreglaloYa (V1)')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

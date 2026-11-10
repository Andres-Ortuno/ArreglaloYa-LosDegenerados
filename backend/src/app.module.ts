import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogosModule } from './catalogos/catalogos.module.js';
import { CuentasModule } from './cuentas/cuentas.module.js';
import { SeedModule } from './seed/seed.module.js';
import { TrabajadoresModule } from './trabajadores/trabajadores.module.js';

@Module({
  imports: [
    // Lee el archivo .env (en backend/ o, si no está ahí, en la carpeta principal)
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'arreglaloya'),
        autoLoadEntities: true,
        // true = TypeORM crea/ajusta las tablas solo. Úsalo únicamente en desarrollo.
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    CuentasModule,
    AuthModule,
    CatalogosModule,
    TrabajadoresModule,
    SeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

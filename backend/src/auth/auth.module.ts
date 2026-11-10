import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    CuentasModule,
    // global: true => el JwtAuthGuard funciona en cualquier módulo
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // En producción JWT_SECRET debe ser una clave larga y secreta
        secret: config.get<string>('JWT_SECRET', 'clave-solo-para-desarrollo'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as never },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

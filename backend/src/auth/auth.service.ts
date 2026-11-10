import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { Cuenta } from '../cuentas/cuenta.entity.js';
import { cuentaPublica, CuentasService } from '../cuentas/cuentas.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

const MAX_INTENTOS = 5; // RF-33
const MINUTOS_BLOQUEO = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly cuentas: CuentasService,
    private readonly jwt: JwtService,
  ) {}

  async registrar(dto: RegistroDto) {
    const cuenta = await this.cuentas.crear(dto);
    return this.respuestaConToken(cuenta);
  }

  async iniciarSesion(dto: LoginDto) {
    const cuenta = await this.cuentas.buscarPorCorreo(dto.correo);
    // Mismo mensaje para "no existe" y "contraseña mala": no revela qué correos están registrados
    const errorCredenciales = new UnauthorizedException('Correo o contraseña incorrectos');
    if (!cuenta) throw errorCredenciales;

    if (cuenta.bloqueada) {
      throw new ForbiddenException('Esta cuenta está bloqueada. Contacta al equipo de ArreglaloYa.');
    }
    if (cuenta.bloqueadaHasta && cuenta.bloqueadaHasta > new Date()) {
      throw new HttpException(
        'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
        HttpStatus.LOCKED,
      );
    }

    if (!(await compare(dto.password, cuenta.passwordHash))) {
      cuenta.intentosFallidos += 1;
      if (cuenta.intentosFallidos >= MAX_INTENTOS) {
        cuenta.bloqueadaHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60_000);
        cuenta.intentosFallidos = 0;
      }
      await this.cuentas.guardar(cuenta);
      throw errorCredenciales;
    }

    if (cuenta.intentosFallidos > 0 || cuenta.bloqueadaHasta) {
      cuenta.intentosFallidos = 0;
      cuenta.bloqueadaHasta = null;
      await this.cuentas.guardar(cuenta);
    }
    return this.respuestaConToken(cuenta);
  }

  async miCuenta(id: string) {
    return cuentaPublica(await this.cuentas.obtener(id));
  }

  private async respuestaConToken(cuenta: Cuenta) {
    const accessToken = await this.jwt.signAsync({ sub: cuenta.id, correo: cuenta.correo });
    return { accessToken, cuenta: cuentaPublica(cuenta) };
  }
}

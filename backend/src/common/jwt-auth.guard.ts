import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UsuarioToken } from './usuario-token.js';

/** Protege una ruta: exige el encabezado "Authorization: Bearer <token>". */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      usuario?: UsuarioToken;
    }>();
    const [tipo, token] = request.headers['authorization']?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; correo: string }>(token);
      request.usuario = { id: payload.sub, correo: payload.correo };
    } catch {
      throw new UnauthorizedException('El token es inválido o venció');
    }
    return true;
  }
}

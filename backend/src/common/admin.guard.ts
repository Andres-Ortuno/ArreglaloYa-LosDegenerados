import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UsuarioToken } from './usuario-token.js';

/**
 * Deja pasar solo a los administradores. Se usa DESPUÉS de JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 * Consulta la base de datos en cada petición (no confía solo en el token), así que si a alguien le quitan
 * el permiso, lo pierde de inmediato.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ usuario?: UsuarioToken }>();
    if (!request.usuario) throw new UnauthorizedException('Falta iniciar sesión');
    const filas = await this.dataSource.query('SELECT 1 FROM administrador WHERE cuenta_id = $1', [request.usuario.id]);
    if (filas.length === 0) throw new ForbiddenException('Solo el equipo administrador puede hacer esto');
    return true;
  }
}

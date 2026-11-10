import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UsuarioToken } from './usuario-token.js';

/** Entrega al controlador el usuario autenticado: @UsuarioActual() usuario */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioToken => {
    const request = context.switchToHttp().getRequest<{ usuario: UsuarioToken }>();
    return request.usuario;
  },
);

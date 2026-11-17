import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';

/**
 * Varias reglas del negocio viven en el script SQL (triggers y restricciones). Cuando se violan,
 * PostgreSQL lanza un error y, sin traducirlo, el servidor respondería 500.
 * Esta función lo convierte en una respuesta clara para el usuario.
 */
export function traducirErrorBd(error: unknown): unknown {
  if (error instanceof HttpException) return error;
  const e = error as { code?: string; message?: string };
  switch (e.code) {
    case 'P0001': // RAISE EXCEPTION de un trigger (ej.: límite semanal de solicitudes, RF-06)
      return new BadRequestException(e.message);
    case '23P01': // restricción de exclusión: cruce de horarios del trabajador (RF-14)
      return new ConflictException('El trabajador ya tiene un pedido en ese horario');
    case '23505': // valor repetido
      return new ConflictException('Ese registro ya existe');
    case '23503': // clave foránea: zona, especialidad, etc. inexistente
      return new BadRequestException('Alguno de los datos enviados no existe (zona, especialidad...)');
    case '23514': // CHECK
      return new BadRequestException('Algún dato no cumple las reglas de la base de datos');
    default:
      return error;
  }
}

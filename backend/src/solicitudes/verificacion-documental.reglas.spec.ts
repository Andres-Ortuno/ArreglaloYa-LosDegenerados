import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { exigirTrabajadorActivo } from './solicitudes.reglas.js';
import { SQL_HAY_TRABAJADORES, SQL_POSTULACION_A_ELEGIR, SQL_TRABAJADOR_ACTIVO } from './solicitudes.sql.js';

describe('Control documental antes de postularse', () => {
  it('consulta en PostgreSQL los tres tipos aprobados en cada verificación', () => {
    expect(SQL_TRABAJADOR_ACTIVO).toContain('count(DISTINCT d.tipo)');
    expect(SQL_TRABAJADOR_ACTIVO).toContain("d.estado = 'aprobado'");
    expect(SQL_TRABAJADOR_ACTIVO).toContain('= 3');
    expect(SQL_POSTULACION_A_ELEGIR).toContain("d.estado = 'aprobado'");
    expect(SQL_HAY_TRABAJADORES).toContain("d.estado = 'aprobado'");
  });

  it('deniega una postulación si la consulta de elegibilidad no devuelve trabajador', async () => {
    const consulta = { query: vi.fn().mockResolvedValue([]) };
    await expect(exigirTrabajadorActivo(consulta, 42)).rejects.toBeInstanceOf(ForbiddenException);
    expect(consulta.query).toHaveBeenCalledWith(SQL_TRABAJADOR_ACTIVO, [42]);
  });

  it('permite continuar si la base confirma la elegibilidad', async () => {
    const consulta = { query: vi.fn().mockResolvedValue([{ id: 42, zonaId: 3 }]) };
    await expect(exigirTrabajadorActivo(consulta, 42)).resolves.toEqual({ id: 42, zonaId: 3 });
  });
});

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogosService } from '../catalogos/catalogos.service.js';
import { CuentasService } from '../cuentas/cuentas.service.js';
import { BuscarTrabajadoresDto } from './dto/buscar-trabajadores.dto.js';
import { PerfilTrabajadorDto } from './dto/perfil-trabajador.dto.js';

/**
 * Lo que ven los clientes (RF-07). Sale de la vista "v_trabajador_publico" del script SQL:
 * solo trabajadores Activos, con la calificación promedio calculada. Nunca domicilio ni
 * documentos (RN-11, RNF-03).
 */
const SQL_PUBLICO = `
  SELECT v.cuenta_id                         AS id,
         v.nombre,
         v.zona,
         v.zona_id                           AS "zonaId",
         v.calificacion_promedio             AS "calificacionPromedio",
         v.cantidad_opiniones                AS "cantidadOpiniones",
         t.historial,
         COALESCE((SELECT array_agg(e.nombre ORDER BY e.nombre)
                     FROM trabajador_especialidad te
                     JOIN especialidad e ON e.id = te.especialidad_id
                    WHERE te.trabajador_id = v.cuenta_id), '{}')::text[] AS especialidades
    FROM v_trabajador_publico v
    JOIN trabajador t ON t.cuenta_id = v.cuenta_id`;

const ORDEN_PUBLICO = ' ORDER BY v.calificacion_promedio DESC, v.cantidad_opiniones DESC, v.nombre';

/** Lo que ve el propio trabajador en "Editar perfil" (incluye su estado). */
const SQL_MI_PERFIL = `
  SELECT t.cuenta_id                         AS id,
         c.nombre,
         t.zona_id                           AS "zonaId",
         z.nombre                            AS zona,
         t.estado,
         t.historial,
         t.qr_pago_url                       AS "qrPagoUrl",
         t.anticipo_minimo                   AS "anticipoMinimo",
         t.margen_minutos                    AS "margenMinutos",
         COALESCE((SELECT array_agg(te.especialidad_id ORDER BY te.especialidad_id)
                     FROM trabajador_especialidad te
                    WHERE te.trabajador_id = t.cuenta_id), '{}')::int[]  AS "especialidadIds",
         COALESCE((SELECT array_agg(e.nombre ORDER BY e.nombre)
                     FROM trabajador_especialidad te
                     JOIN especialidad e ON e.id = te.especialidad_id
                    WHERE te.trabajador_id = t.cuenta_id), '{}')::text[] AS especialidades,
         (SELECT COALESCE(round(avg(k.estrellas), 2), 0)
            FROM calificacion k
           WHERE k.destinatario_id = t.cuenta_id AND k.direccion = 'cliente_a_trabajador') AS "calificacionPromedio",
         (SELECT count(*)
            FROM calificacion k
           WHERE k.destinatario_id = t.cuenta_id AND k.direccion = 'cliente_a_trabajador') AS "cantidadOpiniones"
    FROM trabajador t
    JOIN cuenta c ON c.id = t.cuenta_id
    JOIN zona   z ON z.id = t.zona_id
   WHERE t.cuenta_id = $1`;

interface FilaPublica {
  id: number;
  nombre: string;
  zona: string;
  zonaId: number;
  calificacionPromedio: string;
  cantidadOpiniones: string;
  historial: string | null;
  especialidades: string[];
}

interface FilaMiPerfil extends FilaPublica {
  estado: string;
  qrPagoUrl: string | null;
  anticipoMinimo: string | null;
  margenMinutos: number;
  especialidadIds: number[];
}

/** PostgreSQL devuelve numeric y count como texto: aquí se pasan a número. */
function perfilPublico(fila: FilaPublica) {
  return {
    ...fila,
    calificacionPromedio: Number(fila.calificacionPromedio),
    cantidadOpiniones: Number(fila.cantidadOpiniones),
  };
}

@Injectable()
export class TrabajadoresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cuentas: CuentasService,
    private readonly catalogos: CatalogosService,
  ) {}

  /** RF-07: busca trabajadores Activos por zona y especialidad. */
  
async buscar(filtros: BuscarTrabajadoresDto) {
  const condiciones: string[] = [];
  const parametros: (number | string)[] = [];

  if (filtros.zonaId) {
    parametros.push(filtros.zonaId);
    condiciones.push(`v.zona_id = $${parametros.length}`);
  }

  if (filtros.especialidadId) {
    parametros.push(filtros.especialidadId);
    condiciones.push(`
      EXISTS (
        SELECT 1
        FROM trabajador_especialidad x
        WHERE x.trabajador_id = v.cuenta_id
          AND x.especialidad_id = $${parametros.length}
      )
    `);
  }

  if (filtros.calificacionMinima !== undefined) {
    parametros.push(filtros.calificacionMinima);
    condiciones.push(
      `COALESCE(v.calificacion_promedio, 0) >= $${parametros.length}`,
    );
  }

  const where = condiciones.length
    ? ` WHERE ${condiciones.join(' AND ')}`
    : '';

  const ordenamientos = {
    calificacion: 'v.calificacion_promedio DESC, v.cantidad_opiniones DESC',
    opiniones: 'v.cantidad_opiniones DESC, v.calificacion_promedio DESC',
    nombre: 'v.nombre ASC',
  };

  const ordenarPor = filtros.ordenarPor ?? 'calificacion';
  const orden = ordenamientos[ordenarPor];

  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 10;
  const offset = (pagina - 1) * limite;

  const consulta = `
    ${SQL_PUBLICO}
    ${where}
    ORDER BY ${orden}, v.cuenta_id ASC
    LIMIT $${parametros.length + 1}
    OFFSET $${parametros.length + 2}
  `;

  const consultaTotal = `
    SELECT COUNT(*)::int AS total
    FROM v_trabajador_publico v
    JOIN trabajador t ON t.cuenta_id = v.cuenta_id
    ${where}
  `;

  const [trabajadores, resultadoTotal] = await Promise.all([
    this.dataSource.query(consulta, [...parametros, limite, offset]),
    this.dataSource.query(consultaTotal, parametros),
  ]);

  const total = Number(resultadoTotal[0].total);

  return {
   datos: trabajadores.map((fila: FilaPublica) => perfilPublico(fila)),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
}


  async obtenerPublico(id: number) {
    const filas: FilaPublica[] = await this.dataSource.query(
      `${SQL_PUBLICO} WHERE v.cuenta_id = $1`,
      [id],
    );
    if (!filas[0]) throw new NotFoundException('El trabajador no existe o no está activo');
    return perfilPublico(filas[0]);
  }

  /** RF-02: el trabajador crea o actualiza su perfil. */
  async guardarMiPerfil(cuentaId: number, dto: PerfilTrabajadorDto) {
    const cuenta = await this.cuentas.obtener(cuentaId);
    if (!cuenta.esTrabajador) {
      throw new ForbiddenException('Tu cuenta no tiene el rol de trabajador');
    }
    if (!(await this.catalogos.buscarZona(dto.zonaId))) {
      throw new BadRequestException('La zona no existe');
    }
    const existentes: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM especialidad WHERE id = ANY($1::int[])',
      [dto.especialidadIds],
    );
    if (existentes.length !== dto.especialidadIds.length) {
      throw new BadRequestException('Alguna especialidad no existe');
    }

    await this.dataSource.transaction(async (manager) => {
      // Un perfil nuevo queda "En revisión" (valor por defecto de la tabla) hasta que el
      // administrador verifique los documentos (RF-03, RF-04). Si ya existe, no se toca el estado.
      await manager.query(
        `INSERT INTO trabajador (cuenta_id, zona_id, historial, qr_pago_url, anticipo_minimo, margen_minutos)
              VALUES ($1, $2, $3::text, $4::varchar, $5::numeric, COALESCE($6::smallint, 30))
         ON CONFLICT (cuenta_id) DO UPDATE
                SET zona_id         = EXCLUDED.zona_id,
                    historial       = EXCLUDED.historial,
                    qr_pago_url     = EXCLUDED.qr_pago_url,
                    anticipo_minimo = EXCLUDED.anticipo_minimo,
                    margen_minutos  = COALESCE($6::smallint, trabajador.margen_minutos)`,
        [
          cuentaId,
          dto.zonaId,
          dto.historial ?? null,
          dto.qrPagoUrl ?? null,
          dto.anticipoMinimo ?? null,
          dto.margenMinutos ?? null,
        ],
      );
      await manager.query('DELETE FROM trabajador_especialidad WHERE trabajador_id = $1', [cuentaId]);
      await manager.query(
        `INSERT INTO trabajador_especialidad (trabajador_id, especialidad_id)
         SELECT $1, unnest($2::int[])`,
        [cuentaId, dto.especialidadIds],
      );
    });
    return this.miPerfil(cuentaId);
  }

  async miPerfil(cuentaId: number) {
    const filas: FilaMiPerfil[] = await this.dataSource.query(SQL_MI_PERFIL, [cuentaId]);
    const fila = filas[0];
    if (!fila) throw new NotFoundException('Todavía no creaste tu perfil de trabajador');
    return {
      ...perfilPublico(fila),
      estado: fila.estado,
      qrPagoUrl: fila.qrPagoUrl,
      anticipoMinimo: fila.anticipoMinimo === null ? null : Number(fila.anticipoMinimo),
      margenMinutos: fila.margenMinutos,
      especialidadIds: fila.especialidadIds,
    };
  }
}

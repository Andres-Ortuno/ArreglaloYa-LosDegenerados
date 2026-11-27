import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { PostularseDto } from './dto/postularse.dto.js';
import { exigirTrabajadorActivo, num } from './solicitudes.reglas.js';
import {
  SQL_INSERT_POSTULACION,
  SQL_MIS_POSTULACIONES,
  SQL_NOTIFICAR_POSTULACION,
  SQL_SOLICITUD_PARA_POSTULAR,
  SQL_TIENE_ESPECIALIDAD,
} from './solicitudes.sql.js';

@Injectable()
export class PostulacionesService {
  constructor(private readonly dataSource: DataSource) {}

  /** RF-08, CU-04: un trabajador Activo se postula una sola vez a una solicitud de su zona y especialidad. */
  async postularse(trabajadorId: number, solicitudId: number, dto: PostularseDto) {
    const trabajador = await exigirTrabajadorActivo(this.dataSource, trabajadorId); // flujo 6a

    const [s] = await this.dataSource.query(SQL_SOLICITUD_PARA_POSTULAR, [solicitudId]);
    if (!s) throw new NotFoundException('La solicitud no existe');
    if (s.clienteId === trabajadorId) {
      throw new BadRequestException('No puedes postularte a tu propia solicitud');
    }
    if (s.estado !== 'pendiente' || s.vencida) {
      throw new ConflictException('La solicitud ya no está disponible'); // flujo 10b
    }
    if (s.zonaId !== trabajador.zonaId) {
      throw new BadRequestException('La solicitud no corresponde a tu zona'); // flujo 6b
    }
    const especialidad: unknown[] = await this.dataSource.query(SQL_TIENE_ESPECIALIDAD, [
      trabajadorId,
      s.especialidadId,
    ]);
    if (especialidad.length === 0) {
      throw new BadRequestException('La solicitud no corresponde a tus especialidades'); // flujo 6b
    }

    try {
      const postulacion = await this.dataSource.transaction(async (manager) => {
        // Comprobación definitiva con datos persistidos: evita postularse si perdió requisitos entre lecturas.
        await exigirTrabajadorActivo(manager, trabajadorId);
        const [nueva] = await manager.query(SQL_INSERT_POSTULACION, [
          solicitudId,
          trabajadorId,
          dto.monto,
          dto.tipoTrabajo,
          dto.costoVisita,
          dto.incluyeMateriales,
        ]);
        // RF-17: el cliente debe enterarse de la nueva postulación
        await manager.query(SQL_NOTIFICAR_POSTULACION, [solicitudId, trabajadorId]);
        return nueva;
      });
      return { ...postulacion, solicitudId, ...dto };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        // UNIQUE (solicitud_id, trabajador_id)
        throw new ConflictException('Ya te postulaste a esta solicitud: solo se permite una vez');
      }
      throw traducirErrorBd(error);
    }
  }

  /** Las postulaciones del trabajador y en qué quedaron. */
  async mias(trabajadorId: number) {
    const filas: any[] = await this.dataSource.query(SQL_MIS_POSTULACIONES, [trabajadorId]);
    return filas.map((f) => ({
      ...f,
      monto: num(f.monto),
      costoVisita: num(f.costoVisita),
    }));
  }
}

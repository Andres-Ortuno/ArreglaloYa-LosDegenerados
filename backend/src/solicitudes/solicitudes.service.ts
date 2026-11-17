import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import { ElegirPostulacionDto } from './dto/elegir-postulacion.dto.js';
import { exigirCliente, exigirTrabajadorActivo, num } from './solicitudes.reglas.js';
import {
  SQL_BITACORA_PEDIDO_NUEVO,
  SQL_BLOQUEAR_SOLICITUD,
  SQL_CANCELAR_SOLICITUD,
  SQL_DESCARTAR_POSTULACIONES,
  SQL_DISPONIBLES,
  SQL_HAY_TRABAJADORES,
  SQL_HORARIO_DE_SOLICITUD,
  SQL_INSERT_FOTOS,
  SQL_INSERT_HORARIOS,
  SQL_INSERT_PEDIDO,
  SQL_INSERT_SOLICITUD,
  SQL_MARCAR_POSTULACIONES,
  SQL_MIS_SOLICITUDES,
  SQL_NOTIFICAR_ELECCION,
  SQL_POSTULACION_A_ELEGIR,
  SQL_POSTULACIONES_DE_SOLICITUD,
  SQL_SOLICITUD_ASIGNADA,
  SQL_SOLICITUD_DETALLE,
  SQL_VALIDAR_HORARIOS,
} from './solicitudes.sql.js';

@Injectable()
export class SolicitudesService {
  constructor(private readonly dataSource: DataSource) {}

  /** RF-05, RF-06, RF-16, CU-01: el cliente publica un problema. Queda «pendiente». */
  async crear(clienteId: number, dto: CrearSolicitudDto) {
    await exigirCliente(this.dataSource, clienteId);

    const inicios = dto.horarios.map((h) => h.inicio);
    const fines = dto.horarios.map((h) => h.fin);
    const [revision] = await this.dataSource.query(SQL_VALIDAR_HORARIOS, [inicios, fines]);
    if (Number(revision.invertidos) > 0) {
      throw new BadRequestException('Cada horario debe terminar después de empezar');
    }
    if (Number(revision.pasados) > 0) {
      throw new BadRequestException('Los horarios deben ser futuros');
    }

    try {
      // La solicitud, sus fotos y sus horarios se guardan juntos o no se guarda nada
      const solicitud = await this.dataSource.transaction(async (manager) => {
        const [nueva] = await manager.query(SQL_INSERT_SOLICITUD, [
          clienteId,
          dto.especialidadId,
          dto.zonaId,
          dto.descripcion.trim(),
          dto.ubicacion.trim(),
          dto.latitud ?? null,
          dto.longitud ?? null,
        ]);
        if (dto.fotos?.length) await manager.query(SQL_INSERT_FOTOS, [nueva.id, dto.fotos]);
        await manager.query(SQL_INSERT_HORARIOS, [nueva.id, inicios, fines]);
        return nueva;
      });
      // El trigger del script ya rechazó la solicitud si superaba el límite semanal (RF-06)

      // RF-16 / CU-01 flujo 5a: si no hay trabajadores, se avisa y la solicitud queda en cola
      const [{ hay }] = await this.dataSource.query(SQL_HAY_TRABAJADORES, [
        dto.zonaId,
        dto.especialidadId,
        clienteId,
      ]);
      return {
        ...solicitud,
        avisoSinTrabajadores: !hay,
        mensaje: hay
          ? 'Solicitud creada. Los trabajadores de tu zona ya pueden postularse.'
          : 'Solicitud creada. Por ahora no hay trabajadores activos para esa especialidad y zona; tu solicitud queda en cola por 30 días.',
      };
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }

  async misSolicitudes(clienteId: number) {
    const filas: any[] = await this.dataSource.query(SQL_MIS_SOLICITUDES, [clienteId]);
    return filas.map((f) => ({ ...f, cantidadPostulaciones: num(f.cantidadPostulaciones) }));
  }

  /** El cliente ve su solicitud con las postulaciones recibidas (HU-02, RF-09). */
  async detalle(clienteId: number, id: number) {
    const [solicitud] = await this.dataSource.query(SQL_SOLICITUD_DETALLE, [id]);
    if (!solicitud) throw new NotFoundException('La solicitud no existe');
    if (solicitud.clienteId !== clienteId) {
      throw new ForbiddenException('Esta solicitud no es tuya');
    }
    const postulaciones: any[] = await this.dataSource.query(SQL_POSTULACIONES_DE_SOLICITUD, [id]);
    return {
      ...solicitud,
      latitud: num(solicitud.latitud),
      longitud: num(solicitud.longitud),
      postulaciones: postulaciones.map((p) => ({
        ...p,
        monto: num(p.monto),
        costoVisita: num(p.costoVisita),
        calificacionPromedio: num(p.calificacionPromedio),
        cantidadOpiniones: num(p.cantidadOpiniones),
      })),
    };
  }

  /** CU-04: solicitudes pendientes de la zona y especialidad del trabajador, la más antigua primero. */
  async disponibles(trabajadorId: number) {
    await exigirTrabajadorActivo(this.dataSource, trabajadorId);
    return this.dataSource.query(SQL_DISPONIBLES, [trabajadorId]);
  }

  /** El cliente cancela una solicitud que todavía no tiene trabajador asignado. */
  async cancelar(clienteId: number, id: number) {
    await this.dataSource.transaction(async (manager) => {
      const [s] = await manager.query(SQL_BLOQUEAR_SOLICITUD, [id]);
      if (!s) throw new NotFoundException('La solicitud no existe');
      if (s.clienteId !== clienteId) throw new ForbiddenException('Esta solicitud no es tuya');
      if (s.estado !== 'pendiente') {
        throw new ConflictException(
          'Solo se puede cancelar una solicitud pendiente. Si ya tiene trabajador, cancela el pedido.',
        );
      }
      await manager.query(SQL_CANCELAR_SOLICITUD, [id]);
      await manager.query(SQL_DESCARTAR_POSTULACIONES, [id]);
    });
    return { id, estado: 'cancelada' };
  }

  /**
   * RF-25, CU-01 (pasos 6-9): el cliente elige UNA postulación y confirma un horario.
   * Se crea el pedido en «Bajo revisión», las demás postulaciones se descartan y esos
   * trabajadores quedan notificados. El pago del anticipo (CU-05) es el siguiente paso.
   */
  async elegir(clienteId: number, solicitudId: number, dto: ElegirPostulacionDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // FOR UPDATE: si dos pestañas eligen a la vez, la segunda espera y luego ve que ya no es pendiente
        const [s] = await manager.query(SQL_BLOQUEAR_SOLICITUD, [solicitudId]);
        if (!s) throw new NotFoundException('La solicitud no existe');
        if (s.clienteId !== clienteId) throw new ForbiddenException('Esta solicitud no es tuya');
        if (s.estado !== 'pendiente') {
          throw new ConflictException('La solicitud ya no está pendiente');
        }

        const [p] = await manager.query(SQL_POSTULACION_A_ELEGIR, [dto.postulacionId, solicitudId]);
        if (!p) {
          throw new NotFoundException('La postulación no existe o ya no está disponible');
        }
        if (!p.disponible) {
          throw new ConflictException('Ese trabajador ya no está disponible. Elige otra postulación.');
        }
        const [horario] = await manager.query(SQL_HORARIO_DE_SOLICITUD, [dto.horarioId, solicitudId]);
        if (!horario) {
          throw new BadRequestException('Ese horario no pertenece a la solicitud');
        }

        // Si el horario se cruza con otro pedido del trabajador, la base lanza 23P01 (RF-14)
        const [pedido] = await manager.query(SQL_INSERT_PEDIDO, [
          solicitudId,
          p.id,
          p.trabajadorId,
          p.monto,
          p.margenMinutos,
          dto.horarioId,
        ]);
        await manager.query(SQL_MARCAR_POSTULACIONES, [solicitudId, p.id]);
        await manager.query(SQL_SOLICITUD_ASIGNADA, [solicitudId]);
        await manager.query(SQL_BITACORA_PEDIDO_NUEVO, [pedido.id, clienteId]);
        await manager.query(SQL_NOTIFICAR_ELECCION, [solicitudId, p.id, pedido.id]);

        return {
          pedidoId: pedido.id as number,
          estado: pedido.estado as string,
          trabajadorId: p.trabajadorId as number,
          montoVigente: num(pedido.montoVigente),
          horarioInicio: pedido.horarioInicio,
          horarioFin: pedido.horarioFin,
        };
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }
}

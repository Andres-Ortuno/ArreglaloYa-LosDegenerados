import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { num } from '../solicitudes/solicitudes.reglas.js';
import { CambioMontoDto, MotivoDto, PagarDto, ResponderCambioDto } from './dto/pedidos.dto.js';
import { calcularAnticipo, calcularComision, redondear2, repartirRetenido } from './pedidos.calculos.js';
import { permiteTransicionPedido } from './pedidos.transiciones.js';
import {
  SQL_ACTUALIZAR_MONTO,
  SQL_BLOQUEAR_PEDIDO,
  SQL_CAMBIAR_ESTADO,
  SQL_CAMBIO_A_RESPONDER,
  SQL_CAMBIO_PENDIENTE,
  SQL_CAMBIOS_DE_PEDIDO,
  SQL_CONFIGURACION,
  SQL_FINALIZAR,
  SQL_HISTORIAL_ESTADOS,
  SQL_HAY_ANTICIPO,
  SQL_INSERT_CAMBIO,
  SQL_INSERT_PAGO,
  SQL_LIBERAR_PAGOS,
  SQL_MIS_PEDIDOS,
  SQL_NOTIFICAR,
  SQL_PAGOS_DE_PEDIDO,
  SQL_PAGOS_RETENIDOS,
  SQL_PEDIDO_DETALLE,
  SQL_REPARTIR_PAGO,
  SQL_RESPONDER_CAMBIO,
  SQL_SET_USUARIO,
  SQL_TOTAL_APORTADO,
} from './pedidos.sql.js';

const ETIQUETA: Record<string, string> = {
  pendiente: 'Pendiente',
  bajo_revision: 'Bajo revisión',
  aprobado: 'Aprobado',
  en_proceso: 'En proceso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

/** Pedido leído con FOR UPDATE, con los números ya convertidos. */
interface Pedido {
  id: number;
  estado: string;
  clienteId: number;
  trabajadorId: number;
  montoVigente: number;
  horarioVencido: boolean;
  tipoTrabajo: 'fotos' | 'visita';
  costoVisita: number;
  anticipoMinimo: number | null;
}

type Causa = 'cliente' | 'incumplimiento' | 'rechazo_monto';

@Injectable()
export class PedidosService {
  constructor(private readonly dataSource: DataSource) {}

  // ================================================================ consultas

  /** Mis pedidos, como cliente y como trabajador (RN-01: una cuenta puede ser las dos cosas). */
  async mios(usuarioId: number) {
    const filas = await this.dataSource.query(SQL_MIS_PEDIDOS, [usuarioId]);
    return filas.map((f: Record<string, unknown>) => ({ ...f, montoVigente: num(f.montoVigente as string) }));
  }

  /** RF-09: el detalle lo ven solo el cliente y el trabajador del pedido. */
  async detalle(usuarioId: number, pedidoId: number) {
    const [p] = await this.dataSource.query(SQL_PEDIDO_DETALLE, [pedidoId]);
    if (!p) throw new NotFoundException('El pedido no existe');
    const esCliente = p.clienteId === usuarioId;
    if (!esCliente && p.trabajadorId !== usuarioId) throw new ForbiddenException('Este pedido no es tuyo');

    const [pagos, cambios, historialEstados, [{ aportado }], cfg] = await Promise.all([
      this.dataSource.query(SQL_PAGOS_DE_PEDIDO, [pedidoId]),
      this.dataSource.query(SQL_CAMBIOS_DE_PEDIDO, [pedidoId]),
      this.dataSource.query(SQL_HISTORIAL_ESTADOS, [pedidoId]),
      this.dataSource.query(SQL_TOTAL_APORTADO, [pedidoId]),
      this.configuracion(this.dataSource.manager),
    ]);

    const montoVigente = Number(p.montoVigente);
    const minimo = num(p.anticipoMinimo);
    const activo = ['aprobado', 'en_proceso'].includes(p.estado);
    return {
      id: p.id,
      estado: p.estado,
      miRol: esCliente ? 'cliente' : 'trabajador',
      cliente: p.cliente,
      trabajador: p.trabajador,
      solicitudId: p.solicitudId,
      descripcion: p.descripcion,
      ubicacion: p.ubicacion,
      especialidad: p.especialidad,
      zona: p.zona,
      tipoTrabajo: p.tipoTrabajo,
      costoVisita: Number(p.costoVisita),
      incluyeMateriales: p.incluyeMateriales,
      montoVigente,
      horarioInicio: p.horarioInicio,
      horarioFin: p.horarioFin,
      comisionMonto: Number(p.comisionMonto),
      motivoCancelacion: p.motivoCancelacion,
      // Cuánto debe pagar el cliente como anticipo (solo mientras está «Bajo revisión»)
      anticipoRequerido:
        p.estado === 'bajo_revision'
          ? calcularAnticipo(montoVigente, Number(cfg.anticipo_porcentaje ?? 25), minimo)
          : null,
      // Lo que falta pagar para completar el monto (RF-28)
      saldoPendiente: activo ? Math.max(0, redondear2(montoVigente - Number(aportado))) : 0,
      // El QR del trabajador solo se muestra al cliente, mientras todavía puede pagar (RF-11)
      qrPagoUrl: esCliente && ['bajo_revision', 'aprobado', 'en_proceso'].includes(p.estado) ? p.qrPagoUrl : null,
      pagos: pagos.map((x: Record<string, unknown>) => ({
        ...x,
        monto: Number(x.monto),
        montoLiberado: Number(x.montoLiberado),
        montoReembolsado: Number(x.montoReembolsado),
      })),
      cambiosDeMonto: cambios.map((x: Record<string, unknown>) => ({
        ...x,
        montoAnterior: Number(x.montoAnterior),
        montoNuevo: Number(x.montoNuevo),
      })),
      historialEstados: historialEstados.map((x: Record<string, unknown>) => ({
        ...x,
        responsableId: x.responsableId === null ? null : Number(x.responsableId),
      })),
    };
  }

  // ================================================================ CU-05: pagar el anticipo

  /**
   * RF-11, CU-05: el cliente acepta el monto y paga el anticipo. El pago queda «retenido» y el pedido
   * pasa a «Aprobado». En la V1 el pago es simulado (R-06).
   */
  pagarAnticipo(clienteId: number, pedidoId: number, dto: PagarDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirCliente(p, clienteId);
      this.exigirEstado(p, ['bajo_revision'], 'se paga el anticipo');
      if ((await m.query(SQL_HAY_ANTICIPO, [pedidoId])).length > 0) {
        throw new ConflictException('El anticipo de este pedido ya fue pagado');
      }

      const cfg = await this.configuracion(m);
      const anticipo = calcularAnticipo(p.montoVigente, Number(cfg.anticipo_porcentaje ?? 25), p.anticipoMinimo);
      const [pago] = await m.query(SQL_INSERT_PAGO, [pedidoId, 'anticipo', anticipo, dto.medio, dto.referencia ?? null]);
      this.exigirTransicion(p.estado, 'aprobado');
      await m.query(SQL_CAMBIAR_ESTADO, [pedidoId, 'aprobado', null]);
      await this.avisar(m, p.trabajadorId, pedidoId, `El cliente pagó el anticipo de Bs ${anticipo} del pedido #${pedidoId}. Ya puedes iniciar el trabajo.`);

      return {
        pedidoId,
        estado: 'aprobado',
        pago: { id: pago.id as number, tipo: 'anticipo', monto: anticipo, medio: dto.medio, estado: pago.estado as string },
        saldoPendiente: redondear2(p.montoVigente - anticipo),
      };
    });
  }

  /** RF-28: el cliente paga lo que falta del monto. Queda retenido igual que el anticipo. */
  pagarSaldo(clienteId: number, pedidoId: number, dto: PagarDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirCliente(p, clienteId);
      this.exigirEstado(p, ['aprobado', 'en_proceso'], 'se paga el saldo');
      await this.exigirSinCambioPendiente(m, pedidoId);

      const saldo = await this.saldoPendiente(m, p);
      if (saldo <= 0) throw new ConflictException('No hay saldo pendiente: el monto ya está completo');
      const [pago] = await m.query(SQL_INSERT_PAGO, [pedidoId, 'saldo', saldo, dto.medio, dto.referencia ?? null]);
      await this.avisar(m, p.trabajadorId, pedidoId, `El cliente pagó el saldo de Bs ${saldo} del pedido #${pedidoId}.`);
      return { pedidoId, estado: p.estado, pago: { id: pago.id as number, tipo: 'saldo', monto: saldo, medio: dto.medio }, saldoPendiente: 0 };
    });
  }

  // ================================================================ RF-27: cambio de monto

  /** El trabajador propone otro monto, con razón, mientras el pedido está «Aprobado» (antes de empezar). */
  proponerCambioMonto(trabajadorId: number, pedidoId: number, dto: CambioMontoDto) {
    return this.transaccion(trabajadorId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirTrabajador(p, trabajadorId);
      this.exigirEstado(p, ['aprobado'], 'se puede proponer un nuevo monto');
      await this.exigirSinCambioPendiente(m, pedidoId);
      if (dto.montoNuevo === p.montoVigente) throw new BadRequestException('El nuevo monto es igual al actual');

      const [{ aportado }] = await m.query(SQL_TOTAL_APORTADO, [pedidoId]);
      if (dto.montoNuevo < Number(aportado)) {
        throw new BadRequestException(`El nuevo monto no puede ser menor que lo que el cliente ya pagó (Bs ${Number(aportado)})`);
      }

      const [cambio] = await m.query(SQL_INSERT_CAMBIO, [pedidoId, p.montoVigente, dto.montoNuevo, dto.motivo.trim(), trabajadorId]);
      await this.avisar(m, p.clienteId, pedidoId, `El trabajador propone cambiar el monto del pedido #${pedidoId} de Bs ${p.montoVigente} a Bs ${dto.montoNuevo}. Motivo: ${dto.motivo.trim()}`);
      return { ...cambio, montoAnterior: Number(cambio.montoAnterior), montoNuevo: Number(cambio.montoNuevo) };
    });
  }

  /**
   * El cliente acepta o rechaza el nuevo monto. Si acepta, cambia el monto vigente y puede quedar un saldo
   * por pagar (RF-28). Si rechaza, se cancela el pedido con la regla de visita o de reembolso (RF-29, RF-31).
   */
  responderCambioMonto(clienteId: number, pedidoId: number, cambioId: number, dto: ResponderCambioDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirCliente(p, clienteId);
      this.exigirEstado(p, ['aprobado'], 'se responde un cambio de monto');
      const [cambio] = await m.query(SQL_CAMBIO_A_RESPONDER, [cambioId, pedidoId]);
      if (!cambio) throw new NotFoundException('La propuesta no existe o ya fue respondida');

      if (!dto.aceptar) {
        await m.query(SQL_RESPONDER_CAMBIO, [cambioId, 'rechazado']);
        return this.cancelarPedido(m, p, 'rechazo_monto', 'El cliente rechazó el nuevo monto');
      }

      await m.query(SQL_RESPONDER_CAMBIO, [cambioId, 'aceptado']);
      await m.query(SQL_ACTUALIZAR_MONTO, [pedidoId, cambio.montoNuevo]);
      await this.avisar(m, p.trabajadorId, pedidoId, `El cliente aceptó el nuevo monto de Bs ${Number(cambio.montoNuevo)} del pedido #${pedidoId}.`);
      const nuevo = { ...p, montoVigente: Number(cambio.montoNuevo) };
      return { pedidoId, estado: p.estado, montoVigente: nuevo.montoVigente, saldoPendiente: await this.saldoPendiente(m, nuevo) };
    });
  }

  // ================================================================ CU-07: ejecutar y finalizar

  /** RF-26: el trabajador asignado inicia el trabajo. «Aprobado» -> «En proceso». */
  iniciar(trabajadorId: number, pedidoId: number) {
    return this.transaccion(trabajadorId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirTrabajador(p, trabajadorId);
      this.exigirEstado(p, ['aprobado'], 'se puede iniciar el trabajo');
      await this.exigirSinCambioPendiente(m, pedidoId);
      this.exigirTransicion(p.estado, 'en_proceso');
      await m.query(SQL_CAMBIAR_ESTADO, [pedidoId, 'en_proceso', null]);
      await this.avisar(m, p.clienteId, pedidoId, `El trabajo del pedido #${pedidoId} comenzó.`);
      return { pedidoId, estado: 'en_proceso' };
    });
  }

  /**
   * RF-26, RF-12, RF-30: el trabajador marca el pedido como «Finalizado». El sistema libera todo lo retenido
   * al trabajador y registra la comisión. Antes, el cliente debe haber pagado el saldo, para que el trabajador
   * cobre todo el monto. [CONFIRMAR: quién confirma la finalización]
   */
  finalizar(trabajadorId: number, pedidoId: number) {
    return this.transaccion(trabajadorId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirTrabajador(p, trabajadorId);
      this.exigirEstado(p, ['en_proceso'], 'se puede finalizar');
      const saldo = await this.saldoPendiente(m, p);
      if (saldo > 0) {
        throw new ConflictException(`El cliente aún debe pagar el saldo de Bs ${saldo} para poder finalizar`);
      }

      this.exigirTransicion(p.estado, 'finalizado');
      const cfg = await this.configuracion(m);
      const comision = calcularComision(p.montoVigente, cfg.comision_activa === 'true', Number(cfg.comision_porcentaje ?? 3));
      await m.query(SQL_FINALIZAR, [pedidoId, comision]);
      // En un UPDATE ... RETURNING, TypeORM devuelve [filas, cantidad]
      const [liberados]: [{ montoLiberado: string }[], number] = await m.query(SQL_LIBERAR_PAGOS, [pedidoId]);
      const totalLiberado = redondear2(liberados.reduce((s, x) => s + Number(x.montoLiberado), 0));

      await this.avisar(m, p.clienteId, pedidoId, `El pedido #${pedidoId} fue finalizado. Ya puedes calificar al trabajador.`);
      await this.avisar(m, p.trabajadorId, pedidoId, `Pedido #${pedidoId} finalizado. Se liberaron Bs ${totalLiberado} a tu favor.`);
      return { pedidoId, estado: 'finalizado', liberadoAlTrabajador: totalLiberado, comision };
    });
  }

  // ================================================================ CU-08: cancelar

  /** RF-15, CU-08: el cliente cancela mientras el pedido no esté «En proceso». */
  cancelar(clienteId: number, pedidoId: number, dto: MotivoDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirCliente(p, clienteId);
      this.exigirEstado(p, ['pendiente', 'bajo_revision', 'aprobado'], 'se puede cancelar');
      return this.cancelarPedido(m, p, 'cliente', dto.motivo?.trim() || 'Cancelado por el cliente');
    });
  }

  /**
   * CU-07 flujo 4b: el trabajador no inició el trabajo y ya pasó la hora acordada (más su margen).
   * Se cancela el pedido y se devuelve el anticipo menos el transporte (RN-06). [CONFIRMAR el monto]
   */
  reportarIncumplimiento(clienteId: number, pedidoId: number, dto: MotivoDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.bloquear(m, pedidoId);
      this.exigirCliente(p, clienteId);
      this.exigirEstado(p, ['aprobado'], 'se puede reportar un incumplimiento');
      if (!p.horarioVencido) {
        throw new ConflictException('Todavía no pasó la hora acordada con el trabajador (más su margen)');
      }
      return this.cancelarPedido(m, p, 'incumplimiento', dto.motivo?.trim() || 'El trabajador no se presentó');
    });
  }

  // ================================================================ apoyo

  /**
   * Cancela el pedido y reparte lo retenido (RF-31):
   *  - cliente: se devuelve todo.  [CONFIRMAR qué parte se devuelve si cancela un pedido «Aprobado»]
   *  - incumplimiento: se devuelve menos el transporte (configuracion.descuento_transporte, RN-06).
   *  - rechazo_monto: si era visita, el trabajador recibe el costo de la visita (RN-05, RF-29).
   */
  private async cancelarPedido(m: EntityManager, p: Pedido, causa: Causa, motivo: string) {
    this.exigirTransicion(p.estado, 'cancelado');
    const cfg = await this.configuracion(m);
    const retenidos: { id: number; monto: string }[] = await m.query(SQL_PAGOS_RETENIDOS, [p.id]);
    const pagos = retenidos.map((x) => ({ id: x.id, monto: Number(x.monto) }));
    const totalRetenido = redondear2(pagos.reduce((s, x) => s + x.monto, 0));

    let aLiberar = 0;
    if (causa === 'incumplimiento') aLiberar = Number(cfg.descuento_transporte ?? 0);
    if (causa === 'rechazo_monto' && p.tipoTrabajo === 'visita') {
      aLiberar = redondear2((p.costoVisita * Number(cfg.reparto_visita_trabajador_pct ?? 100)) / 100);
    }
    aLiberar = Math.min(aLiberar, totalRetenido);

    const reparto = repartirRetenido(pagos, aLiberar);
    for (const r of reparto) {
      await m.query(SQL_REPARTIR_PAGO, [r.id, r.montoLiberado, r.montoReembolsado, r.estado]);
    }
    await m.query(SQL_CAMBIAR_ESTADO, [p.id, 'cancelado', motivo]);

    const reembolsado = redondear2(totalRetenido - aLiberar);
    await this.avisar(m, p.trabajadorId, p.id, `El pedido #${p.id} fue cancelado. ${motivo}`);
    await this.avisar(m, p.clienteId, p.id, `El pedido #${p.id} fue cancelado.${totalRetenido > 0 ? ` Se te devuelven Bs ${reembolsado}.` : ''}`);
    return { pedidoId: p.id, estado: 'cancelado', reembolsadoAlCliente: reembolsado, liberadoAlTrabajador: aLiberar };
  }

  /** Lo que falta pagar: monto vigente menos lo que el cliente ya aportó. */
  private async saldoPendiente(m: EntityManager, p: Pick<Pedido, 'id' | 'montoVigente'>) {
    const [{ aportado }] = await m.query(SQL_TOTAL_APORTADO, [p.id]);
    return Math.max(0, redondear2(p.montoVigente - Number(aportado)));
  }

  private async exigirSinCambioPendiente(m: EntityManager, pedidoId: number) {
    if ((await m.query(SQL_CAMBIO_PENDIENTE, [pedidoId])).length > 0) {
      throw new ConflictException('Hay una propuesta de cambio de monto sin responder');
    }
  }

  private exigirCliente(p: Pedido, usuarioId: number) {
    if (p.clienteId !== usuarioId) throw new ForbiddenException('Este pedido no es tuyo');
  }

  private exigirTrabajador(p: Pedido, usuarioId: number) {
    if (p.trabajadorId !== usuarioId) throw new ForbiddenException('No eres el trabajador asignado a este pedido');
  }

  /** Comprueba la máquina de estados antes de ejecutar cualquier cambio. */
  private exigirTransicion(estadoActual: string, estadoNuevo: string) {
    if (!permiteTransicionPedido(estadoActual, estadoNuevo)) {
      const desde = ETIQUETA[estadoActual] ?? estadoActual;
      const hacia = ETIQUETA[estadoNuevo] ?? estadoNuevo;
      throw new ConflictException(`Transición de estado no permitida: «${desde}» → «${hacia}».`);
    }
  }

  private exigirEstado(p: Pedido, permitidos: string[], accion: string) {
    if (!permitidos.includes(p.estado)) {
      const nombres = permitidos.map((e) => `«${ETIQUETA[e]}»`);
      const validos = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} o ${nombres.at(-1)}` : nombres[0];
      throw new ConflictException(`El pedido está «${ETIQUETA[p.estado]}»; solo ${accion} cuando está ${validos}`);
    }
  }

  private async bloquear(m: EntityManager, pedidoId: number): Promise<Pedido> {
    const [p] = await m.query(SQL_BLOQUEAR_PEDIDO, [pedidoId]);
    if (!p) throw new NotFoundException('El pedido no existe');
    return {
      ...p,
      montoVigente: Number(p.montoVigente),
      costoVisita: Number(p.costoVisita),
      anticipoMinimo: num(p.anticipoMinimo),
    };
  }

  private async configuracion(m: { query(sql: string): Promise<any> }) {
    const filas: { clave: string; valor: string }[] = await m.query(SQL_CONFIGURACION);
    return Object.fromEntries(filas.map((f) => [f.clave, f.valor])) as Record<string, string | undefined>;
  }

  private avisar(m: EntityManager, cuentaId: number, pedidoId: number, mensaje: string) {
    return m.query(SQL_NOTIFICAR, [cuentaId, pedidoId, mensaje.slice(0, 300)]);
  }

  /** Transacción que anota quién actúa (para la bitácora) y traduce los errores de la base. */
  private async transaccion<T>(usuarioId: number, trabajo: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (m) => {
        await m.query(SQL_SET_USUARIO, [usuarioId]);
        return trabajo(m);
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }
}

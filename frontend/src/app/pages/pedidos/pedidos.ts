import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';

import {
  ETIQUETA_ESTADO_PEDIDO,
  type DetalleSolicitud,
  type EstadoPedido,
  type MedioPago,
  type MiSolicitud,
  type PedidoDetalle,
  type PedidoResumen
} from '../../models/backend.models';
import { ApiPedidos } from '../../services/backend/api-pedidos';
import { ApiSolicitudes } from '../../services/backend/api-solicitudes';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos implements OnInit {

  private readonly api = inject(ApiPedidos);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly solicitudesApi = inject(ApiSolicitudes);

  pedidos: PedidoResumen[] = [];
  cargando: boolean = true;
  errorLista: string = '';

  filtroEstado: string = 'Todos';

  // Avance normal de un pedido (un pedido cancelado no aparece en esta línea)
  readonly pasos: EstadoPedido[] = ['bajo_revision', 'aprobado', 'en_proceso', 'finalizado'];
  readonly etiqueta = ETIQUETA_ESTADO_PEDIDO;
  readonly estrellas: number[] = [1, 2, 3, 4, 5];

  // Pedido abierto (se pide su detalle al backend)
  abierto: number | null = null;
  detalle: PedidoDetalle | null = null;
  puedoCalificar: boolean = false;
  mensaje: string = '';
  mensajeCorrecto: boolean = false;
  ocupado: boolean = false;

  // Campos de los formularios del pedido abierto
  medioPago: MedioPago = 'qr';
  referencia: string = '';
  motivoCancelacion: string = '';
  montoNuevo: number | null = null;
  motivoCambio: string = '';
  estrellasElegidas: number = 0;
  comentario: string = '';

  // Mis solicitudes pendientes (cliente): aquí elige la propuesta que le conviene
  solicitudes: MiSolicitud[] = [];
  solicitudAbierta: number | null = null;
  detalleSolicitud: DetalleSolicitud | null = null;
  horarioElegido: string = '';
  mensajeSolicitud: string = '';
  mensajeSolicitudCorrecto: boolean = false;

  ngOnInit(): void {
    this.cargarLista();
    this.cargarSolicitudes();
  }

  // ------------------------------------------------------------ mis solicitudes
  cargarSolicitudes(): void {
    this.solicitudesApi.mias().subscribe({
      next: (lista) => {
        this.solicitudes = lista.filter((s) => s.estado === 'pendiente');
        this.cdr.markForCheck();
      },
      error: () => {
        this.solicitudes = [];
        this.cdr.markForCheck();
      }
    });
  }

  alternarSolicitud(id: number): void {
    if (this.solicitudAbierta === id) {
      this.solicitudAbierta = null;
      this.detalleSolicitud = null;
      return;
    }
    this.solicitudAbierta = id;
    this.detalleSolicitud = null;
    this.horarioElegido = '';
    this.mensajeSolicitud = '';
    this.solicitudesApi.detalle(id).subscribe({
      next: (d) => {
        this.detalleSolicitud = d;
        // Si solo ofreció un horario, ya queda elegido
        if (d.horarios?.length === 1) this.horarioElegido = String(d.horarios[0].id);
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.avisarSolicitud(mensajeDeError(e), false);
        this.cdr.markForCheck();
      }
    });
  }

  private avisarSolicitud(texto: string, correcto: boolean): void {
    this.mensajeSolicitud = texto;
    this.mensajeSolicitudCorrecto = correcto;
  }

  /** RF-25: elige una propuesta y un horario; nace el pedido «bajo revisión». */
  elegirPostulacion(postulacionId: number): void {
    const solicitud = this.detalleSolicitud;
    if (!solicitud || this.ocupado) return;
    if (!this.horarioElegido) {
      this.avisarSolicitud('Elige primero el horario en que recibirás al trabajador.', false);
      return;
    }
    this.ocupado = true;
    this.solicitudesApi.elegir(solicitud.id, {
      postulacionId,
      horarioId: Number(this.horarioElegido)
    }).subscribe({
      next: (pedido) => {
        this.ocupado = false;
        this.solicitudAbierta = null;
        this.detalleSolicitud = null;
        this.cargarSolicitudes();
        this.cargarLista();
        this.abierto = pedido.pedidoId;
        this.recargarDetalle(pedido.pedidoId);
        this.avisar('Elegiste la propuesta. Paga el anticipo para aprobar el pedido.', true);
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.ocupado = false;
        this.avisarSolicitud(mensajeDeError(e), false);
        this.cdr.markForCheck();
      }
    });
  }

  cancelarSolicitud(id: number): void {
    if (this.ocupado) return;
    this.ocupado = true;
    this.solicitudesApi.cancelar(id).subscribe({
      next: () => {
        this.ocupado = false;
        this.solicitudAbierta = null;
        this.detalleSolicitud = null;
        this.cargarSolicitudes();
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.ocupado = false;
        this.avisarSolicitud(mensajeDeError(e), false);
        this.cdr.markForCheck();
      }
    });
  }

  // ------------------------------------------------------------ lista
  cargarLista(): void {
    this.cargando = true;
    this.errorLista = '';
    this.api.mios().subscribe({
      next: (lista) => {
        this.pedidos = lista;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.errorLista = mensajeDeError(e);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get pedidosFiltrados(): PedidoResumen[] {
    if (this.filtroEstado === 'Todos') return this.pedidos;
    return this.pedidos.filter((p) => p.estado === this.filtroEstado);
  }

  indicePaso(estado: EstadoPedido): number {
    return this.pasos.indexOf(estado);
  }

  // ------------------------------------------------------------ detalle
  alternar(id: number): void {
    if (this.abierto === id) {
      this.abierto = null;
      this.detalle = null;
      return;
    }
    this.abierto = id;
    this.recargarDetalle(id);
  }

  private recargarDetalle(id: number, conservarMensaje = false): void {
    if (!conservarMensaje) this.mensaje = '';
    this.detalle = null;
    this.puedoCalificar = false;
    this.api.detalle(id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.cdr.markForCheck();
        if (d.estado === 'finalizado') {
          this.api.calificaciones(id).subscribe({
            next: (r) => {
              this.puedoCalificar = r.puedoCalificar;
              this.cdr.markForCheck();
            },
            error: () => {
              this.puedoCalificar = false;
              this.cdr.markForCheck();
            }
          });
        }
      },
      error: (e) => {
        this.avisar(mensajeDeError(e), false);
        this.cdr.markForCheck();
      }
    });
  }

  private avisar(texto: string, correcto: boolean): void {
    this.mensaje = texto;
    this.mensajeCorrecto = correcto;
  }

  /** Cambio de monto sin responder (si lo hay) */
  get cambioPendiente() {
    return this.detalle?.cambiosDeMonto.find((c) => c.estado === 'pendiente') ?? null;
  }

  // ------------------------------------------------------------ acciones
  /**
   * Ejecuta una acción del backend y vuelve a pedir el detalle y la lista:
   * el estado lo decide el backend, la pantalla solo lo muestra.
   */
  private ejecutar(accion$: Observable<unknown>, textoExito: string, alTerminar?: () => void): void {
    if (!this.detalle || this.ocupado) return;
    const id = this.detalle.id;
    this.ocupado = true;
    this.mensaje = '';
    accion$.subscribe({
      next: () => {
        this.ocupado = false;
        alTerminar?.();
        this.recargarDetalle(id, true);
        this.avisar(textoExito, true);
        this.cdr.markForCheck();
        this.api.mios().subscribe({
          next: (lista) => {
            this.pedidos = lista;
            this.cdr.markForCheck();
          }
        });
      },
      error: (e) => {
        this.ocupado = false;
        this.avisar(mensajeDeError(e), false);
        this.cdr.markForCheck();
      }
    });
  }

  pagarAnticipo(): void {
    if (!this.detalle) return;
    this.ejecutar(
      this.api.pagarAnticipo(this.detalle.id, { medio: this.medioPago, referencia: this.referencia.trim() || undefined }),
      'Anticipo pagado (pago simulado). El pedido quedó aprobado.',
      () => (this.referencia = '')
    );
  }

  pagarSaldo(): void {
    if (!this.detalle) return;
    this.ejecutar(
      this.api.pagarSaldo(this.detalle.id, { medio: this.medioPago, referencia: this.referencia.trim() || undefined }),
      'Saldo pagado (pago simulado).',
      () => (this.referencia = '')
    );
  }

  responderCambio(aceptar: boolean): void {
    const cambio = this.cambioPendiente;
    if (!this.detalle || !cambio) return;
    this.ejecutar(
      this.api.responderCambioMonto(this.detalle.id, cambio.id, aceptar),
      aceptar ? 'Aceptaste el nuevo monto.' : 'Rechazaste el nuevo monto: el pedido se canceló.'
    );
  }

  cancelar(): void {
    if (!this.detalle) return;
    this.ejecutar(
      this.api.cancelar(this.detalle.id, this.motivoCancelacion.trim() || undefined),
      'Pedido cancelado.',
      () => (this.motivoCancelacion = '')
    );
  }

  reportarIncumplimiento(): void {
    if (!this.detalle) return;
    this.ejecutar(
      this.api.incumplimiento(this.detalle.id),
      'Incumplimiento reportado. El pedido se canceló y se registró el reporte.'
    );
  }

  iniciar(): void {
    if (!this.detalle) return;
    this.ejecutar(this.api.iniciar(this.detalle.id), 'Trabajo iniciado.');
  }

  finalizar(): void {
    if (!this.detalle) return;
    this.ejecutar(this.api.finalizar(this.detalle.id), 'Pedido finalizado. Se liberó el pago.');
  }

  proponerCambio(): void {
    if (!this.detalle) return;
    if (this.montoNuevo === null || !Number.isFinite(this.montoNuevo) || this.montoNuevo <= 0 || this.motivoCambio.trim().length < 5) {
      this.avisar('Indica el nuevo monto y el motivo (mínimo 5 caracteres).', false);
      return;
    }
    this.ejecutar(
      this.api.proponerCambioMonto(this.detalle.id, { montoNuevo: this.montoNuevo, motivo: this.motivoCambio.trim() }),
      'Propuesta enviada. El cliente debe responderla.',
      () => {
        this.montoNuevo = null;
        this.motivoCambio = '';
      }
    );
  }

  // ------------------------------------------------------------ calificación
  elegirEstrellas(valor: number): void {
    this.estrellasElegidas = valor;
  }

  guardarCalificacion(): void {
    if (!this.detalle) return;
    if (this.estrellasElegidas < 1 || this.estrellasElegidas > 5) {
      this.avisar('Selecciona una calificación de 1 a 5 estrellas.', false);
      return;
    }
    this.ejecutar(
      this.api.calificar(this.detalle.id, {
        estrellas: this.estrellasElegidas,
        comentario: this.comentario.trim() || undefined
      }),
      'Calificación guardada. ¡Gracias!',
      () => {
        this.estrellasElegidas = 0;
        this.comentario = '';
      }
    );
  }
}

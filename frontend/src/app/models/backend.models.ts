/**
 * Tipos de lo que envía y devuelve el backend (NestJS). Fuente de verdad: Swagger en
 * http://localhost:3000/api/docs. Los estados llegan en minúsculas, con guion bajo.
 */

export interface Zona { id: number; nombre: string; }
export interface Especialidad { id: number; nombre: string; }

// ---------------------------------------------------------------- trabajadores
export interface TrabajadorPublico {
  id: number;
  nombre: string;
  zona: string;
  zonaId: number;
  calificacionPromedio: number;
  cantidadOpiniones: number;
  historial: string | null;
  especialidades: string[];
}

export type EstadoTrabajador = 'en_revision' | 'activo' | 'suspendido';

export interface MiPerfilTrabajador {
  id: number;
  nombre: string;
  zonaId: number;
  zona: string;
  estado: EstadoTrabajador;
  historial: string | null;
  qrPagoUrl: string | null;
  anticipoMinimo: number | null;
  margenMinutos: number;
  especialidadIds: number[];
  especialidades: string[];
  calificacionPromedio: number;
  cantidadOpiniones: number;
}

export interface GuardarPerfilTrabajador {
  zonaId: number;
  especialidadIds: number[];
  historial?: string;
  anticipoMinimo?: number;
  margenMinutos?: number;
  qrPagoUrl?: string;
}

// ---------------------------------------------------------------- solicitudes y postulaciones
export interface HorarioSolicitud {
  /** Hora local de Bolivia, sin zona horaria. Ejemplo: '2026-11-30T10:00:00' */
  inicio: string;
  fin: string;
}

export interface CrearSolicitud {
  especialidadId: number;
  zonaId: number;
  descripcion: string;
  ubicacion: string;
  latitud?: number;
  longitud?: number;
  /** Enlaces de fotos (máximo 6). El backend todavía no recibe archivos. */
  fotos?: string[];
  horarios: HorarioSolicitud[];
}

export type EstadoSolicitud = 'pendiente' | 'asignada' | 'cancelada';

export interface SolicitudCreada {
  id: number;
  estado: EstadoSolicitud;
  creadaEn: string;
  venceEn: string;
  /** true si no hay trabajadores activos en esa zona y especialidad (RF-16) */
  avisoSinTrabajadores: boolean;
  mensaje: string;
}

export interface MiSolicitud {
  id: number;
  descripcion: string;
  ubicacion: string;
  estado: EstadoSolicitud;
  creadaEn: string;
  venceEn: string;
  especialidad: string;
  zona: string;
  cantidadPostulaciones: number;
  pedidoId: number | null;
}

export interface PostulacionRecibida {
  id: number;
  trabajadorId: number;
  trabajador: string;
  zona: string;
  monto: number;
  tipoTrabajo: TipoTrabajo;
  costoVisita: number;
  incluyeMateriales: boolean;
  creadaEn: string;
  calificacionPromedio: number;
  cantidadOpiniones: number;
  [campoExtra: string]: unknown;
}

export interface DetalleSolicitud {
  id: number;
  clienteId: number;
  descripcion: string;
  ubicacion: string;
  estado: EstadoSolicitud;
  creadaEn: string;
  venceEn: string;
  especialidad: string;
  zona: string;
  fotos: string[] | null;
  horarios: { id: number; inicio: string; fin: string }[] | null;
  pedidoId: number | null;
  postulaciones: PostulacionRecibida[];
  [campoExtra: string]: unknown;
}

export interface SolicitudDisponible {
  id: number;
  descripcion: string;
  ubicacion: string;
  especialidad: string;
  zona: string;
  creadaEn: string;
  venceEn: string;
  fotos: string[] | null;
  horarios: { id: number; inicio: string; fin: string }[] | null;
  yaPostulado: boolean;
  [campoExtra: string]: unknown;
}

export type TipoTrabajo = 'fotos' | 'visita';

export interface Postularse {
  monto: number;
  tipoTrabajo: TipoTrabajo;
  costoVisita: number;
  incluyeMateriales: boolean;
}

export type EstadoPostulacion = 'enviada' | 'elegida' | 'descartada';

export interface MiPostulacion {
  id: number;
  solicitudId: number;
  monto: number;
  tipoTrabajo: TipoTrabajo;
  costoVisita: number;
  incluyeMateriales: boolean;
  estado: EstadoPostulacion;
  creadaEn: string;
  descripcion: string;
  especialidad: string;
  zona: string;
  estadoSolicitud: EstadoSolicitud;
  pedidoId: number | null;
}

export interface ElegirPostulacion {
  postulacionId: number;
  /** id del horario de la solicitud (DetalleSolicitud.horarios[].id) */
  horarioId: number;
}

export interface PedidoNuevo {
  pedidoId: number;
  estado: EstadoPedido;
  trabajadorId: number;
  montoVigente: number;
  horarioInicio: string;
  horarioFin: string;
}

// ---------------------------------------------------------------- pedidos
export type EstadoPedido = 'pendiente' | 'bajo_revision' | 'aprobado' | 'en_proceso' | 'finalizado' | 'cancelado';
export type MedioPago = 'qr' | 'tarjeta';

export const ETIQUETA_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  bajo_revision: 'Bajo revisión',
  aprobado: 'Aprobado',
  en_proceso: 'En proceso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export interface PedidoResumen {
  id: number;
  estado: EstadoPedido;
  montoVigente: number;
  horarioInicio: string;
  horarioFin: string;
  miRol: 'cliente' | 'trabajador';
  contraparte: string;
  especialidad: string;
  zona: string;
  descripcion: string;
  tipoTrabajo: TipoTrabajo;
  creadoEn: string;
}

export interface PagoPedido {
  id: number;
  tipo: 'anticipo' | 'saldo';
  monto: number;
  medio: MedioPago;
  estado: 'retenido' | 'liberado' | 'reembolsado' | 'liberado_parcial';
  montoLiberado: number;
  montoReembolsado: number;
  pagadoEn: string;
  liberadoEn: string | null;
}

export interface CambioMonto {
  id: number;
  montoAnterior: number;
  montoNuevo: number;
  motivo: string;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  creadoEn: string;
  respondidoEn: string | null;
}

/** Cambio de estado guardado en la bitácora del pedido (RF-22). */
export interface HistorialEstadoPedido {
  estadoAnterior: EstadoPedido | null;
  estadoNuevo: EstadoPedido;
  responsableId: number | null;
  responsable: string;
  fechaCambio: string;
}

export interface PedidoDetalle {
  id: number;
  estado: EstadoPedido;
  miRol: 'cliente' | 'trabajador';
  cliente: string;
  trabajador: string;
  solicitudId: number;
  descripcion: string;
  ubicacion: string;
  especialidad: string;
  zona: string;
  tipoTrabajo: TipoTrabajo;
  costoVisita: number;
  incluyeMateriales: boolean;
  montoVigente: number;
  horarioInicio: string;
  horarioFin: string;
  comisionMonto: number;
  motivoCancelacion: string | null;
  /** Solo mientras está «bajo_revision» */
  anticipoRequerido: number | null;
  /** Lo que falta pagar para completar el monto (RF-28) */
  saldoPendiente: number;
  /** Solo para el cliente, mientras todavía puede pagar (RF-11) */
  qrPagoUrl: string | null;
  pagos: PagoPedido[];
  cambiosDeMonto: CambioMonto[];
  historialEstados: HistorialEstadoPedido[];
}

export interface PagarPedido {
  medio: MedioPago;
  /** Número del comprobante del QR o de la tarjeta (opcional) */
  referencia?: string;
}

export interface ProponerCambioMonto {
  montoNuevo: number;
  motivo: string;
}

// ---------------------------------------------------------------- calificaciones y reportes
export type TipoReporte = 'incumplimiento' | 'estafa' | 'robo';

export interface Calificar {
  estrellas: number;
  comentario?: string;
  /** Solo el cliente puede adjuntar un reporte (RF-32) */
  reporte?: { tipo: TipoReporte; descripcion: string };
}

export interface OpinionesTrabajador {
  trabajadorId: number;
  nombre: string;
  calificacionPromedio: number;
  cantidadOpiniones: number;
  pagina: number;
  opiniones: { estrellas: number; comentario: string | null; [campoExtra: string]: unknown }[];
}

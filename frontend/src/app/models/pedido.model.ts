
export type EstadoPedido =
  | 'Pendiente'
  | 'En proceso'
  | 'Finalizado';

// Datos enviados desde Solicitar trabajo
export interface DatosSolicitud {
  titulo: string;
  especialidad: string;
  descripcion: string;
  zona: string;
  horario: string;
}

// Propuesta preparada por el trabajador
export interface PropuestaPedido {
  monto: number;
  detalle: string;
  trabajador: string;
}

// Datos completos de un pedido
export interface Pedido extends DatosSolicitud {
  id: number;
  fecha: string;
  estado: EstadoPedido;
  trabajador: string;
  monto: number | null;
  pagoSimulado: boolean;
  calificacion: number;
  comentario: string;
  calificacionGuardada: boolean;
  mensaje: string;
  propuesta?: PropuestaPedido;
}

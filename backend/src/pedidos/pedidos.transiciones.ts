/**
 * Transiciones de estado permitidas para un pedido.
 * El servicio las valida antes de ejecutar el UPDATE y la base de datos
 * mantiene su trigger como segunda protección.
 */
const TRANSICIONES_PERMITIDAS = {
  pendiente: ['bajo_revision', 'cancelado'],
  bajo_revision: ['aprobado', 'cancelado'],
  aprobado: ['en_proceso', 'cancelado'],
  en_proceso: ['finalizado'],
  finalizado: [],
  cancelado: [],
} as const;

export function permiteTransicionPedido(estadoActual: string, estadoNuevo: string): boolean {
  const permitidos =
    TRANSICIONES_PERMITIDAS[estadoActual as keyof typeof TRANSICIONES_PERMITIDAS] as
      | readonly string[]
      | undefined;

  return permitidos?.includes(estadoNuevo) ?? false;
}

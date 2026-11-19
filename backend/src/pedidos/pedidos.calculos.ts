/**
 * Cálculos de dinero del pedido, sin base de datos, para poder probarlos solos.
 * Todo se redondea a 2 decimales (centavos).
 */

export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * RN-04 / RF-11: anticipo = el mayor entre el porcentaje del monto (25 %) y el mínimo del trabajador.
 * Nunca supera el monto del trabajo.
 * Ejemplo: monto 200, 25 % => 50. Con mínimo 80 => 80.
 */
export function calcularAnticipo(monto: number, porcentaje: number, minimoTrabajador: number | null): number {
  const porPorcentaje = redondear2((monto * porcentaje) / 100);
  return Math.min(monto, Math.max(porPorcentaje, minimoTrabajador ?? 0));
}

/** RF-30: comisión sobre el monto final. Si está desactivada (S-03), es 0. */
export function calcularComision(monto: number, activa: boolean, porcentaje: number): number {
  return activa ? redondear2((monto * porcentaje) / 100) : 0;
}

export interface PagoRetenido {
  id: number;
  monto: number;
}

export interface ResultadoPago {
  id: number;
  montoLiberado: number;
  montoReembolsado: number;
  estado: 'liberado' | 'reembolsado' | 'liberado_parcial';
}

/**
 * RF-29, RF-31, RN-06: cuando un pedido se cancela, de lo retenido una parte puede ir al trabajador
 * (visita de diagnóstico, transporte) y el resto se devuelve al cliente.
 * "aLiberar" se asigna a los pagos en orden (primero el anticipo) y el resto se reembolsa.
 */
export function repartirRetenido(pagos: PagoRetenido[], aLiberar: number): ResultadoPago[] {
  let pendiente = Math.max(0, aLiberar);
  return pagos.map((pago) => {
    const liberado = redondear2(Math.min(pago.monto, pendiente));
    pendiente = redondear2(pendiente - liberado);
    const reembolsado = redondear2(pago.monto - liberado);
    const estado = liberado === 0 ? 'reembolsado' : reembolsado === 0 ? 'liberado' : 'liberado_parcial';
    return { id: pago.id, montoLiberado: liberado, montoReembolsado: reembolsado, estado };
  });
}

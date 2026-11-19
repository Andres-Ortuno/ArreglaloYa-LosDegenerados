import { describe, expect, it } from 'vitest';
import { calcularAnticipo, calcularComision, repartirRetenido } from './pedidos.calculos.js';

describe('calcularAnticipo', () => {
  it('es el 25 % del monto (ej.: Bs 200 -> Bs 50)', () => {
    expect(calcularAnticipo(200, 25, null)).toBe(50);
  });
  it('usa el mínimo del trabajador si es mayor', () => {
    expect(calcularAnticipo(200, 25, 80)).toBe(80);
  });
  it('nunca supera el monto del trabajo', () => {
    expect(calcularAnticipo(60, 25, 100)).toBe(60);
  });
  it('redondea a centavos', () => {
    expect(calcularAnticipo(450, 25, null)).toBe(112.5);
    expect(calcularAnticipo(333.33, 25, null)).toBe(83.33);
  });
});

describe('calcularComision', () => {
  it('es 0 si está desactivada (S-03)', () => {
    expect(calcularComision(200, false, 3)).toBe(0);
  });
  it('es el 3 % si está activa (Bs 200 -> Bs 6)', () => {
    expect(calcularComision(200, true, 3)).toBe(6);
  });
});

describe('repartirRetenido', () => {
  const pagos = [
    { id: 1, monto: 50 },
    { id: 2, monto: 100 },
  ];
  it('sin nada para el trabajador, todo se reembolsa', () => {
    const r = repartirRetenido(pagos, 0);
    expect(r.map((x) => x.estado)).toEqual(['reembolsado', 'reembolsado']);
    expect(r.reduce((s, x) => s + x.montoReembolsado, 0)).toBe(150);
  });
  it('reparte una parte al trabajador y el resto al cliente', () => {
    const r = repartirRetenido(pagos, 70);
    expect(r[0]).toMatchObject({ montoLiberado: 50, montoReembolsado: 0, estado: 'liberado' });
    expect(r[1]).toMatchObject({ montoLiberado: 20, montoReembolsado: 80, estado: 'liberado_parcial' });
  });
  it('no libera más de lo retenido', () => {
    const r = repartirRetenido(pagos, 999);
    expect(r.reduce((s, x) => s + x.montoLiberado, 0)).toBe(150);
  });
});

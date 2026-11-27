import { describe, expect, it } from 'vitest';
import { permiteTransicionPedido } from './pedidos.transiciones.js';

describe('permiteTransicionPedido', () => {
  it('permite avanzar de bajo revisión a aprobado', () => {
    expect(permiteTransicionPedido('bajo_revision', 'aprobado')).toBe(true);
  });

  it('permite iniciar y finalizar el trabajo en orden', () => {
    expect(permiteTransicionPedido('aprobado', 'en_proceso')).toBe(true);
    expect(permiteTransicionPedido('en_proceso', 'finalizado')).toBe(true);
  });

  it('permite cancelar antes de iniciar el trabajo', () => {
    expect(permiteTransicionPedido('pendiente', 'cancelado')).toBe(true);
    expect(permiteTransicionPedido('bajo_revision', 'cancelado')).toBe(true);
    expect(permiteTransicionPedido('aprobado', 'cancelado')).toBe(true);
  });

  it('rechaza saltar etapas del proceso', () => {
    expect(permiteTransicionPedido('bajo_revision', 'en_proceso')).toBe(false);
    expect(permiteTransicionPedido('aprobado', 'finalizado')).toBe(false);
  });

  it('no permite modificar pedidos finalizados o cancelados', () => {
    expect(permiteTransicionPedido('finalizado', 'cancelado')).toBe(false);
    expect(permiteTransicionPedido('cancelado', 'aprobado')).toBe(false);
  });

  it('rechaza estados desconocidos', () => {
    expect(permiteTransicionPedido('desconocido', 'aprobado')).toBe(false);
  });
});

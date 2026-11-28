import { describe, expect, it } from 'vitest';
import { MAX_RENOVACIONES, motivoNoRenovable, type PostulacionARenovar } from './solicitudes.reglas.js';

/** Una postulación vencida de un trabajador (id 7), de una solicitud pendiente y con 0 renovaciones. */
function vencida(cambios: Partial<PostulacionARenovar> = {}): PostulacionARenovar {
  return {
    trabajadorId: 7,
    estado: 'vencida',
    vencida: true,
    renovaciones: 0,
    estadoSolicitud: 'pendiente',
    solicitudVencida: false,
    ...cambios,
  };
}

describe('motivoNoRenovable (condiciones para renovar una postulación)', () => {
  it('se puede renovar una vencida del mismo trabajador, con solicitud pendiente', () => {
    expect(motivoNoRenovable(vencida(), 7)).toBeNull();
  });

  it('también se puede si el temporizador todavía no la marcó (sigue «enviada» pero con plazo pasado)', () => {
    expect(motivoNoRenovable(vencida({ estado: 'enviada' }), 7)).toBeNull();
  });

  it('no es de otro trabajador', () => {
    expect(motivoNoRenovable(vencida(), 8)).toBe('Esta postulación no es tuya');
  });

  it('no se renueva una vigente', () => {
    expect(motivoNoRenovable(vencida({ estado: 'enviada', vencida: false }), 7)).toMatch(/todavía está vigente/);
  });

  it('no se renueva una elegida ni una descartada', () => {
    expect(motivoNoRenovable(vencida({ estado: 'elegida', vencida: false }), 7)).toMatch(/ya fue elegida/);
    expect(motivoNoRenovable(vencida({ estado: 'descartada' }), 7)).toMatch(/descartada/);
  });

  it('no se renueva si la solicitud ya no está pendiente', () => {
    for (const estadoSolicitud of ['asignada', 'cancelada']) {
      expect(motivoNoRenovable(vencida({ estadoSolicitud }), 7)).toMatch(/ya no está disponible/);
    }
  });

  it('no se renueva si la solicitud venció', () => {
    expect(motivoNoRenovable(vencida({ solicitudVencida: true }), 7)).toMatch(/ya no está disponible/);
  });

  it('permite renovar hasta el máximo y no más', () => {
    expect(motivoNoRenovable(vencida({ renovaciones: MAX_RENOVACIONES - 1 }), 7)).toBeNull();
    expect(motivoNoRenovable(vencida({ renovaciones: MAX_RENOVACIONES }), 7)).toMatch(/no se puede renovar más/);
  });

  it('el máximo es de 2 renovaciones', () => {
    expect(MAX_RENOVACIONES).toBe(2);
  });
});

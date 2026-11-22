import { describe, expect, it } from 'vitest';
import { aplicaSancionGlobal, horasDeSuspension } from './sanciones.reglas.js';

describe('horasDeSuspension (escalera 1, 2, 3, 5, 8, 13)', () => {
  it('sigue la escalera', () => {
    expect([0, 1, 2, 3, 4, 5].map(horasDeSuspension)).toEqual([1, 2, 3, 5, 8, 13]);
  });
  it('se queda en 13 h después de la sexta', () => {
    expect(horasDeSuspension(6)).toBe(13);
    expect(horasDeSuspension(40)).toBe(13);
  });
  it('ignora valores negativos', () => {
    expect(horasDeSuspension(-3)).toBe(1);
  });
});

describe('aplicaSancionGlobal (más de 10 clientes distintos)', () => {
  it('con 10 todavía no', () => expect(aplicaSancionGlobal(10)).toBe(false));
  it('con 11 sí', () => expect(aplicaSancionGlobal(11)).toBe(true));
});

import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('health responde estado ok', () => {
    const resultado = new AppController().health();
    expect(resultado.estado).toBe('ok');
  });
});

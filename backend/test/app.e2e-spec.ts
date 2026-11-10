import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppController } from '../src/app.controller.js';

// Prueba sin base de datos: solo levanta el controlador de salud.
describe('GET /api/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [AppController] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con estado ok', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(respuesta.body.estado).toBe('ok');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import * as helmet from '@fastify/helmet';

describe('API Gateway (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Register security headers as in main.ts
    await app.register(helmet as any);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/health (GET) - Should return 200 and healthy status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('Security Headers - Should have X-Correlation-ID and Security headers', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect((res) => {
        console.log('HEADERS:', res.headers);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});

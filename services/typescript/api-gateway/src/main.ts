import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import fastifyCookie from '@fastify/cookie';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { AllExceptionsFilter } from './common/filters/exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Correlation ID Middleware
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, reply, done) => {
      const correlationId =
        request.headers['x-correlation-id'] ||
        request.headers['x-request-id'] || randomUUID();

      request.headers['x-correlation-id'] = correlationId;
      reply.header('x-correlation-id', correlationId);
      done();
    });

  // Manual Security Headers
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onSend', async (req, reply) => {
      reply.header(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), autoplay=(), payment=(), usb=()',
      );
    });

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'secure-fintech-secret',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

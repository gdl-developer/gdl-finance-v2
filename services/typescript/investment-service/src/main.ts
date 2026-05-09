import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';

import helmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  app.setGlobalPrefix('api/v2/investments');

  // Security Headers
  await app.register(helmet as any);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'invest-secret',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  await app.listen(3002, '0.0.0.0');
  console.log(`Investment Service is running on: ${await app.getUrl()}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

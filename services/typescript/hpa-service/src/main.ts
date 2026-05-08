import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('hpa-service');
  await app.listen(3086, '0.0.0.0');
  console.log(`HPA Service is running on: ${await app.getUrl()}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

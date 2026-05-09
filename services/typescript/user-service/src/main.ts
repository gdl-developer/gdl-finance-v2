import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/Exception-Filters/http-exception.filter';
import { ModelExceptionFilter } from './common/Exception-Filters/model-exception.filter';
import { TokenInterceptor } from './common/interceptors/token.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';
import { CorsMiddleware } from './common/middlewares/cors.middleware';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // -- Helmet Use Helmet for security headers
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        frameSrc: ["'none'"], // Disallow embedding in iframes (clickjacking protection)
        frameAncestors: ["'none'"], // Prevent other sites from embedding this site
        objectSrc: ["'none'"],
        defaultSrc: ["'self'"], // Default to same-origin for all other other directives no set.
        scriptSrc: ["'self'"],
      },
    }),
  );
  app.use(helmet.noSniff());
  app.use(helmet.frameguard({ action: 'deny' }));
  app.use(helmet.xssFilter());
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
  app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
  app.use(helmet.crossOriginEmbedderPolicy());
  app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));
  app.use(helmet.originAgentCluster());
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Add Permissions-Policy header manually
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), autoplay=(), payment=(), usb=()',
    );
    next();
  });

  // Apply your custom CORS middleware
  const configService = app.get(ConfigService);
  app.use(
    new CorsMiddleware(configService).use.bind(
      new CorsMiddleware(configService),
    ),
  );

  // Create an instance of the RateLimitMiddleware and Apply Rate Limit Middleware with context binding
  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use((req, res, next) => rateLimitMiddleware.use(req, res, next));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(), new ModelExceptionFilter());
  app.useGlobalInterceptors(new TokenInterceptor());

  const config = new DocumentBuilder()
    .setTitle('GDL')
    .setDescription('GDL User Service')
    .setVersion('1.0.0')
    .addTag('gdl')
    .addServer('/v1/usrs/')
    .addServer('/')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/api', app, document);
  // --- Path Rewrite Middleware to handle multiple prefixes (GDPR/NDPR & Staging compatibility) ---
  app.use((req, res, next) => {
    const prefixes = ['/user-service', '/v1/usrs'];
    for (const prefix of prefixes) {
      if (req.url.startsWith(prefix)) {
        req.url = req.url.replace(prefix, '');
        if (req.url === '' || req.url === ' ') req.url = '/';
        break;
      }
    }
    next();
  });

  await app.listen(3080, '0.0.0.0');

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

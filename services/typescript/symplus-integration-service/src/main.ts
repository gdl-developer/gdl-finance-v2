import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/Exception-Filters/http-exception.filter";
import { ModelExceptionFilter } from "./common/Exception-Filters/model-exception.filter";
import { CorsMiddleware } from "./common/middlewares/cors.middleware";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  const configService = app.get(ConfigService);
  const corsMiddleware = new CorsMiddleware(configService);
  app.use((req, res, next) => corsMiddleware.use(req, res, next));

  app.useGlobalFilters(new HttpExceptionFilter(), new ModelExceptionFilter());

  // Swagger Configuration - Only enable in development or when explicitly enabled
  const enableSwagger =
    process.env.ENABLE_SWAGGER === "true" ||
    process.env.NODE_ENV !== "production";

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle("GDL Symplus Service")
      .setDescription("GDL Symplus APIs Implementation Service")
      .setVersion("1.0")
      .addTag("symplus")
      .addServer("/v1/symplus")
      .addServer("/")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup("api", app, document);
    console.log("📚 Swagger documentation available at /api");
  } else {
    console.log("📚 Swagger documentation disabled in production");
  }

  app.setGlobalPrefix("symplus-service", { exclude: ["metrics"] });
  await app.listen(process.env.PORT || 3011);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(
    `🔐 Authentication enforcement: ${
      process.env.ENFORCE_AUTH === "true"
        ? "ENABLED"
        : "OPTIONAL (backward compatible)"
    }`
  );
}
bootstrap();

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Handle gRPC errors
    if ((exception as any).code !== undefined && (exception as any).details) {
      const grpcCode = (exception as any).code;
      const grpcDetails = (exception as any).details;

      message = grpcDetails;

      switch (grpcCode) {
        case 3: // INVALID_ARGUMENT
          status = HttpStatus.BAD_REQUEST;
          break;
        case 5: // NOT_FOUND
          status = HttpStatus.NOT_FOUND;
          break;
        case 6: // ALREADY_EXISTS
          status = HttpStatus.CONFLICT;
          break;
        case 7: // PERMISSION_DENIED
          status = HttpStatus.FORBIDDEN;
          break;
        case 16: // UNAUTHENTICATED
          status = HttpStatus.UNAUTHORIZED;
          break;
        case 13: // INTERNAL
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        case 14: // UNAVAILABLE
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'Service unavailable';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    this.logger.error(
      `Http Status: ${status} Error Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
    );

    void response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    });
  }
}

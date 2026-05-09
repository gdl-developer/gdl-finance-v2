import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response | any>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let response_code: string;

    // defining response codes
    if (status === HttpStatus.NOT_FOUND) response_code = '004';
    else if (status === HttpStatus.BAD_REQUEST) response_code = '006';
    else if (status === HttpStatus.BAD_GATEWAY) response_code = '007';
    else if (status === HttpStatus.FORBIDDEN) response_code = '009';
    else if (status === HttpStatus.GATEWAY_TIMEOUT) response_code = '008';
    else if (status === HttpStatus.HTTP_VERSION_NOT_SUPPORTED)
      response_code = '010';
    else if (status === HttpStatus.NOT_ACCEPTABLE) response_code = '016';
    else if (status === HttpStatus.REQUEST_TIMEOUT) response_code = '013';
    else if (status === HttpStatus.UNAUTHORIZED) response_code = '011';
    else if (status === HttpStatus.UNPROCESSABLE_ENTITY) response_code = '012';
    else if (status === HttpStatus.UNSUPPORTED_MEDIA_TYPE)
      response_code = '015';
    else if (status === HttpStatus.URI_TOO_LONG) response_code = '014';
    else if (status === HttpStatus.SERVICE_UNAVAILABLE) response_code = '016';
    else if (status === HttpStatus.NOT_MODIFIED) response_code = '017';
    else if (status === HttpStatus.NOT_IMPLEMENTED) response_code = '018';
    else response_code = '099'; // Default error code for internal errors

    let message: any = exception.message || '';
    let response_description = exception.message || 'An Error Occurred';

    if (exception instanceof BadRequestException) {
      const xx: any = exception.getResponse();
      if (xx.hasOwnProperty('message')) {
        message = xx?.message;
      }
    }

    // SANITIZATION: If Internal Server Error, genericize the message to avoid leakage
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      response_description =
        'An unexpected error occurred. Please try again later.';
      message = 'Internal Server Error';
    }

    // Log the real error internally
    console.log(`An Error Occurred in ${request.url}`, exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(
        `[500 ERROR] ${request.method} ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
        'HttpExceptionFilter',
      );
    }

    response.status(status).json({
      success: 'false',
      response_code: response_code,
      response_description:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected error occurred. Please try again later.'
          : response_description,
      message: message,
    });
  }
}

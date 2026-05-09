import { HttpException, HttpStatus } from '@nestjs/common';

export class ModelNotFound extends HttpException {
  constructor(message?: string) {
    super(message ? message : 'Model Not Found', HttpStatus.NOT_FOUND);
  }
}

import { HttpException, HttpStatus } from "@nestjs/common";

export class ModelNotFound extends HttpException {
  constructor() {
    super("Model Not Found", HttpStatus.NOT_FOUND);
  }
}

import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';

export class OptionalIntPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (value == null) return undefined;

    const num = Number(value);
    if (isNaN(num)) {
      throw new BadRequestException(
        'type error: parameter must be of type number',
      );

      return num;
    }
  }
}

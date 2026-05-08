import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { EncryptionService } from './encryption.service';

@Injectable()
export class DecryptionInterceptor implements NestInterceptor {
  constructor(private readonly encryptionService: EncryptionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Check if the payload is encrypted (standard header or field)
    if (request.body && request.body.is_encrypted) {
      try {
        const decryptedBody = this.encryptionService.decrypt({
          encryptedData: request.body.payload,
          encryptedKey: request.body.key,
          iv: request.body.iv,
        });
        request.body = decryptedBody;
      } catch (e) {
        throw new BadRequestException('Encryption handshake failed');
      }
    }

    return next.handle();
  }
}

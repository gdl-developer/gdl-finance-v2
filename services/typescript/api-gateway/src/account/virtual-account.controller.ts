import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('virtual-account')
export class VirtualAccountController {
  @Public()
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() payload: any) {
    // Logic to handle credit notification from external providers
    console.log('Received callback:', payload);
    return { success: true, message: 'Callback processed' };
  }
}

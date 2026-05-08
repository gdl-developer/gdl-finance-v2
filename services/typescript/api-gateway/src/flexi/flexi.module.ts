import { AuthModule } from "../auth/auth.module";
import { Module } from '@nestjs/common';
import { FlexiService } from './flexi.service';
import { FlexiController } from './flexi.controller';

@Module({
  providers: [FlexiService],
  controllers: [FlexiController]
})
export class FlexiModule {}

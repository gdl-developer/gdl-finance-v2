import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketerService } from './marketer.service';
import { MarketerController } from './marketer.controller';
import { GdlMarketer } from '../entities/marketer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GdlMarketer])],
  providers: [MarketerService],
  controllers: [MarketerController],
  exports: [MarketerService],
})
export class MarketerModule {}

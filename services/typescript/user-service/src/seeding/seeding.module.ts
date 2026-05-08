import { MiddlewareConsumer, Module } from '@nestjs/common';
import { SeedingService } from './seeding.service';
import { SeedingController } from './seeding.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seeding } from './entities/seeding.entity';
import { SeedingMiddleware } from './seedingMiddleware';

@Module({
  imports: [TypeOrmModule.forFeature([Seeding])],
  controllers: [SeedingController],
  providers: [SeedingService],
})
export class SeedingModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SeedingMiddleware).forRoutes('*');
  }
}

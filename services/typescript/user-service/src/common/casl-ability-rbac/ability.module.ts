import { Module } from '@nestjs/common';
import { AbilityFactory } from './ability.factory';
import { AccessValidatorModule } from '../audit-logger/access-validator/access-validator.module';

@Module({
  imports: [AccessValidatorModule],
  providers: [AbilityFactory],
  exports: [AbilityFactory, AccessValidatorModule], // 👈 re-export so others see it
})
export class AbilityModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { FlexiAgent } from '../entities/agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlexiAgent]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'flexi-jwt-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AgentService],
  controllers: [AgentController],
  exports: [AgentService],
})
export class AgentModule {}

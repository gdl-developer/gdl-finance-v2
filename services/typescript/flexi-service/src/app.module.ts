import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlexiAgent } from './entities/agent.entity';
import { FlexiRequest } from './entities/request.entity';
import { GdlMarketer } from './entities/marketer.entity';
import { AgentModule } from './agent/agent.module';
import { RequestsModule } from './requests/requests.module';
import { MarketerModule } from './marketer/marketer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [FlexiAgent, FlexiRequest, GdlMarketer],
        synchronize: true, // Only for staging
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
    AgentModule,
    RequestsModule,
    MarketerModule,
  ],
})
export class AppModule {}

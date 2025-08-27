import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentModule } from './comment/comment.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationModule } from './notification/notification.module';
import configuration from './config/configuration';

// health check
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
      }),
    }),

    // initial modules
    HealthModule,
    // user, comment, notification, auth, gateway will be added in later chapters
    CommentModule,
    UserModule,
    AuthModule,
    GatewayModule,
    NotificationModule,
  ],
})
export class AppModule {}

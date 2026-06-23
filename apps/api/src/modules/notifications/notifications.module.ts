import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AnyAuthGuard } from '../../common/guards/any-auth.guard';
import { EmailModule } from '../email/email.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationsService, NotificationsGateway, AnyAuthGuard],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

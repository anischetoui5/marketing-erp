import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsProcessor } from './ai-insights.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'ai-jobs' }),
  ],
  controllers: [AiInsightsController],
  providers: [AiInsightsService, AiInsightsProcessor],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}

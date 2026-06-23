import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { MetaAdsController } from './meta-ads.controller';
import { MetaAdsService } from './meta-ads.service';
import { MetaAdsProcessor } from './meta-ads.processor';
import { MetaAdsCronService } from './meta-ads.cron';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AnalyticsModule,
    BullModule.registerQueue({ name: 'meta-sync' }),
    BullModule.registerQueue({ name: 'ai-jobs' }),
  ],
  controllers: [MetaAdsController],
  providers: [MetaAdsService, MetaAdsProcessor, MetaAdsCronService],
  exports: [MetaAdsService],
})
export class MetaAdsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { PortalAuthModule } from './modules/portal/portal-auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { MetaAdsModule } from './modules/meta-ads/meta-ads.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiInsightsModule } from './modules/ai-insights/ai-insights.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EmailModule } from './modules/email/email.module';
import { FilesModule } from './modules/files/files.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { BudgetModule } from './modules/budget/budget.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    PortalAuthModule,
    AuditLogModule,
    NotificationsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    MetaAdsModule,
    AnalyticsModule,
    AiInsightsModule,
    ReportsModule,
    EmailModule,
    FilesModule,
    SchedulerModule,
    ChatbotModule,
    BudgetModule,
  ],
})
export class AppModule {}

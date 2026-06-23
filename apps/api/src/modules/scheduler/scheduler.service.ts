import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // Runs every day at 09:00 UTC
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueTasks() {
    this.logger.log('Running overdue task check...');

    const overdueTasks = await this.prisma.tasks.findMany({
      where: {
        due_date: { lt: new Date() },
        status: { notIn: ['approved', 'done'] },
      },
      include: {
        task_assignees: {
          include: {
            user: { select: { id: true, email: true, full_name: true } },
          },
        },
        project: { select: { name: true } },
      },
    });

    if (!overdueTasks.length) {
      this.logger.log('No overdue tasks found');
      return;
    }

    this.logger.log(`Found ${overdueTasks.length} overdue task(s)`);

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    for (const task of overdueTasks) {
      const dueDate = task.due_date!.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const taskLink = `${frontendUrl}/dashboard/tasks?taskId=${task.id}`;

      for (const { user } of task.task_assignees) {
        await this.notificationsService.send({
          userId: user.id,
          type: 'task_status',
          message: `"${task.title}" is overdue (was due ${dueDate})`,
          link: `/dashboard/tasks?taskId=${task.id}`,
        });

        await this.emailService.sendTaskOverdue({
          toEmail: user.email,
          toName: user.full_name,
          taskTitle: task.title,
          projectName: task.project.name,
          dueDate,
          taskLink,
        });
      }
    }

    this.logger.log('Overdue task check complete');
  }
}

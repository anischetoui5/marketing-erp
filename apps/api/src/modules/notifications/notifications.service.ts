import { Injectable, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from './notifications.gateway';

export interface SendNotificationParams {
  userId?: string;
  clientUserId?: string;
  type: 'task_assigned' | 'task_status' | 'report_ready';
  message: string;
  link?: string;
  // Optional extra context for email enrichment
  emailMeta?: {
    taskTitle?: string;
    projectName?: string;
    reportLink?: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    @Optional() private readonly gateway: NotificationsGateway,
  ) {}

  async send(params: SendNotificationParams): Promise<void> {
    let created: { id: string } | null = null;
    try {
      created = await this.prisma.notifications.create({
        data: {
          user_id: params.userId ?? null,
          client_user_id: params.clientUserId ?? null,
          type: params.type,
          message: params.message,
          link: params.link ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to send notification: ${(err as Error).message}`);
    }

    // Real-time push via WebSocket
    if (created && params.userId && this.gateway) {
      this.gateway.emitToUser(params.userId, {
        id: created.id,
        type: params.type,
        message: params.message,
        link: params.link ?? null,
      });
    }

    // Fire email for key event types (non-blocking, errors are swallowed in EmailService)
    if (params.userId && params.emailMeta) {
      try {
        const user = await this.prisma.users.findUnique({
          where: { id: params.userId },
          select: { email: true, full_name: true },
        });
        if (!user) return;

        const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
        const taskLink = params.link ? `${frontendUrl}${params.link}` : frontendUrl;

        if (params.type === 'task_assigned' && params.emailMeta.taskTitle && params.emailMeta.projectName) {
          await this.emailService.sendTaskAssigned({
            toEmail: user.email,
            toName: user.full_name,
            taskTitle: params.emailMeta.taskTitle,
            projectName: params.emailMeta.projectName,
            taskLink,
          });
        } else if (params.type === 'report_ready' && params.emailMeta.projectName) {
          await this.emailService.sendReportReady({
            toEmail: user.email,
            toName: user.full_name,
            projectName: params.emailMeta.projectName,
            reportLink: params.emailMeta.reportLink ?? taskLink,
          });
        }
      } catch (err) {
        this.logger.error(`Failed to send notification email: ${(err as Error).message}`);
      }
    }
  }

  async findForUser(
    actorId: string,
    actorType: 'user' | 'client',
    query: { isRead?: boolean; page?: number; limit?: number },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where =
      actorType === 'client'
        ? { client_user_id: actorId, ...(query.isRead !== undefined ? { is_read: query.isRead } : {}) }
        : { user_id: actorId, ...(query.isRead !== undefined ? { is_read: query.isRead } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        link: n.link,
        isRead: n.is_read,
        createdAt: n.created_at.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markRead(id: string, actorId: string, actorType: 'user' | 'client') {
    const notification = await this.prisma.notifications.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');

    const owned =
      actorType === 'client'
        ? notification.client_user_id === actorId
        : notification.user_id === actorId;

    if (!owned) throw new ForbiddenException('Cannot mark another user\'s notification');

    await this.prisma.notifications.update({ where: { id }, data: { is_read: true } });
    return { message: 'Marked as read' };
  }

  async markAllRead(actorId: string, actorType: 'user' | 'client') {
    const where =
      actorType === 'client'
        ? { client_user_id: actorId, is_read: false }
        : { user_id: actorId, is_read: false };

    await this.prisma.notifications.updateMany({ where, data: { is_read: true } });
    return { message: 'All notifications marked as read' };
  }

  async unreadCount(actorId: string, actorType: 'user' | 'client'): Promise<{ count: number }> {
    const where =
      actorType === 'client'
        ? { client_user_id: actorId, is_read: false }
        : { user_id: actorId, is_read: false };

    const count = await this.prisma.notifications.count({ where });
    return { count };
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto } from './dto/create-report.dto';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('ai-jobs') private readonly aiJobsQueue: Queue,
  ) {}

  async create(dto: CreateReportDto, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const report = await this.prisma.reports.create({
      data: {
        project_id: dto.projectId,
        created_by: actor.sub,
        period_start: new Date(dto.periodStart),
        period_end: new Date(dto.periodEnd),
        status: 'generating',
      },
    });

    await this.aiJobsQueue.add(
      'generate-report',
      { reportId: report.id },
      { attempts: 2, backoff: { type: 'exponential', delay: 10000 } },
    );

    return { reportId: report.id, status: 'generating' };
  }

  async findAll(
    actor: JwtPayload,
    query: {
      projectId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.projectId) where.project_id = query.projectId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.reports.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project: { include: { client: { select: { company_name: true } } } },
          creator: { select: { full_name: true } },
        },
      }),
      this.prisma.reports.count({ where }),
    ]);

    return {
      items: items.map((r) => this.formatReport(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    actor: JwtPayload | { sub: string; type: 'client'; clientId: string },
  ) {
    const report = await this.prisma.reports.findUnique({
      where: { id },
      include: {
        project: { include: { client: true } },
        creator: { select: { full_name: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');

    if ((actor as { type?: string }).type === 'client') {
      const clientActor = actor as { clientId: string };
      if (
        !report.shared_with_client ||
        report.project.client_id !== clientActor.clientId
      ) {
        throw new ForbiddenException('Report not available');
      }
    }

    return this.formatReport(report);
  }

  async shareReport(id: string, actor: JwtPayload) {
    const report = await this.prisma.reports.findUnique({
      where: { id },
      include: {
        project: { include: { client: { include: { client_users: true } } } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'ready')
      throw new ForbiddenException('Report is not ready yet');

    const updated = await this.prisma.reports.update({
      where: { id },
      data: { shared_with_client: true, shared_at: new Date() },
      include: {
        project: { include: { client: true } },
        creator: { select: { full_name: true } },
      },
    });

    for (const cu of report.project.client.client_users) {
      await this.notificationsService.send({
        clientUserId: cu.id,
        type: 'report_ready',
        message: `A new performance report is ready for ${report.project.name}`,
        link: `/portal/dashboard/reports/${id}`,
      });
    }

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'report.shared',
      entityType: 'report',
      entityId: id,
    });

    return this.formatReport(updated);
  }

  private formatReport(r: {
    id: string;
    status: string;
    period_start: Date;
    period_end: Date;
    executive_summary: string | null;
    performance_overview: string | null;
    key_insights: unknown;
    recommendations: unknown;
    conclusion: string | null;
    shared_with_client: boolean;
    shared_at: Date | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cost_usd: number | null;
    created_at: Date;
    updated_at: Date;
    project: { id: string; name: string; client: { company_name: string } };
    creator: { full_name: string };
  }) {
    return {
      id: r.id,
      status: r.status,
      periodStart: r.period_start.toISOString().split('T')[0],
      periodEnd: r.period_end.toISOString().split('T')[0],
      executiveSummary: r.executive_summary,
      performanceOverview: r.performance_overview,
      keyInsights: r.key_insights,
      recommendations: r.recommendations,
      conclusion: r.conclusion,
      sharedWithClient: r.shared_with_client,
      sharedAt: r.shared_at?.toISOString() ?? null,
      promptTokens: r.prompt_tokens,
      completionTokens: r.completion_tokens,
      costUsd: r.cost_usd,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      project: { id: r.project.id, name: r.project.name },
      clientName: r.project.client.company_name,
      createdBy: r.creator.full_name,
    };
  }
}

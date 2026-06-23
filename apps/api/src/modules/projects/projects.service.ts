import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateProjectDto, actor: JwtPayload) {
    const client = await this.prisma.clients.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) throw new NotFoundException('Client not found');
    if (client.is_archived) throw new BadRequestException('Client is archived');

    const project = await this.prisma.projects.create({
      data: {
        client_id: dto.clientId,
        name: dto.name,
        objective: dto.objective,
        start_date: dto.startDate ? new Date(dto.startDate) : null,
        end_date: dto.endDate ? new Date(dto.endDate) : null,
        budget_total: dto.budgetTotal ?? null,
        budget_currency: dto.budgetCurrency ?? 'USD',
        meta_ads_account_id: dto.metaAdsAccountId ?? null,
        created_by: actor.sub,
      },
      include: { client: { select: { id: true, company_name: true } } },
    });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      newState: { name: project.name, clientId: project.client_id },
    });

    return this.formatProject(project);
  }

  async findAll(
    actor: JwtPayload,
    query: {
      clientId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const isAgent = ['marketing_agent', 'production_agent'].includes(
      actor.role,
    );

    const where: Record<string, unknown> = {};
    if (query.clientId) where.client_id = query.clientId;
    if (query.status) where.status = query.status;

    if (isAgent) {
      where.project_users = { some: { user_id: actor.sub } };
    }

    const [items, total] = await Promise.all([
      this.prisma.projects.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { client: { select: { id: true, company_name: true } } },
      }),
      this.prisma.projects.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatProject(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, company_name: true } },
        project_users: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                role: true,
                department: true,
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const isAgent = ['marketing_agent', 'production_agent'].includes(
      actor.role,
    );
    if (isAgent) {
      const isMember = project.project_users.some(
        (pu) => pu.user_id === actor.sub,
      );
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    return {
      ...this.formatProject(project),
      team: project.project_users.map((pu) => ({
        id: pu.user.id,
        fullName: pu.user.full_name,
        email: pu.user.email,
        role: pu.user.role,
        department: pu.user.department,
        addedAt: pu.created_at.toISOString(),
      })),
    };
  }

  async update(id: string, dto: UpdateProjectDto, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (dto.status === 'archived') {
      const activeTasksCount = await this.prisma.tasks.count({
        where: { project_id: id, status: { notIn: ['done'] } },
      });
      if (activeTasksCount > 0) {
        throw new BadRequestException(
          'Cannot archive project with active tasks',
        );
      }
    }

    const updated = await this.prisma.projects.update({
      where: { id },
      data: {
        name: dto.name,
        objective: dto.objective,
        status: dto.status,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        end_date: dto.endDate ? new Date(dto.endDate) : undefined,
        budget_total: dto.budgetTotal,
        budget_currency: dto.budgetCurrency,
        meta_ads_account_id: dto.metaAdsAccountId,
      },
      include: { client: { select: { id: true, company_name: true } } },
    });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'project.updated',
      entityType: 'project',
      entityId: id,
      previousState: { status: project.status, name: project.name },
      newState: { status: updated.status, name: updated.name },
    });

    return this.formatProject(updated);
  }

  async remove(id: string, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'draft') {
      throw new BadRequestException('Only draft projects can be deleted');
    }

    await this.prisma.projects.delete({ where: { id } });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'project.deleted',
      entityType: 'project',
      entityId: id,
      previousState: { name: project.name, status: project.status },
    });

    return { message: 'Project deleted' };
  }

  async addTeamMembers(id: string, userIds: string[], actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project_users.createMany({
      data: userIds.map((userId) => ({ project_id: id, user_id: userId })),
      skipDuplicates: true,
    });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'project.team_updated',
      entityType: 'project',
      entityId: id,
      newState: { addedUserIds: userIds },
    });

    return this.getTeam(id);
  }

  async removeTeamMember(id: string, userId: string, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project_users.deleteMany({
      where: { project_id: id, user_id: userId },
    });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'project.team_updated',
      entityType: 'project',
      entityId: id,
      newState: { removedUserId: userId },
    });

    return this.getTeam(id);
  }

  async getTeam(id: string) {
    const members = await this.prisma.project_users.findMany({
      where: { project_id: id },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });
    return {
      projectId: id,
      team: members.map((m) => ({
        id: m.user.id,
        fullName: m.user.full_name,
        email: m.user.email,
        role: m.user.role,
        department: m.user.department,
        addedAt: m.created_at.toISOString(),
      })),
    };
  }

  private formatProject(p: {
    id: string;
    name: string;
    objective: string;
    status: string;
    start_date: Date | null;
    end_date: Date | null;
    budget_total: unknown;
    budget_currency: string;
    meta_ads_account_id: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    client?: { id: string; company_name: string };
  }) {
    return {
      id: p.id,
      name: p.name,
      objective: p.objective,
      status: p.status,
      startDate: p.start_date?.toISOString() ?? null,
      endDate: p.end_date?.toISOString() ?? null,
      budgetTotal: p.budget_total ? Number(p.budget_total) : null,
      budgetCurrency: p.budget_currency,
      metaAdsAccountId: p.meta_ads_account_id,
      createdBy: p.created_by,
      createdAt: p.created_at.toISOString(),
      updatedAt: p.updated_at.toISOString(),
      client: p.client
        ? { id: p.client.id, companyName: p.client.company_name }
        : undefined,
    };
  }
}

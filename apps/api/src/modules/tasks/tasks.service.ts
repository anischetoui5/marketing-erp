import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import type { JwtPayload } from '../auth/auth.guard';
import { task_status } from '@prisma/client';

// Valid transitions: from → allowed tos (includes backwards)
const VALID_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'todo'],
  review: ['approved', 'revision', 'in_progress'],
  revision: ['review', 'in_progress'],
  approved: ['done', 'review'],
  done: ['approved'],
};

// Role → transitions allowed (forward + backward)
const ROLE_TRANSITIONS: Record<string, [string, string][]> = {
  marketing_agent: [
    ['todo', 'in_progress'],
    ['in_progress', 'review'],
    ['in_progress', 'todo'],
    ['revision', 'review'],
    ['revision', 'in_progress'],
    ['review', 'in_progress'],
  ],
  production_agent: [
    ['todo', 'in_progress'],
    ['in_progress', 'review'],
    ['in_progress', 'todo'],
    ['revision', 'review'],
    ['revision', 'in_progress'],
    ['review', 'in_progress'],
  ],
  marketing_manager: [
    ['review', 'approved'],
    ['review', 'revision'],
    ['review', 'in_progress'],
    ['approved', 'done'],
    ['approved', 'review'],
    ['done', 'approved'],
  ],
  production_manager: [
    ['review', 'approved'],
    ['review', 'revision'],
    ['review', 'in_progress'],
    ['approved', 'done'],
    ['approved', 'review'],
    ['done', 'approved'],
  ],
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, actor: JwtPayload) {
    const project = await this.getAccessibleProject(dto.projectId, actor);
    if (!project)
      throw new NotFoundException('Project not found or access denied');

    // Managers can only create tasks for their department
    if (actor.role === 'marketing_manager' && dto.department !== 'marketing') {
      throw new ForbiddenException(
        'Marketing manager can only create marketing tasks',
      );
    }
    if (
      actor.role === 'production_manager' &&
      dto.department !== 'production'
    ) {
      throw new ForbiddenException(
        'Production manager can only create production tasks',
      );
    }

    const task = await this.prisma.tasks.create({
      data: {
        project_id: dto.projectId,
        title: dto.title,
        description: dto.description ?? null,
        department: dto.department,
        priority: dto.priority ?? 'medium',
        due_date: dto.dueDate ? new Date(dto.dueDate) : null,
        created_by: actor.sub,
      },
    });

    if (dto.assigneeIds?.length) {
      await this.prisma.task_assignees.createMany({
        data: dto.assigneeIds.map((uid) => ({
          task_id: task.id,
          user_id: uid,
        })),
        skipDuplicates: true,
      });

      // Notify each assignee
      const projectForEmail = await this.prisma.projects.findUnique({
        where: { id: dto.projectId },
        select: { name: true },
      });
      await Promise.all(
        dto.assigneeIds.map((uid) =>
          this.notificationsService.send({
            userId: uid,
            type: 'task_assigned',
            message: `You were assigned to "${task.title}"`,
            link: `/dashboard/tasks?taskId=${task.id}`,
            emailMeta: {
              taskTitle: task.title,
              projectName: projectForEmail?.name ?? '',
            },
          }),
        ),
      );
    }

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      newState: { title: task.title, projectId: dto.projectId },
    });

    return this.findOne(task.id, actor);
  }

  async findAll(
    actor: JwtPayload,
    query: {
      projectId?: string;
      status?: string;
      priority?: string;
      department?: string;
      assigneeId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 30);
    const skip = (page - 1) * limit;
    const isAgent = ['marketing_agent', 'production_agent'].includes(
      actor.role,
    );

    const where: Record<string, unknown> = {};
    if (query.projectId) where.project_id = query.projectId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.department) where.department = query.department;
    if (query.assigneeId) {
      where.task_assignees = { some: { user_id: query.assigneeId } };
    }
    if (isAgent) {
      where.task_assignees = { some: { user_id: actor.sub } };
    }

    const [items, total] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: { select: { company_name: true } },
            },
          },
          task_assignees: {
            include: {
              user: { select: { id: true, full_name: true, role: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.tasks.count({ where }),
    ]);

    return {
      items: items.map((t) => this.formatTask(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { company_name: true } },
          },
        },
        task_assignees: {
          include: {
            user: { select: { id: true, full_name: true, role: true } },
          },
        },
        attachments: {
          orderBy: { created_at: 'asc' },
          include: { uploader: { select: { id: true, full_name: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isAgent = ['marketing_agent', 'production_agent'].includes(
      actor.role,
    );
    if (isAgent) {
      const isAssigned = task.task_assignees.some(
        (a) => a.user_id === actor.sub,
      );
      if (!isAssigned) throw new ForbiddenException('Access denied');
    }

    return this.formatTask(task);
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({
      where: { id },
      include: { task_assignees: { select: { user_id: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const from = task.status;
    const to = dto.status;

    // Check valid workflow transition
    if (!VALID_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Invalid transition: ${from} → ${to}`);
    }

    // Check role permission
    if (actor.role !== 'admin') {
      const allowed = ROLE_TRANSITIONS[actor.role] ?? [];
      const canDo = allowed.some(([f, t]) => f === from && t === to);
      if (!canDo) {
        throw new ForbiddenException(
          `Your role cannot move a task from ${from} to ${to}`,
        );
      }
    }

    const updateData: { status: task_status; revision_count?: number } = {
      status: to,
    };
    if (to === 'revision') updateData.revision_count = task.revision_count + 1;

    const updated = await this.prisma.tasks.update({
      where: { id },
      data: updateData,
    });

    // Notify all assignees
    await Promise.all(
      task.task_assignees.map((a) =>
        this.notificationsService.send({
          userId: a.user_id,
          type: 'task_status',
          message: `Task "${task.title}" moved to ${to.replace('_', ' ')}`,
          link: `/dashboard/tasks?taskId=${task.id}`,
        }),
      ),
    );

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'task.status_changed',
      entityType: 'task',
      entityId: id,
      previousState: { status: from },
      newState: { status: to },
    });

    return {
      id: updated.id,
      status: updated.status,
      revisionCount: updated.revision_count,
    };
  }

  async update(id: string, dto: UpdateTaskDto, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.tasks.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        due_date: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    if (dto.assigneeIds !== undefined) {
      // Replace assignees
      await this.prisma.task_assignees.deleteMany({ where: { task_id: id } });
      if (dto.assigneeIds.length > 0) {
        await this.prisma.task_assignees.createMany({
          data: dto.assigneeIds.map((uid) => ({ task_id: id, user_id: uid })),
        });
        const proj = await this.prisma.projects.findUnique({
          where: { id: task.project_id },
          select: { name: true },
        });
        await Promise.all(
          dto.assigneeIds.map((uid) =>
            this.notificationsService.send({
              userId: uid,
              type: 'task_assigned',
              message: `You were assigned to "${task.title}"`,
              link: `/dashboard/tasks?taskId=${task.id}`,
              emailMeta: {
                taskTitle: task.title,
                projectName: proj?.name ?? '',
              },
            }),
          ),
        );
      }
    }

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'task.updated',
      entityType: 'task',
      entityId: id,
    });

    return this.findOne(id, actor);
  }

  async submitForReview(id: string, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    if (!['approved', 'done'].includes(task.status)) {
      throw new BadRequestException(
        'Task must be in approved or done status to submit for client review',
      );
    }
    if (task.client_approval === 'pending') {
      throw new BadRequestException('Task is already pending client review');
    }

    await this.prisma.tasks.update({
      where: { id },
      data: { client_approval: 'pending', client_rejection_comment: null },
    });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'task.submitted_for_review',
      entityType: 'task',
      entityId: id,
    });

    return this.findOne(id, actor);
  }

  async remove(id: string, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'todo') {
      throw new BadRequestException('Only tasks in todo status can be deleted');
    }

    await this.prisma.tasks.delete({ where: { id } });

    await this.auditLogService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'task.deleted',
      entityType: 'task',
      entityId: id,
    });

    return { message: 'Task deleted' };
  }

  private async getAccessibleProject(projectId: string, actor: JwtPayload) {
    const isAgent = ['marketing_agent', 'production_agent'].includes(
      actor.role,
    );
    return this.prisma.projects.findFirst({
      where: {
        id: projectId,
        ...(isAgent ? { project_users: { some: { user_id: actor.sub } } } : {}),
      },
    });
  }

  private formatTask(t: {
    id: string;
    title: string;
    description: string | null;
    department: string;
    status: string;
    priority: string;
    due_date: Date | null;
    revision_count: number;
    project_id: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    client_approval?: string;
    client_rejection_comment?: string | null;
    client_reviewed_at?: Date | null;
    project?: { id: string; name: string; client?: { company_name: string } };
    task_assignees?: {
      user_id: string;
      user: { id: string; full_name: string; role: string };
    }[];
    attachments?: {
      id: string;
      filename: string;
      file_size: number;
      mime_type: string;
      created_at: Date;
      uploader?: { id: string; full_name: string } | null;
    }[];
    _count?: { comments: number };
  }) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      department: t.department,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date?.toISOString() ?? null,
      revisionCount: t.revision_count,
      projectId: t.project_id,
      createdBy: t.created_by,
      createdAt: t.created_at.toISOString(),
      updatedAt: t.updated_at.toISOString(),
      clientApproval: t.client_approval ?? 'none',
      clientRejectionComment: t.client_rejection_comment ?? null,
      clientReviewedAt: t.client_reviewed_at?.toISOString() ?? null,
      project: t.project
        ? {
            id: t.project.id,
            name: t.project.name,
            clientName: t.project.client?.company_name,
          }
        : undefined,
      assignees: (t.task_assignees ?? []).map((a) => ({
        id: a.user.id,
        fullName: a.user.full_name,
        role: a.user.role,
      })),
      attachments: (t.attachments ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        fileSize: a.file_size,
        mimeType: a.mime_type,
        createdAt: a.created_at.toISOString(),
        uploadedBy: a.uploader
          ? { id: a.uploader.id, fullName: a.uploader.full_name }
          : null,
      })),
      commentsCount: t._count?.comments ?? 0,
    };
  }
}

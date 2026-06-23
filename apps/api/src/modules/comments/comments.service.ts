import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, dto: CreateCommentDto, actor: JwtPayload) {
    const task = await this.prisma.tasks.findUnique({
      where: { id: taskId },
      include: { project: { include: { project_users: { select: { user_id: true } } } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isAgent = ['marketing_agent', 'production_agent'].includes(actor.role);
    if (isAgent) {
      const inProject = task.project.project_users.some((pu) => pu.user_id === actor.sub);
      const isAssignee = await this.prisma.task_assignees.findFirst({
        where: { task_id: taskId, user_id: actor.sub },
      });
      if (!inProject && !isAssignee) throw new ForbiddenException('Access denied');
    }

    const comment = await this.prisma.task_comments.create({
      data: { task_id: taskId, author_id: actor.sub, body: dto.body },
      include: {
        author: { select: { id: true, full_name: true, role: true } },
      },
    });

    return this.formatComment(comment);
  }

  async findAll(taskId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const task = await this.prisma.tasks.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const [items, total] = await Promise.all([
      this.prisma.task_comments.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
        include: { author: { select: { id: true, full_name: true, role: true } } },
      }),
      this.prisma.task_comments.count({ where: { task_id: taskId } }),
    ]);

    return {
      items: items.map((c) => this.formatComment(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(taskId: string, commentId: string, actor: JwtPayload) {
    const comment = await this.prisma.task_comments.findUnique({ where: { id: commentId } });
    if (!comment || comment.task_id !== taskId) throw new NotFoundException('Comment not found');

    if (actor.role !== 'admin' && comment.author_id !== actor.sub) {
      throw new ForbiddenException('Only the author or admin can delete this comment');
    }

    await this.prisma.task_comments.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }

  private formatComment(c: {
    id: string; body: string; created_at: Date;
    author: { id: string; full_name: string; role: string };
  }) {
    return {
      id: c.id,
      body: c.body,
      createdAt: c.created_at.toISOString(),
      author: { id: c.author.id, fullName: c.author.full_name, role: c.author.role },
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientJwtAuthGuard, ClientJwtPayload } from './portal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewTaskDto } from './dto/review-task.dto';

@ApiTags('portal-projects')
@ApiBearerAuth()
@UseGuards(ClientJwtAuthGuard)
@Controller('api/portal/projects')
export class PortalProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get projects for the authenticated client' })
  async findAll(@CurrentUser() user: ClientJwtPayload) {
    const projects = await this.prisma.projects.findMany({
      where: {
        client_id: user.clientId,
        status: { in: ['active', 'paused', 'completed'] },
      },
      orderBy: { created_at: 'desc' },
      include: { client: { select: { id: true, company_name: true } } },
    });

    return {
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        objective: p.objective,
        status: p.status,
        startDate: p.start_date?.toISOString() ?? null,
        endDate: p.end_date?.toISOString() ?? null,
        budgetTotal: p.budget_total ? Number(p.budget_total) : null,
        budgetCurrency: p.budget_currency,
        createdAt: p.created_at.toISOString(),
        client: { id: p.client.id, companyName: p.client.company_name },
      })),
    };
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'Get shared reports for a project' })
  async findReports(
    @Param('id') id: string,
    @CurrentUser() user: ClientJwtPayload,
  ) {
    const reports = await this.prisma.reports.findMany({
      where: {
        project_id: id,
        shared_with_client: true,
        project: { client_id: user.clientId },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });

    return {
      data: reports.map((r) => ({
        id: r.id,
        status: r.status,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        sharedAt: r.shared_at?.toISOString() ?? null,
        createdAt: r.created_at.toISOString(),
        project: { id: r.project.id, name: r.project.name },
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project detail with approved/done tasks' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: ClientJwtPayload,
  ) {
    const project = await this.prisma.projects.findFirst({
      where: { id, client_id: user.clientId },
      include: { client: { select: { id: true, company_name: true } } },
    });

    if (!project) {
      return { data: null };
    }

    const tasks = await this.prisma.tasks.findMany({
      where: {
        project_id: id,
        status: { in: ['approved', 'done'] },
        client_approval: { not: 'none' },
      },
      orderBy: { updated_at: 'desc' },
      include: {
        task_assignees: {
          include: {
            user: { select: { id: true, full_name: true, role: true } },
          },
        },
      },
    });

    return {
      data: {
        id: project.id,
        name: project.name,
        objective: project.objective,
        status: project.status,
        startDate: project.start_date?.toISOString() ?? null,
        endDate: project.end_date?.toISOString() ?? null,
        budgetTotal: project.budget_total ? Number(project.budget_total) : null,
        budgetCurrency: project.budget_currency,
        createdAt: project.created_at.toISOString(),
        client: {
          id: project.client.id,
          companyName: project.client.company_name,
        },
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          department: t.department,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date?.toISOString() ?? null,
          clientApproval: t.client_approval,
          clientRejectionComment: t.client_rejection_comment,
          clientReviewedAt: t.client_reviewed_at?.toISOString() ?? null,
          assignees: t.task_assignees.map((a) => ({
            id: a.user.id,
            fullName: a.user.full_name,
            role: a.user.role,
          })),
        })),
      },
    };
  }

  @Post(':projectId/tasks/:taskId/review')
  @ApiOperation({
    summary: 'Approve or reject a task submitted for client review',
  })
  async reviewTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() user: ClientJwtPayload,
  ) {
    if (dto.decision === 'client_rejected' && !dto.comment?.trim()) {
      throw new BadRequestException(
        'A rejection comment is required when rejecting a task',
      );
    }

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, project_id: projectId },
      include: { project: { select: { client_id: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.project.client_id !== user.clientId) {
      throw new NotFoundException('Task not found');
    }
    if (task.client_approval !== 'pending') {
      throw new BadRequestException('Task is not pending client review');
    }

    await this.prisma.tasks.update({
      where: { id: taskId },
      data: {
        client_approval: dto.decision,
        client_rejection_comment:
          dto.decision === 'client_rejected' ? dto.comment : null,
        client_reviewed_by: user.sub,
        client_reviewed_at: new Date(),
      },
    });

    return {
      data: {
        taskId,
        decision: dto.decision,
        comment: dto.decision === 'client_rejected' ? dto.comment : null,
      },
    };
  }
}

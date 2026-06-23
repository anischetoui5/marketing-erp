import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetEntryDto } from './dto/create-budget-entry.dto';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBudgetEntryDto, actor: JwtPayload) {
    const project = await this.prisma.projects.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const entry = await this.prisma.budget_entries.create({
      data: {
        project_id: dto.projectId,
        created_by: actor.sub,
        amount: dto.amount,
        category: dto.category,
        description: dto.description ?? null,
        entry_date: new Date(dto.entryDate),
      },
      include: { creator: { select: { id: true, full_name: true } } },
    });

    return this.format(entry);
  }

  async findForProject(projectId: string) {
    const entries = await this.prisma.budget_entries.findMany({
      where: { project_id: projectId },
      orderBy: { entry_date: 'desc' },
      include: { creator: { select: { id: true, full_name: true } } },
    });
    return entries.map((e) => this.format(e));
  }

  async getSummary(projectId: string) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId },
      select: { budget_total: true, budget_currency: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const entries = await this.prisma.budget_entries.findMany({ where: { project_id: projectId } });

    const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    const budgetTotal = project.budget_total ? Number(project.budget_total) : null;

    const byCategory: Record<string, number> = {};
    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
    }

    return {
      budgetTotal,
      currency: project.budget_currency,
      totalSpent: Math.round(totalSpent * 100) / 100,
      remaining: budgetTotal !== null ? Math.round((budgetTotal - totalSpent) * 100) / 100 : null,
      percentUsed: budgetTotal ? Math.round((totalSpent / budgetTotal) * 100) : null,
      byCategory,
    };
  }

  async remove(id: string, actor: JwtPayload) {
    const entry = await this.prisma.budget_entries.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Budget entry not found');
    if (entry.created_by !== actor.sub && actor.role !== 'admin') {
      throw new ForbiddenException('Cannot delete another user\'s budget entry');
    }
    await this.prisma.budget_entries.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  private format(e: {
    id: string; project_id: string; amount: { toString(): string }; category: string;
    description: string | null; entry_date: Date; created_at: Date;
    creator?: { id: string; full_name: string } | null;
  }) {
    return {
      id: e.id,
      projectId: e.project_id,
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      entryDate: e.entry_date.toISOString().split('T')[0],
      createdAt: e.created_at.toISOString(),
      createdBy: e.creator ? { id: e.creator.id, fullName: e.creator.full_name } : null,
    };
  }
}

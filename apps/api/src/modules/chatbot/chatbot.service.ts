import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.guard';
import type { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  async chat(
    dto: SendMessageDto,
    actor: JwtPayload,
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
    const context = await this.buildContext(actor);
    const systemPrompt = this.buildSystemPrompt(actor, context);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: dto.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return {
      reply,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  private async buildContext(actor: JwtPayload) {
    const [projects, overdueTasks, reviewTasks] = await Promise.all([
      this.prisma.projects.findMany({
        where: {
          status: { in: ['active', 'draft'] },
          ...(['marketing_agent', 'production_agent'].includes(actor.role)
            ? { project_users: { some: { user_id: actor.sub } } }
            : {}),
        },
        select: {
          name: true,
          status: true,
          client: { select: { company_name: true } },
          _count: { select: { tasks: true } },
        },
        take: 10,
      }),
      this.prisma.tasks.findMany({
        where: {
          due_date: { lt: new Date() },
          status: { notIn: ['approved', 'done'] },
          ...(['marketing_agent', 'production_agent'].includes(actor.role)
            ? { task_assignees: { some: { user_id: actor.sub } } }
            : {}),
        },
        select: {
          title: true,
          priority: true,
          due_date: true,
          project: { select: { name: true } },
        },
        take: 5,
        orderBy: { due_date: 'asc' },
      }),
      this.prisma.tasks.findMany({
        where: {
          status: 'review',
          ...(['marketing_agent', 'production_agent'].includes(actor.role)
            ? { task_assignees: { some: { user_id: actor.sub } } }
            : {}),
        },
        select: {
          title: true,
          priority: true,
          project: { select: { name: true } },
        },
        take: 5,
      }),
    ]);

    return { projects, overdueTasks, reviewTasks };
  }

  private buildSystemPrompt(
    actor: JwtPayload,
    ctx: {
      projects: {
        name: string;
        status: string;
        client: { company_name: string } | null;
        _count: { tasks: number };
      }[];
      overdueTasks: {
        title: string;
        priority: string;
        due_date: Date | null;
        project: { name: string } | null;
      }[];
      reviewTasks: {
        title: string;
        priority: string;
        project: { name: string } | null;
      }[];
    },
  ): string {
    const projectList = ctx.projects.length
      ? ctx.projects
          .map(
            (p) =>
              `  • ${p.name} (${p.status}) — client: ${p.client?.company_name ?? 'N/A'}, ${p._count.tasks} tasks`,
          )
          .join('\n')
      : '  None';

    const overdueList = ctx.overdueTasks.length
      ? ctx.overdueTasks
          .map(
            (t) =>
              `  • "${t.title}" [${t.priority}] in ${t.project?.name ?? '?'} — overdue since ${t.due_date?.toLocaleDateString() ?? '?'}`,
          )
          .join('\n')
      : '  None';

    const reviewList = ctx.reviewTasks.length
      ? ctx.reviewTasks
          .map(
            (t) =>
              `  • "${t.title}" [${t.priority}] in ${t.project?.name ?? '?'}`,
          )
          .join('\n')
      : '  None';

    return `You are an intelligent assistant built into MarketingERP — a project management platform for marketing agencies.

You are talking to ${actor.email}, who has the role: ${actor.role.replace(/_/g, ' ')}.

Here is their current workspace context:

ACTIVE / DRAFT PROJECTS:
${projectList}

OVERDUE TASKS (need attention):
${overdueList}

TASKS AWAITING REVIEW:
${reviewList}

Your job is to help the user manage their work. You can:
- Summarise the state of their projects and tasks
- Suggest priorities based on what's overdue or in review
- Answer questions about marketing strategy, campaign optimisation, and ad performance
- Give advice on workflow, team coordination, and task management
- Help draft content, briefs, or reports

Be concise, professional, and specific to their actual data when relevant.
Do NOT make up data that is not in the context above.
Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
}

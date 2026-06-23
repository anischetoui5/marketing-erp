import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(projectId: string) {
    const insights = await this.prisma.ai_insights.findMany({
      where: { project_id: projectId },
      orderBy: { generated_at: 'desc' },
    });
    return insights.map((i) => this.format(i));
  }

  async getLatestInsight(projectId: string) {
    const insight = await this.prisma.ai_insights.findFirst({
      where: { project_id: projectId, failed: false },
      orderBy: { generated_at: 'desc' },
    });
    if (!insight) return null;
    return this.format(insight);
  }

  private format(i: {
    id: string;
    summary: string | null;
    insights: unknown;
    recommendations: unknown;
    generated_at: Date;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cost_usd: number | null;
    failed: boolean;
    error_msg: string | null;
  }) {
    return {
      id: i.id,
      summary: i.summary,
      insights: i.insights,
      recommendations: i.recommendations,
      generatedAt: i.generated_at.toISOString(),
      promptTokens: i.prompt_tokens,
      completionTokens: i.completion_tokens,
      costUsd: i.cost_usd,
      failed: i.failed,
      errorMsg: i.error_msg,
    };
  }
}

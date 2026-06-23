import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface GenerateInsightPayload {
  projectId: string;
  syncJobId: string;
}
interface GenerateReportPayload {
  reportId: string;
}

@Processor('ai-jobs')
export class AiInsightsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiInsightsProcessor.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'generate-insight':
        await this.handleGenerateInsight(job.data as GenerateInsightPayload);
        break;
      case 'generate-report':
        await this.handleGenerateReport(job.data as GenerateReportPayload);
        break;
      default:
        this.logger.warn(`Unknown ai-jobs type: ${job.name}`);
    }
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  private async handleGenerateInsight(
    data: GenerateInsightPayload,
  ): Promise<void> {
    const { projectId, syncJobId } = data;
    const insightRow = await this.prisma.ai_insights.create({
      data: { project_id: projectId, sync_job_id: syncJobId, failed: false },
    });

    try {
      const project = await this.prisma.projects.findUnique({
        where: { id: projectId },
        include: { client: true },
      });
      if (!project) throw new Error('Project not found');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const records = await this.prisma.analytics_records.findMany({
        where: { project_id: projectId, record_date: { gte: thirtyDaysAgo } },
        orderBy: { record_date: 'asc' },
      });

      if (!records.length) {
        await this.prisma.ai_insights.update({
          where: { id: insightRow.id },
          data: { failed: true, error_msg: 'No analytics data available' },
        });
        return;
      }

      const analyticsData = this.groupByCampaign(records);
      const startDate = records[0].record_date.toISOString().split('T')[0];
      const endDate = records[records.length - 1].record_date
        .toISOString()
        .split('T')[0];

      const prompt = `You are analyzing Meta Ads performance data for a marketing agency project.

Project: ${project.name}
Client: ${project.client.company_name}
Period: ${startDate} to ${endDate}

CAMPAIGN PERFORMANCE DATA:
${JSON.stringify(analyticsData, null, 2)}

Analyze this data and respond with ONLY a valid JSON object in this exact structure:
{
  "summary": "2-3 sentence executive summary of overall performance",
  "insights": [
    { "title": "insight title", "body": "detailed explanation" },
    { "title": "insight title", "body": "detailed explanation" },
    { "title": "insight title", "body": "detailed explanation" }
  ],
  "recommendations": [
    { "title": "recommendation title", "body": "actionable recommendation" },
    { "title": "recommendation title", "body": "actionable recommendation" }
  ]
}

Focus on: top performing campaigns, underperforming campaigns, budget efficiency, CTR trends, ROAS performance, and specific actionable improvements.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system:
          'You are an expert digital marketing analyst. Always respond in valid JSON only.',
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = this.parseJson(text) as {
        summary: string;
        insights: { title: string; body: string }[];
        recommendations: { title: string; body: string }[];
      };

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const costUsd = promptTokens * 0.000003 + completionTokens * 0.000015;

      await this.prisma.ai_insights.update({
        where: { id: insightRow.id },
        data: {
          summary: parsed.summary,
          insights: parsed.insights,
          recommendations: parsed.recommendations,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          cost_usd: costUsd,
          failed: false,
        },
      });

      // Notify marketing managers
      const managers = await this.prisma.project_users.findMany({
        where: { project_id: projectId },
        include: { user: { select: { id: true, role: true } } },
      });
      for (const pu of managers) {
        if (pu.user.role === 'marketing_manager' || pu.user.role === 'admin') {
          await this.notificationsService.send({
            userId: pu.user.id,
            type: 'report_ready',
            message: `New AI insights available for ${project.name}`,
            link: `/dashboard/projects/${projectId}?tab=analytics`,
          });
        }
      }
      this.logger.log(`AI insight generated for project ${projectId}`);
    } catch (err) {
      this.logger.error(`Insight generation failed: ${(err as Error).message}`);
      await this.prisma.ai_insights
        .update({
          where: { id: insightRow.id },
          data: {
            failed: true,
            error_msg: (err as Error).message,
            retry_count: { increment: 1 },
          },
        })
        .catch(() => {});
      throw err;
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  private async handleGenerateReport(
    data: GenerateReportPayload,
  ): Promise<void> {
    const { reportId } = data;
    try {
      const report = await this.prisma.reports.findUnique({
        where: { id: reportId },
        include: { project: { include: { client: true } } },
      });
      if (!report) throw new Error('Report not found');

      const [records, latestInsight] = await Promise.all([
        this.prisma.analytics_records.findMany({
          where: {
            project_id: report.project_id,
            record_date: {
              gte: report.period_start,
              lte: report.period_end,
            },
          },
        }),
        this.prisma.ai_insights.findFirst({
          where: { project_id: report.project_id, failed: false },
          orderBy: { generated_at: 'desc' },
        }),
      ]);

      const totals = records.reduce(
        (acc, r) => ({
          impressions: acc.impressions + r.impressions,
          clicks: acc.clicks + r.clicks,
          spend: acc.spend + r.spend,
          conversions: acc.conversions + r.conversions,
          conversionValue: acc.conversionValue + r.conversion_value,
        }),
        {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        },
      );
      const ctr = totals.impressions
        ? (totals.clicks / totals.impressions) * 100
        : null;
      const roas = totals.spend ? totals.conversionValue / totals.spend : null;

      const analyticsSummary = {
        ...totals,
        ctr,
        roas,
        recordCount: records.length,
      };
      const insightContext =
        latestInsight?.summary ?? 'No prior insights available.';

      const prompt = `You are writing a professional marketing performance report for a client.

Project: ${report.project.name}
Client: ${report.project.client.company_name}
Reporting Period: ${report.period_start.toISOString().split('T')[0]} to ${report.period_end.toISOString().split('T')[0]}

PERFORMANCE SUMMARY:
${JSON.stringify(analyticsSummary, null, 2)}

AI INSIGHTS CONTEXT:
${insightContext}

Write a professional client-facing report and respond with ONLY a valid JSON object:
{
  "executiveSummary": "Professional 3-4 sentence summary suitable for client",
  "performanceOverview": "2-3 paragraph detailed performance analysis",
  "keyInsights": [
    { "title": "insight title", "body": "client-friendly explanation" },
    { "title": "insight title", "body": "client-friendly explanation" },
    { "title": "insight title", "body": "client-friendly explanation" }
  ],
  "recommendations": [
    { "title": "recommendation title", "body": "strategic recommendation" },
    { "title": "recommendation title", "body": "strategic recommendation" }
  ],
  "conclusion": "2-3 sentence closing statement with forward-looking commentary"
}

Write in a professional but accessible tone. Avoid technical jargon. Use specific numbers from the data. Make it feel personalized for this client.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system:
          'You are an expert marketing consultant writing professional client reports. Always respond in valid JSON only.',
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = this.parseJson(text) as {
        executiveSummary: string;
        performanceOverview: string;
        keyInsights: { title: string; body: string }[];
        recommendations: { title: string; body: string }[];
        conclusion: string;
      };

      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const costUsd = promptTokens * 0.000003 + completionTokens * 0.000015;

      await this.prisma.reports.update({
        where: { id: reportId },
        data: {
          status: 'ready',
          executive_summary: parsed.executiveSummary,
          performance_overview: parsed.performanceOverview,
          key_insights: parsed.keyInsights,
          recommendations: parsed.recommendations,
          conclusion: parsed.conclusion,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          cost_usd: costUsd,
        },
      });
      this.logger.log(`Report ${reportId} generated successfully`);
    } catch (err) {
      this.logger.error(
        `Report generation failed for ${reportId}: ${(err as Error).message}`,
      );
      await this.prisma.reports
        .update({ where: { id: reportId }, data: { status: 'failed' } })
        .catch(() => {});
      throw err;
    }
  }

  private groupByCampaign(
    records: {
      campaign_id: string;
      campaign_name: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversion_value: number;
      ctr: number | null;
      roas: number | null;
    }[],
  ) {
    const map = new Map<
      string,
      {
        name: string;
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
        conversionValue: number;
      }
    >();
    for (const r of records) {
      const cur = map.get(r.campaign_id) ?? {
        name: r.campaign_name,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
      };
      map.set(r.campaign_id, {
        name: r.campaign_name,
        impressions: cur.impressions + r.impressions,
        clicks: cur.clicks + r.clicks,
        spend: cur.spend + r.spend,
        conversions: cur.conversions + r.conversions,
        conversionValue: cur.conversionValue + r.conversion_value,
      });
    }
    return Array.from(map.entries()).map(([id, d]) => ({
      campaignId: id,
      ...d,
      ctr: d.impressions ? (d.clicks / d.impressions) * 100 : null,
      roas: d.spend ? d.conversionValue / d.spend : null,
    }));
  }

  private parseJson(text: string): unknown {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in Claude response');
    return JSON.parse(match[0]);
  }
}

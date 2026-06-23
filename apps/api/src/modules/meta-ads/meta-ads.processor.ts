import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaAdsService } from './meta-ads.service';
import { calcKpis } from '../analytics/analytics.service';

interface SyncProjectPayload {
  projectId: string;
  syncJobId?: string;
  triggeredBy?: string;
}

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  conversions?: { action_type: string; value: string }[];
  conversion_values?: { action_type: string; value: string }[];
  date_start: string;
  date_stop: string;
}

@Processor('meta-sync')
export class MetaAdsProcessor extends WorkerHost {
  private readonly logger = new Logger(MetaAdsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaAdsService: MetaAdsService,
    @InjectQueue('ai-jobs') private readonly aiJobsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync-project':
        await this.handleSyncProject(job.data as SyncProjectPayload);
        break;
      case 'schedule-all':
        await this.metaAdsService.scheduleAll();
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSyncProject(data: SyncProjectPayload): Promise<void> {
    const { projectId } = data;
    let syncJobId = data.syncJobId;

    try {
      const project = await this.prisma.projects.findUnique({
        where: { id: projectId },
        include: { client: true },
      });

      if (
        !project ||
        project.status !== 'active' ||
        !project.meta_ads_account_id
      ) {
        this.logger.warn(
          `Skipping sync for project ${projectId}: not active or no account id`,
        );
        return;
      }

      if (!syncJobId) {
        const syncJob = await this.prisma.sync_jobs.create({
          data: { project_id: projectId, status: 'running' },
        });
        syncJobId = syncJob.id;
      }

      await this.prisma.sync_jobs.update({
        where: { id: syncJobId },
        data: { status: 'running', started_at: new Date() },
      });

      const token = await this.metaAdsService.getAccessToken();
      if (!token) throw new Error('No Meta access token configured');

      const accountId = project.meta_ads_account_id;
      const fields =
        'campaign_id,campaign_name,impressions,clicks,spend,reach,conversions,conversion_values';
      const url =
        `https://graph.facebook.com/v19.0/act_${accountId}/insights` +
        `?fields=${fields}&date_preset=last_30d&level=campaign&time_increment=1&access_token=${token}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Meta API error: ${err}`);
      }
      const body = (await res.json()) as { data: MetaInsightRow[] };

      for (const row of body.data ?? []) {
        const impressions = parseFloat(row.impressions ?? '0');
        const clicks = parseFloat(row.clicks ?? '0');
        const spend = parseFloat(row.spend ?? '0');
        const reach = parseFloat(row.reach ?? '0');
        const conversions = this.sumActions(row.conversions);
        const conversionValue = this.sumActions(row.conversion_values);

        const kpis = calcKpis(
          impressions,
          clicks,
          spend,
          conversions,
          conversionValue,
        );

        await this.prisma.analytics_records.upsert({
          where: {
            project_id_campaign_id_record_date: {
              project_id: projectId,
              campaign_id: row.campaign_id,
              record_date: new Date(row.date_start),
            },
          },
          update: {
            campaign_name: row.campaign_name,
            impressions,
            clicks,
            spend,
            reach,
            conversions,
            conversion_value: conversionValue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpa: kpis.cpa,
            roas: kpis.roas,
            cpm: kpis.cpm,
          },
          create: {
            project_id: projectId,
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            record_date: new Date(row.date_start),
            impressions,
            clicks,
            spend,
            reach,
            conversions,
            conversion_value: conversionValue,
            ctr: kpis.ctr,
            cpc: kpis.cpc,
            cpa: kpis.cpa,
            roas: kpis.roas,
            cpm: kpis.cpm,
          },
        });
      }

      await this.prisma.sync_jobs.update({
        where: { id: syncJobId },
        data: { status: 'succeeded', finished_at: new Date() },
      });

      this.logger.log(
        `Sync succeeded for project ${projectId}, ${body.data?.length ?? 0} records`,
      );

      await this.aiJobsQueue.add(
        'generate-insight',
        { projectId, syncJobId },
        { attempts: 2, backoff: { type: 'exponential', delay: 10000 } },
      );
    } catch (err) {
      this.logger.error(
        `Sync failed for project ${projectId}: ${(err as Error).message}`,
      );
      if (syncJobId) {
        await this.prisma.sync_jobs
          .update({
            where: { id: syncJobId },
            data: {
              status: 'failed',
              finished_at: new Date(),
              error_msg: (err as Error).message,
            },
          })
          .catch(() => {});
      }
      throw err;
    }
  }

  private sumActions(
    actions?: { action_type: string; value: string }[],
  ): number {
    if (!actions?.length) return 0;
    return actions.reduce((sum, a) => sum + parseFloat(a.value ?? '0'), 0);
  }
}

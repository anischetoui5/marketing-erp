import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('meta-sync') private readonly metaSyncQueue: Queue,
  ) {}

  getConnectUrl(): { authUrl: string } {
    const appId = this.config.get<string>('META_APP_ID', '');
    const redirectUri = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:3001/api/meta/callback',
    );
    const scopes = ['ads_read', 'ads_management'].join(',');
    const state = Buffer.from(Date.now().toString()).toString('base64');
    const authUrl =
      `https://www.facebook.com/dialog/oauth?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scopes}&state=${state}&response_type=code`;
    return { authUrl };
  }

  async handleCallback(code: string): Promise<string> {
    const appId = this.config.get<string>('META_APP_ID', '');
    const appSecret = this.config.get<string>('META_APP_SECRET', '');
    const redirectUri = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:3001/api/meta/callback',
    );

    const shortUrl =
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

    const res = await fetch(shortUrl);
    if (!res.ok) throw new BadRequestException('Failed to exchange code for token');
    const { access_token } = (await res.json()) as { access_token: string };

    const longUrl =
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${access_token}`;
    const longRes = await fetch(longUrl);
    if (!longRes.ok) throw new BadRequestException('Failed to exchange long-lived token');
    const { access_token: longToken } = (await longRes.json()) as { access_token: string };

    await this.prisma.system_config.upsert({
      where: { key: 'meta_access_token' },
      update: { value: longToken },
      create: { key: 'meta_access_token', value: longToken },
    });
    await this.prisma.system_config.upsert({
      where: { key: 'meta_connected_at' },
      update: { value: new Date().toISOString() },
      create: { key: 'meta_connected_at', value: new Date().toISOString() },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${frontendUrl}/dashboard?meta=connected`;
  }

  async getStatus(): Promise<{ connected: boolean; connectedAt?: string }> {
    const token = await this.prisma.system_config.findUnique({
      where: { key: 'meta_access_token' },
    });
    if (!token?.value) return { connected: false };
    const connectedAt = await this.prisma.system_config.findUnique({
      where: { key: 'meta_connected_at' },
    });
    return { connected: true, connectedAt: connectedAt?.value };
  }

  async getAccessToken(): Promise<string | null> {
    const row = await this.prisma.system_config.findUnique({
      where: { key: 'meta_access_token' },
    });
    return row?.value ?? null;
  }

  async startSync(
    projectId: string,
    actor: JwtPayload,
  ): Promise<{ message: string; syncJobId: string }> {
    const project = await this.prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'active') throw new BadRequestException('Project is not active');
    if (!project.meta_ads_account_id)
      throw new BadRequestException('Project has no Meta Ads Account ID configured');

    const running = await this.prisma.sync_jobs.findFirst({
      where: { project_id: projectId, status: 'running' },
    });
    if (running) throw new BadRequestException('A sync is already running for this project');

    const syncJob = await this.prisma.sync_jobs.create({
      data: { project_id: projectId, triggered_by: actor.sub, status: 'running' },
    });

    await this.metaSyncQueue.add(
      'sync-project',
      { projectId, syncJobId: syncJob.id, triggeredBy: actor.sub },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return { message: 'Sync started', syncJobId: syncJob.id };
  }

  async getSyncStatus(projectId: string) {
    const job = await this.prisma.sync_jobs.findFirst({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
    if (!job) return null;
    return this.formatSyncJob(job);
  }

  async getSyncHistory(projectId: string) {
    const jobs = await this.prisma.sync_jobs.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    return jobs.map((j) => this.formatSyncJob(j));
  }

  async scheduleAll(): Promise<void> {
    const projects = await this.prisma.projects.findMany({
      where: { status: 'active', meta_ads_account_id: { not: null } },
      select: { id: true },
    });
    for (const p of projects) {
      await this.metaSyncQueue.add(
        'sync-project',
        { projectId: p.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }
    this.logger.log(`Scheduled sync for ${projects.length} active project(s)`);
  }

  private formatSyncJob(j: {
    id: string;
    status: string;
    started_at: Date;
    finished_at: Date | null;
    error_msg: string | null;
    triggered_by: string | null;
    created_at: Date;
  }) {
    return {
      id: j.id,
      status: j.status,
      startedAt: j.started_at.toISOString(),
      finishedAt: j.finished_at?.toISOString() ?? null,
      errorMsg: j.error_msg,
      triggeredBy: j.triggered_by,
    };
  }
}

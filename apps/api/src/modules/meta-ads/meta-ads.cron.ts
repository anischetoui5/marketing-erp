import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MetaAdsService } from './meta-ads.service';

@Injectable()
export class MetaAdsCronService {
  private readonly logger = new Logger(MetaAdsCronService.name);

  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Cron('0 */6 * * *')
  async handleScheduledSync() {
    this.logger.log('Running scheduled sync for all active projects...');
    await this.metaAdsService.scheduleAll();
  }
}

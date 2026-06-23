import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function safeDiv(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

export function calcKpis(
  impressions: number,
  clicks: number,
  spend: number,
  conversions: number,
  conversionValue: number,
): {
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  cpm: number | null;
} {
  return {
    ctr:
      safeDiv(clicks, impressions) !== null
        ? (clicks / impressions) * 100
        : null,
    cpc: safeDiv(spend, clicks),
    cpa: safeDiv(spend, conversions),
    roas: safeDiv(conversionValue, spend),
    cpm: impressions ? (spend / impressions) * 1000 : null,
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    projectId: string,
    dateFrom?: string,
    dateTo?: string,
    campaignId?: string,
  ) {
    const where = this.buildWhere(projectId, dateFrom, dateTo, campaignId);

    const records = await this.prisma.analytics_records.findMany({ where });

    if (!records.length) {
      return this.emptySummary(projectId, dateFrom, dateTo);
    }

    const totals = records.reduce(
      (acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        spend: acc.spend + r.spend,
        conversions: acc.conversions + r.conversions,
        conversionValue: acc.conversionValue + r.conversion_value,
        reach: acc.reach + r.reach,
      }),
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
        reach: 0,
      },
    );

    const kpis = calcKpis(
      totals.impressions,
      totals.clicks,
      totals.spend,
      totals.conversions,
      totals.conversionValue,
    );

    const campaignIds = new Set(records.map((r) => r.campaign_id));

    return {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalSpend: Math.round(totals.spend * 100) / 100,
      totalConversions: totals.conversions,
      totalConversionValue: Math.round(totals.conversionValue * 100) / 100,
      totalReach: totals.reach,
      avgCtr: kpis.ctr !== null ? Math.round(kpis.ctr * 100) / 100 : null,
      avgCpc: kpis.cpc !== null ? Math.round(kpis.cpc * 100) / 100 : null,
      avgCpa: kpis.cpa !== null ? Math.round(kpis.cpa * 100) / 100 : null,
      avgRoas: kpis.roas !== null ? Math.round(kpis.roas * 100) / 100 : null,
      avgCpm: kpis.cpm !== null ? Math.round(kpis.cpm * 100) / 100 : null,
      campaignCount: campaignIds.size,
      dateRange: { from: dateFrom ?? null, to: dateTo ?? null },
    };
  }

  async getCampaigns(projectId: string, dateFrom?: string, dateTo?: string) {
    const where = this.buildWhere(projectId, dateFrom, dateTo);
    const records = await this.prisma.analytics_records.findMany({ where });

    const byCampaign = new Map<
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
      const cur = byCampaign.get(r.campaign_id) ?? {
        name: r.campaign_name,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
      };
      byCampaign.set(r.campaign_id, {
        name: r.campaign_name,
        impressions: cur.impressions + r.impressions,
        clicks: cur.clicks + r.clicks,
        spend: cur.spend + r.spend,
        conversions: cur.conversions + r.conversions,
        conversionValue: cur.conversionValue + r.conversion_value,
      });
    }

    const result = Array.from(byCampaign.entries()).map(([campaignId, d]) => {
      const kpis = calcKpis(
        d.impressions,
        d.clicks,
        d.spend,
        d.conversions,
        d.conversionValue,
      );
      return {
        campaignId,
        campaignName: d.name,
        impressions: d.impressions,
        clicks: d.clicks,
        spend: Math.round(d.spend * 100) / 100,
        ctr: kpis.ctr !== null ? Math.round(kpis.ctr * 100) / 100 : null,
        cpc: kpis.cpc !== null ? Math.round(kpis.cpc * 100) / 100 : null,
        cpa: kpis.cpa !== null ? Math.round(kpis.cpa * 100) / 100 : null,
        roas: kpis.roas !== null ? Math.round(kpis.roas * 100) / 100 : null,
        cpm: kpis.cpm !== null ? Math.round(kpis.cpm * 100) / 100 : null,
      };
    });

    return result.sort((a, b) => b.spend - a.spend);
  }

  async getDaily(
    projectId: string,
    dateFrom?: string,
    dateTo?: string,
    campaignId?: string,
  ) {
    const where = this.buildWhere(projectId, dateFrom, dateTo, campaignId);
    const records = await this.prisma.analytics_records.findMany({
      where,
      orderBy: { record_date: 'asc' },
    });

    const byDate = new Map<
      string,
      {
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
        conversionValue: number;
      }
    >();
    for (const r of records) {
      const dateKey = r.record_date.toISOString().split('T')[0];
      const cur = byDate.get(dateKey) ?? {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
      };
      byDate.set(dateKey, {
        impressions: cur.impressions + r.impressions,
        clicks: cur.clicks + r.clicks,
        spend: cur.spend + r.spend,
        conversions: cur.conversions + r.conversions,
        conversionValue: cur.conversionValue + r.conversion_value,
      });
    }

    return Array.from(byDate.entries()).map(([date, d]) => {
      const kpis = calcKpis(
        d.impressions,
        d.clicks,
        d.spend,
        d.conversions,
        d.conversionValue,
      );
      return {
        date,
        impressions: d.impressions,
        clicks: d.clicks,
        spend: Math.round(d.spend * 100) / 100,
        ctr: kpis.ctr !== null ? Math.round(kpis.ctr * 100) / 100 : null,
        roas: kpis.roas !== null ? Math.round(kpis.roas * 100) / 100 : null,
      };
    });
  }

  async getDashboardOverview(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const records = await this.prisma.analytics_records.findMany({
      where: { record_date: { gte: from } },
      orderBy: { record_date: 'asc' },
    });

    const byDate = new Map<
      string,
      {
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
      }
    >();
    for (const r of records) {
      const dateKey = r.record_date.toISOString().split('T')[0];
      const cur = byDate.get(dateKey) ?? {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
      };
      byDate.set(dateKey, {
        impressions: cur.impressions + r.impressions,
        clicks: cur.clicks + r.clicks,
        spend: cur.spend + r.spend,
        conversions: cur.conversions + r.conversions,
      });
    }

    return Array.from(byDate.entries()).map(([date, d]) => ({
      date,
      impressions: Math.round(d.impressions),
      clicks: Math.round(d.clicks),
      spend: Math.round(d.spend * 100) / 100,
      conversions: Math.round(d.conversions),
    }));
  }

  async getTopCampaigns(projectId: string) {
    const campaigns = await this.getCampaigns(projectId);
    const withRoas = campaigns.filter((c) => c.roas !== null);
    return {
      byRoas: [...withRoas]
        .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
        .slice(0, 5),
      bySpend: [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 5),
    };
  }

  private buildWhere(
    projectId: string,
    dateFrom?: string,
    dateTo?: string,
    campaignId?: string,
  ) {
    const where: Record<string, unknown> = { project_id: projectId };
    if (dateFrom || dateTo) {
      where.record_date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (campaignId) where.campaign_id = campaignId;
    return where;
  }

  private emptySummary(projectId: string, dateFrom?: string, dateTo?: string) {
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalSpend: 0,
      totalConversions: 0,
      totalConversionValue: 0,
      totalReach: 0,
      avgCtr: null,
      avgCpc: null,
      avgCpa: null,
      avgRoas: null,
      avgCpm: null,
      campaignCount: 0,
      dateRange: { from: dateFrom ?? null, to: dateTo ?? null },
    };
  }
}

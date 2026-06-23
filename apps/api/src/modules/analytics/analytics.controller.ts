import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({
    summary:
      'Aggregate daily spend/impressions/clicks across all projects (last N days)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default 30)',
  })
  async getDashboardOverview(@Query('days') days?: string) {
    return {
      data: await this.analyticsService.getDashboardOverview(
        days ? parseInt(days) : 30,
      ),
    };
  }

  @Get(':projectId/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'Get aggregated KPI summary for a project' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  async getSummary(
    @Param('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return {
      data: await this.analyticsService.getSummary(
        projectId,
        dateFrom,
        dateTo,
        campaignId,
      ),
    };
  }

  @Get(':projectId/campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'Get per-campaign KPI breakdown' })
  async getCampaigns(
    @Param('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return {
      data: await this.analyticsService.getCampaigns(
        projectId,
        dateFrom,
        dateTo,
      ),
    };
  }

  @Get(':projectId/daily')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'Get daily time-series data for charting' })
  async getDaily(
    @Param('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return {
      data: await this.analyticsService.getDaily(
        projectId,
        dateFrom,
        dateTo,
        campaignId,
      ),
    };
  }

  @Get(':projectId/top-campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Get top 5 campaigns by ROAS and by spend' })
  async getTopCampaigns(@Param('projectId') projectId: string) {
    return { data: await this.analyticsService.getTopCampaigns(projectId) };
  }
}

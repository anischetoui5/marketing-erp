import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiInsightsService } from './ai-insights.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('AI Insights')
@ApiBearerAuth()
@Controller('api/projects')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get(':projectId/insights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'List AI insights for a project' })
  async getInsights(@Param('projectId') projectId: string) {
    return { data: await this.aiInsightsService.getInsights(projectId) };
  }

  @Get(':projectId/insights/latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({
    summary: 'Get the latest successful AI insight for a project',
  })
  async getLatestInsight(@Param('projectId') projectId: string) {
    return { data: await this.aiInsightsService.getLatestInsight(projectId) };
  }
}

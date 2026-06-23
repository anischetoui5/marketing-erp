import { Controller, Get, Post, Query, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { MetaAdsService } from './meta-ads.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.guard';

@ApiTags('Meta Ads')
@ApiBearerAuth()
@Controller('api/meta')
export class MetaAdsController {
  constructor(private readonly metaAdsService: MetaAdsService) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get Meta OAuth URL' })
  getConnectUrl() {
    return { data: this.metaAdsService.getConnectUrl() };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Meta OAuth callback — redirects to dashboard' })
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    const redirectUrl = await this.metaAdsService.handleCallback(code);
    return res.redirect(redirectUrl);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get Meta connection status' })
  async getStatus() {
    return { data: await this.metaAdsService.getStatus() };
  }

  @Post('sync/:projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Trigger on-demand sync for a project' })
  async startSync(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return { data: await this.metaAdsService.startSync(projectId, actor) };
  }

  @Get('sync/:projectId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Get latest sync job status for a project' })
  async getSyncStatus(@Param('projectId') projectId: string) {
    return { data: await this.metaAdsService.getSyncStatus(projectId) };
  }

  @Get('sync/:projectId/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Get sync job history for a project' })
  async getSyncHistory(@Param('projectId') projectId: string) {
    return { data: await this.metaAdsService.getSyncHistory(projectId) };
  }
}

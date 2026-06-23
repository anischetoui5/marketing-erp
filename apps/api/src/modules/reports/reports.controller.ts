import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnyAuthGuard } from '../../common/guards/any-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Create and queue a new report' })
  async create(@Body() dto: CreateReportDto, @CurrentUser() actor: JwtPayload) {
    return { data: await this.reportsService.create(dto, actor) };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'List reports (paginated)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser() actor: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      data: await this.reportsService.findAll(actor, {
        projectId,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      }),
    };
  }

  @Get(':id')
  @UseGuards(AnyAuthGuard)
  @ApiOperation({ summary: 'Get a single report (internal or shared client)' })
  async findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return { data: await this.reportsService.findOne(id, req.user) };
  }

  @Patch(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Share a report with the client' })
  async share(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return { data: await this.reportsService.shareReport(id, actor) };
  }
}

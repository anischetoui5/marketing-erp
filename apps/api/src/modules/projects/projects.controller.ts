import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectTeamDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Create a project' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: JwtPayload) {
    const result = await this.projectsService.create(dto, user);
    return { data: result };
  }

  @Get()
  @Roles('admin', 'marketing_manager', 'marketing_agent', 'production_manager', 'production_agent')
  @ApiOperation({ summary: 'List projects (scoped by role)' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.projectsService.findAll(user, {
      clientId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { data: result };
  }

  @Get(':id')
  @Roles('admin', 'marketing_manager', 'marketing_agent', 'production_manager', 'production_agent')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.projectsService.findOne(id, user);
    return { data: result };
  }

  @Patch(':id')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Update project' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: JwtPayload) {
    const result = await this.projectsService.update(id, dto, user);
    return { data: result };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete draft project (admin only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.projectsService.remove(id, user);
    return { data: result };
  }

  @Post(':id/team')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Add team members to project' })
  async addTeam(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTeamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.projectsService.addTeamMembers(id, dto.userIds, user);
    return { data: result };
  }

  @Delete(':id/team/:userId')
  @Roles('admin', 'marketing_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove team member from project' })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.projectsService.removeTeamMember(id, userId, user);
    return { data: result };
  }

  @Get(':id/team')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Get project team members' })
  async getTeam(@Param('id') id: string) {
    const result = await this.projectsService.getTeam(id);
    return { data: result };
  }
}

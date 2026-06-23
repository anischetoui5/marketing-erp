import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALL_ROLES = [
  'admin',
  'marketing_manager',
  'marketing_agent',
  'production_manager',
  'production_agent',
] as const;

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('admin', 'marketing_manager', 'production_manager')
  @ApiOperation({ summary: 'Create a task' })
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayload) {
    const result = await this.tasksService.create(dto, user);
    return { data: result };
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List tasks (scoped by role)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('department') department?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.tasksService.findAll(user, {
      projectId,
      status,
      priority,
      department,
      assigneeId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { data: result };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.tasksService.findOne(id, user);
    return { data: result };
  }

  @Patch(':id/status')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update task status (role-based workflow)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.updateStatus(id, dto, user);
    return { data: result };
  }

  @Patch(':id/submit-for-review')
  @Roles('admin', 'marketing_manager', 'production_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit task for client review' })
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.submitForReview(id, user);
    return { data: result };
  }

  @Patch(':id')
  @Roles('admin', 'marketing_manager', 'production_manager')
  @ApiOperation({ summary: 'Update task details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.tasksService.update(id, dto, user);
    return { data: result };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete todo task (admin only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.tasksService.remove(id, user);
    return { data: result };
  }
}

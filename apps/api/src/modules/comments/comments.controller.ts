import {
  Controller,
  Get,
  Post,
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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
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

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Add a comment to a task' })
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.commentsService.create(taskId, dto, user);
    return { data: result };
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get comments for a task' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Param('taskId') taskId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.commentsService.findAll(taskId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { data: result };
  }

  @Delete(':commentId')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment (author or admin only)' })
  async remove(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.commentsService.remove(taskId, commentId, user);
    return { data: result };
  }
}

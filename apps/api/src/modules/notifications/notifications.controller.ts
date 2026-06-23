import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AnyAuthGuard, AnyAuthUser } from '../../common/guards/any-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AnyAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: AnyAuthUser,
    @Query('isRead') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const actorType = user.type === 'client' ? 'client' : 'user';
    const result = await this.notificationsService.findForUser(user.sub, actorType, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { data: result };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: AnyAuthUser) {
    const actorType = user.type === 'client' ? 'client' : 'user';
    const result = await this.notificationsService.unreadCount(user.sub, actorType);
    return { data: result };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: AnyAuthUser) {
    const actorType = user.type === 'client' ? 'client' : 'user';
    const result = await this.notificationsService.markAllRead(user.sub, actorType);
    return { data: result };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: AnyAuthUser) {
    const actorType = user.type === 'client' ? 'client' : 'user';
    const result = await this.notificationsService.markRead(id, user.sub, actorType);
    return { data: result };
  }
}

import {
  Controller, Post, Get, Delete,
  Param, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const ALL_ROLES = ['admin', 'marketing_manager', 'marketing_agent', 'production_manager', 'production_agent'] as const;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tasks/:taskId/attachments')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @Roles(...ALL_ROLES)
  @UseInterceptors(FileInterceptor('file', { storage: undefined })) // buffer storage
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a file attachment to a task (max 20 MB)' })
  async upload(
    @Param('taskId') taskId: string,
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_BYTES })] })) file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.filesService.upload(taskId, file, user);
    return { data: result };
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List attachments for a task' })
  async list(@Param('taskId') taskId: string) {
    const result = await this.filesService.listForTask(taskId);
    return { data: result };
  }

  @Get(':attachmentId/url')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get a presigned download URL (valid 1 hour)' })
  async getUrl(@Param('attachmentId') attachmentId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.filesService.getDownloadUrl(attachmentId, user);
    return { data: result };
  }

  @Delete(':attachmentId')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Delete an attachment (uploader or admin only)' })
  async remove(@Param('attachmentId') attachmentId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.filesService.remove(attachmentId, user);
    return { data: result };
  }
}

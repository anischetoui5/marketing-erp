import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.guard';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucket = config.get<string>('S3_BUCKET', '');
    const region = config.get<string>('S3_REGION', 'us-east-1');
    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY', '');

    this.enabled = !!(this.bucket && accessKeyId && secretAccessKey);

    this.s3 = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: this.enabled ? { accessKeyId, secretAccessKey } : undefined,
    });

    if (!this.enabled) {
      this.logger.warn('S3 credentials not configured — file uploads disabled');
    }
  }

  async upload(
    taskId: string,
    file: Express.Multer.File,
    actor: JwtPayload,
  ) {
    if (!this.enabled) {
      throw new ForbiddenException('File storage is not configured on this server');
    }

    const task = await this.prisma.tasks.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `attachments/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `attachment; filename="${file.originalname}"`,
    }));

    const attachment = await this.prisma.task_attachments.create({
      data: {
        task_id: taskId,
        uploaded_by: actor.sub,
        filename: file.originalname,
        file_key: key,
        file_size: file.size,
        mime_type: file.mimetype,
      },
      include: { uploader: { select: { id: true, full_name: true } } },
    });

    return this.formatAttachment(attachment);
  }

  async listForTask(taskId: string) {
    const attachments = await this.prisma.task_attachments.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'asc' },
      include: { uploader: { select: { id: true, full_name: true } } },
    });
    return attachments.map((a) => this.formatAttachment(a));
  }

  async getDownloadUrl(attachmentId: string, actor: JwtPayload): Promise<{ url: string }> {
    if (!this.enabled) {
      throw new ForbiddenException('File storage is not configured on this server');
    }

    const attachment = await this.prisma.task_attachments.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: attachment.file_key,
        ResponseContentDisposition: `attachment; filename="${attachment.filename}"`,
      }),
      { expiresIn: 3600 },
    );

    return { url };
  }

  async remove(attachmentId: string, actor: JwtPayload) {
    const attachment = await this.prisma.task_attachments.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const isAdmin = actor.role === 'admin';
    const isUploader = attachment.uploaded_by === actor.sub;
    if (!isAdmin && !isUploader) throw new ForbiddenException('Cannot delete another user\'s attachment');

    if (this.enabled) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: attachment.file_key }));
      } catch (err) {
        this.logger.error(`S3 delete failed for key ${attachment.file_key}: ${(err as Error).message}`);
      }
    }

    await this.prisma.task_attachments.delete({ where: { id: attachmentId } });
    return { message: 'Attachment deleted' };
  }

  private formatAttachment(a: {
    id: string; task_id: string; filename: string; file_key: string;
    file_size: number; mime_type: string; created_at: Date;
    uploader?: { id: string; full_name: string } | null;
  }) {
    return {
      id: a.id,
      taskId: a.task_id,
      filename: a.filename,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      createdAt: a.created_at.toISOString(),
      uploadedBy: a.uploader ? { id: a.uploader.id, fullName: a.uploader.full_name } : null,
    };
  }
}

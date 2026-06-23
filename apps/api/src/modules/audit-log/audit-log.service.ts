import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LogParams {
  actorId?: string;
  actorType?: string;
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    try {
      await this.prisma.audit_log.create({
        data: {
          actor_id: params.actorId,
          actor_type: params.actorType ?? 'user',
          actor_email: params.actorEmail,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          previous_state: (params.previousState ?? undefined) as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new_state: (params.newState ?? undefined) as any,
          ip_address: params.ipAddress,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
    }
  }
}
